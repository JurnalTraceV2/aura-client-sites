// DEPRECATED: non-canonical compatibility file. Production routing uses canonical API handlers in /api/* paths.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;

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
    const ip = req.connection.remoteAddress || req.socket.remoteAddress;
    
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

// Handle requests
const server = http.createServer((req, res) => {
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
                version: '1.21.4',
                Fabric: '1.21.4-36.2.42',
                minecraft: '1.21.4',
                assets: '1.16',
                downloads: {
                    client: {
                        url: 'http://localhost:3000/downloads/AuraClient.jar',
                        sha256: 'test-hash',
                        size: 100000000
                    },
                    mods: {
                        'aura-guard-fabric-1.21.4.jar': {
                            url: 'http://localhost:3000/downloads/mods/aura-guard-fabric-1.21.4.jar',
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
                        '--version', '1.21.4',
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
                
                const allowedMods = ['aura-guard-fabric-1.21.4.jar', 'Fabric-1.21.4.jar'];
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
                    let html = '<!DOCTYPE html><html><head><title>Aura Downloads</title><style>body{font-family:Arial,sans-serif;margin:40px;background:#1a1a1a;color:#fff}h1{color:#00ff88}ul{list-style:none;padding:0}li{margin:10px 0;padding:15px;background:#2a2a2a;border-radius:8px}a{color:#00ff88;text-decoration:none;font-weight:bold}a:hover{color:#00ffaa}</style></head><body><h1>рџљЂ Aura Downloads</h1><ul>';
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
});

// Create necessary directories
const dirs = ['public', 'public/downloads', 'public/downloads/mods'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Create dummy files
const dummyFiles = [
    'public/index.html',
    'public/downloads/AuraClient.jar',
    'public/downloads/AuraLauncher.exe',
    'public/downloads/mods/aura-guard-fabric-1.21.4.jar'
];

dummyFiles.forEach(file => {
    if (!fs.existsSync(file)) {
        if (file.endsWith('.jar')) {
            fs.writeFileSync(file, 'dummy jar file');
        } else if (file.endsWith('.exe')) {
            fs.writeFileSync(file, 'dummy exe file');
        } else {
            fs.writeFileSync(file, '<html><body><h1>Aura Launcher</h1><p>Download files from /downloads</p></body></html>');
        }
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`рџљЂ Aura API Server running on http://localhost:${PORT}`);
    console.log(`рџ“¦ Downloads: http://localhost:${PORT}/downloads`);
    console.log(`рџ”ђ Test user: test / test123`);
    console.log(`рџЋ® Ready for launcher connections!`);
});


