const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Simple user database (in production, use real DB)
const users = new Map();
const sessions = new Map();

// Add test user
users.set('test', {
    password: 'test123',
    hwid: null,
    subscription: 'premium'
});

// HWID Generation
function generateHWID(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const ip = req.ip || req.connection.remoteAddress;
    
    const combined = `${ip}|${userAgent}|${acceptLanguage}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
}

// API Routes
app.post('/api/auth/login', (req, res) => {
    const { username, password, hwid } = req.body;
    
    if (!username || !password || !hwid) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const user = users.get(username);
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check HWID
    if (user.hwid && user.hwid !== hwid) {
        return res.status(403).json({ error: 'Account already in use on another device' });
    }
    
    user.hwid = hwid;
    
    // Generate simple token
    const token = crypto.createHash('sha256').update(`${username}${hwid}${Date.now()}`).digest('hex');
    
    res.json({
        token,
        user: {
            username,
            subscription: user.subscription,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000
        }
    });
});

app.get('/api/launcher/manifest', (req, res) => {
    // Simple manifest for testing
    const manifest = {
        version: '1.16.5',
        forge: '1.16.5-36.2.42',
        minecraft: '1.16.5',
        assets: '1.16',
        downloads: {
            client: {
                url: 'http://localhost:3000/downloads/AuraClient.jar',
                sha256: 'test-hash',
                size: 100000000
            },
            mods: {
                'clientguard-1.16.5.jar': {
                    url: 'http://localhost:3000/downloads/mods/clientguard-1.16.5.jar',
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
    
    res.json(manifest);
});

app.post('/api/launcher/heartbeat', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/client/mods/verify', (req, res) => {
    const { modsList } = req.body;
    
    const allowedMods = ['clientguard-1.16.5.jar', 'forge-1.16.5.jar'];
    const unauthorizedMods = modsList.filter(mod => !allowedMods.includes(mod.name));
    
    if (unauthorizedMods.length > 0) {
        return res.status(403).json({
            error: 'Unauthorized modifications detected',
            unauthorized: unauthorizedMods
        });
    }
    
    res.json({ status: 'authorized' });
});

// Create mods directory
const modsDir = path.join(__dirname, 'public', 'downloads', 'mods');
if (!fs.existsSync(modsDir)) {
    fs.mkdirSync(modsDir, { recursive: true });
}

// Create dummy mod files
const clientGuardPath = path.join(modsDir, 'clientguard-1.16.5.jar');
if (!fs.existsSync(clientGuardPath)) {
    fs.writeFileSync(clientGuardPath, 'dummy clientguard file');
}

// Start server
app.listen(PORT, () => {
    console.log(`Aura API Server running on http://localhost:${PORT}`);
    console.log(`Test user: test / test123`);
    console.log(`Downloads available at: http://localhost:${PORT}/downloads`);
});
