// DEPRECATED: non-canonical compatibility file. Production routing uses canonical API handlers in /api/* paths.
const express = require('express');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-2026';

// User database (in production, use real DB)
const users = new Map();
const sessions = new Map();

// HWID Generation
function generateHWID(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const ip = req.ip || req.connection.remoteAddress;
    
    const combined = `${ip}|${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

// API Routes

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    const { username, password, hwid } = req.body;
    
    // Validate input
    if (!username || !password || !hwid) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check user credentials (in production, use database)
    const user = users.get(username);
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is already logged in on another PC
    if (user.hwid && user.hwid !== hwid) {
        return res.status(403).json({ error: 'Account already in use on another device' });
    }

    // Update HWID
    user.hwid = hwid;
    users.set(username, user);

    // Generate JWT token
    const token = jwt.sign(
        { 
            username, 
            hwid, 
            subscription: user.subscription,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({
        token,
        user: {
            username: user.username,
            subscription: user.subscription,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000
        }
    });
});

// GET /api/launcher/manifest
app.get('/api/launcher/manifest', authenticateToken, async (req, res) => {
    const { username, subscription } = req.user;
    
    try {
        // Generate manifest based on user subscription
        const manifest = await generateManifest(subscription);
        res.json(manifest);
    } catch (error) {
        console.error('Manifest generation error:', error);
        res.status(500).json({ error: 'Failed to generate manifest' });
    }
});

// POST /api/launcher/heartbeat
app.post('/api/launcher/heartbeat', authenticateToken, (req, res) => {
    const { username } = req.user;
    
    // Update last seen
    const user = users.get(username);
    if (user) {
        user.lastSeen = Date.now();
        users.set(username, user);
    }
    
    res.json({ status: 'ok', timestamp: Date.now() });
});

// POST /api/client/mods/verify
app.post('/api/client/mods/verify', authenticateToken, (req, res) => {
    const { modsList, hwid } = req.body;
    
    // Verify mods against whitelist
    const allowedMods = [
        'aura-guard-fabric-1.21.4.jar',
        'aura-guard-fabric-1.21.4.jar',
        'aura-client-core.jar'
    ];
    
    const unauthorizedMods = modsList.filter(mod => !allowedMods.includes(mod.name));
    
    if (unauthorizedMods.length > 0) {
        return res.status(403).json({
            error: 'Unauthorized modifications detected',
            unauthorized: unauthorizedMods
        });
    }
    
    res.json({ status: 'authorized' });
});

// Generate manifest function
async function generateManifest(subscription) {
    const baseManifest = {
        version: '1.21.4',
        Fabric: '1.21.4-36.2.42',
        minecraft: '1.21.4',
        assets: '1.16',
        downloads: {
            Fabric: {
                url: 'https://maven.minecraftFabric.net/net/minecraftFabric/Fabric/1.21.4-36.2.42/Fabric-1.21.4-36.2.42-installer.jar',
                sha256: '...', // Actual SHA256
                size: 8234567
            },
            minecraft: {
                url: 'https://launcher.mojang.com/v1/objects/3732a9b540332c4c3c7c0e9b9434b0c8b5a2e3e4/client.jar',
                sha256: '...', // Actual SHA256
                size: 18745632
            },
            libraries: await getLibrariesManifest(),
            mods: await getModsManifest(subscription)
        },
        arguments: {
            jvm: [
                '-Xmx4G',
                '-Xms1G',
                '-XX:+UseG1GC',
                '-XX:+UnlockExperimentalVMOptions',
                '-XX:G1NewSizePercent=20',
                '-XX:G1ReservePercent=20',
                '-Djava.security.policy=file:java.policy',
                '-Dfml.ignoreInvalidMinecraftCertificates=true',
                '-Dfml.ignorePatchDiscrepancies=true',
                '-Daura.client.guard=true', // Custom guard flag
                '-Daura.launcher.version=2.0.0'
            ],
            game: [
                '--username', '${auth_player_name}',
                '--uuid', '${auth_uuid}',
                '--accessToken', '${auth_access_token}',
                '--userType', '${user_type}',
                '--version', '${version_name}',
                '--gameDir', '${game_directory}',
                '--assetsDir', '${assets_root}',
                '--assetIndex', '${assets_index_name}',
                '--width', '854',
                '--height', '480'
            ]
        },
        rules: {
            allowJavaAgents: false,
            allowDLLInjection: false,
            enforceModsWhitelist: true,
            requireClientGuard: true
        },
        security: {
            manifestSignature: crypto.createHash('sha256')
                .update(JSON.stringify({
                    timestamp: Date.now(),
                    subscription
                }))
                .digest('hex'),
            checksumInterval: 300000, // 5 minutes
            heartbeatInterval: 60000 // 1 minute
        }
    };
    
    return baseManifest;
}

// Get libraries manifest
async function getLibrariesManifest() {
    return {
        'net.minecraftFabric:Fabric:1.21.4-36.2.42': {
            url: 'https://libraries.minecraft.net/net/minecraftFabric/Fabric/1.21.4-36.2.42/Fabric-1.21.4-36.2.42-universal.jar',
            sha256: '...',
            size: 4567890
        },
        'org.ow2.asm:asm:9.1': {
            url: 'https://libraries.minecraft.net/org/ow2/asm/asm/9.1/asm-9.1.jar',
            sha256: '...',
            size: 123456
        }
        // Add more libraries as needed
    };
}

// Get mods manifest based on subscription
async function getModsManifest(subscription) {
    const baseMods = {
        'aura-guard-fabric-1.21.4.jar': {
            url: 'https://aura-client-sites.vercel.app/downloads/mods/aura-guard-fabric-1.21.4.jar',
            sha256: '...', // Actual SHA256
            size: 234567,
            required: true,
            priority: 1000
        }
    };
    
    if (subscription === 'premium') {
        return {
            ...baseMods,
            'aura-client-core.jar': {
                url: 'https://aura-client-sites.vercel.app/downloads/mods/aura-client-core.jar',
                sha256: '...', // Actual SHA256
                size: 567890,
                required: true,
                priority: 999
            },
            'aura-guard-fabric-1.21.4.jar': {
                url: 'https://aura-client-sites.vercel.app/downloads/mods/aura-guard-fabric-1.21.4.jar',
                sha256: '...', // Actual SHA256
                size: 2345678,
                required: false,
                priority: 500
            }
        };
    }
    
    return baseMods;
}

// Start server
app.listen(PORT, () => {
    console.log(`Aura API Server running on port ${PORT}`);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


