const fs = require('fs');
const path = require('path');

// Vercel serverless function
module.exports = (req, res) => {
    const http = require('http');
    const crypto = require('crypto');

    // Simple user database
    const users = new Map();
    users.set('test', {
        password: 'test123',
        hwid: null,
        subscription: 'premium'
    });

    // HWID Generation
    function generateHWID(req) {
        const userAgent = req.headers['user-agent'] || '';
        const acceptLanguage = req.headers['accept-language'] || '';
        const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress;
        
        const combined = `${ip}|${userAgent}|${acceptLanguage}`;
        return crypto.createHash('sha256').update(combined).digest('hex');
    }

    // Parse POST body
    function parseBody(req, callback) {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                callback(JSON.parse(body));
            } catch (e) {
                callback({});
            }
        });
    }

    // Send JSON response
    function sendJson(res, data, statusCode = 200) {
        res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end(JSON.stringify(data));
    }

    const pathname = req.url.split('?')[0];

    // CORS preflight
    if (req.method === 'OPTIONS') {
        sendJson(res, {}, 200);
        return;
    }

    // API routes
    if (pathname.startsWith('/api/')) {
        if (req.method === 'POST' && pathname === '/api/auth/login') {
            parseBody(req, (data) => {
                const { username, password, hwid } = data;
                
                if (!username || !password || !hwid) {
                    return sendJson(res, { error: 'Missing required fields' }, 400);
                }
                
                const user = users.get(username);
                if (!user || user.password !== password) {
                    return sendJson(res, { error: 'Invalid credentials' }, 401);
                }
                
                if (user.hwid && user.hwid !== hwid) {
                    return sendJson(res, { error: 'Account already in use on another device' }, 403);
                }
                
                user.hwid = hwid;
                const token = crypto.createHash('sha256').update(`${username}${hwid}${Date.now()}`).digest('hex');
                
                sendJson(res, {
                    token,
                    user: {
                        username,
                        subscription: user.subscription,
                        expiresAt: Date.now() + 24 * 60 * 60 * 1000
                    }
                });
            });
            return;
        }
        
        if (req.method === 'GET' && pathname === '/api/launcher/manifest') {
            const manifest = {
                version: '1.16.5',
                forge: '1.16.5-36.2.42',
                minecraft: '1.16.5',
                assets: '1.16',
                downloads: {
                    client: {
                        url: 'https://aura-client-sites.vercel.app/downloads/AuraClient.jar',
                        sha256: 'test-hash',
                        size: 100000000
                    },
                    mods: {
                        'clientguard-1.16.5.jar': {
                            url: 'https://aura-client-sites.vercel.app/downloads/mods/clientguard-1.16.5.jar',
                            sha256: 'test-hash',
                            size: 1000000,
                            required: true
                        }
                    }
                },
                arguments: {
                    jvm: [
                        '-Xmx4G',
                        '-Xms1G',
                        '-Daura.client.guard=true',
                        '-Daura.launcher.version=2.0.0'
                    ],
                    game: [
                        '--username', 'TestUser',
                        '--uuid', 'test-uuid',
                        '--accessToken', 'test-token',
                        '--version', '1.16.5',
                        '--gameDir', 'game',
                        '--assetsDir', 'assets',
                        '--assetIndex', '1.16',
                        '--width', '854',
                        '--height', '480'
                    ]
                }
            };
            
            sendJson(res, manifest);
            return;
        }
        
        if (req.method === 'POST' && pathname === '/api/launcher/heartbeat') {
            sendJson(res, { status: 'ok', timestamp: Date.now() });
            return;
        }
        
        if (req.method === 'POST' && pathname === '/api/client/mods/verify') {
            parseBody(req, (data) => {
                const { modsList } = data;
                
                const allowedMods = ['clientguard-1.16.5.jar', 'forge-1.16.5.jar'];
                const unauthorizedMods = modsList ? modsList.filter(mod => !allowedMods.includes(mod.name)) : [];
                
                if (unauthorizedMods.length > 0) {
                    return sendJson(res, {
                        error: 'Unauthorized modifications detected',
                        unauthorized: unauthorizedMods
                    }, 403);
                }
                
                sendJson(res, { status: 'authorized' });
            });
            return;
        }
        
        // 404 for unknown API routes
        sendJson(res, { error: 'API endpoint not found' }, 404);
        return;
    }

    // Static files
    if (req.method === 'GET') {
        let filePath = pathname === '/' ? 'public/index.html' : pathname.substring(1);
        
        if (filePath.startsWith('downloads/')) {
            filePath = path.join('public', filePath);
        }
        
        try {
            if (fs.existsSync(filePath)) {
                const stat = fs.statSync(filePath);
                
                if (stat.isDirectory() && filePath.endsWith('downloads')) {
                    // List downloads
                    const files = fs.readdirSync(filePath);
                    let html = '<!DOCTYPE html><html><head><title>Aura Downloads</title><style>body{font-family:Arial,sans-serif;margin:40px;background:#1a1a1a;color:#fff}h1{color:#00ff88}ul{list-style:none;padding:0}li{margin:10px 0;padding:15px;background:#2a2a2a;border-radius:8px}a{color:#00ff88;text-decoration:none;font-weight:bold}a:hover{color:#00ffaa}</style></head><body><h1>🚀 Aura Downloads</h1><ul>';
                    files.forEach(file => {
                        const size = fs.statSync(path.join(filePath, file)).size;
                        const sizeMB = (size / 1024 / 1024).toFixed(2);
                        html += `<li><a href="/downloads/${file}">${file}</a> (${sizeMB} MB)</li>`;
                    });
                    html += '</ul></body></html>';
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(html);
                    return;
                }
                
                if (stat.isFile()) {
                    const ext = path.extname(filePath);
                    const contentType = {
                        '.html': 'text/html',
                        '.css': 'text/css',
                        '.js': 'application/javascript',
                        '.json': 'application/json',
                        '.png': 'image/png',
                        '.jpg': 'image/jpeg',
                        '.gif': 'image/gif',
                        '.svg': 'image/svg+xml',
                        '.jar': 'application/java-archive',
                        '.exe': 'application/octet-stream'
                    }[ext] || 'application/octet-stream';
                    
                    res.writeHead(200, { 'Content-Type': contentType });
                    fs.createReadStream(filePath).pipe(res);
                    return;
                }
            }
        } catch (err) {
            console.error('File error:', err);
        }
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>404 Not Found</h1></body></html>');
};
