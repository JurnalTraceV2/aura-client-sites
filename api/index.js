// DEPRECATED: non-canonical compatibility file. Production routing uses canonical API handlers in /api/* paths.
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

module.exports = function handler(req, res) {
    const pathname = req.url.split('?')[0];

    // CORS preflight
    if (req.method === 'OPTIONS') {
        sendJson(res, {}, 200);
        return;
    }

    // API routes
    if (pathname.startsWith('/api/')) {
        if (req.method === 'POST' && pathname === '/api/auth/login') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
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
                } catch (e) {
                    sendJson(res, { error: 'Invalid JSON' }, 400);
                }
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
                        url: 'https://aura-client-sites.vercel.app/downloads/AuraClient.jar',
                        sha256: 'test-hash',
                        size: 100000000
                    },
                    mods: {
                        'aura-guard-fabric-1.21.4.jar': {
                            url: 'https://aura-client-sites.vercel.app/downloads/mods/aura-guard-fabric-1.21.4.jar',
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
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
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
                } catch (e) {
                    sendJson(res, { error: 'Invalid JSON' }, 400);
                }
            });
            return;
        }
        
        // 404 for unknown API routes
        sendJson(res, { error: 'API endpoint not found' }, 404);
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>404 Not Found</h1></body></html>');
};


