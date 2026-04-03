// DEPRECATED: non-canonical compatibility file. Production routing uses canonical API handlers in /api/* paths.
module.exports = function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url;
  
  // Simple auth for launcher (compatibility with existing launcher)
  if (url.includes('/api/auth/login') && req.method === 'POST') {
    const { email, password, hwid } = req.body;
    
    // For demo: accept any credentials with "test" or check Firebase in production
    if (email === 'test' && password === 'test123') {
      return res.json({
        success: true,
        token: 'demo-token-' + Date.now(),
        sessionToken: 'demo-session-' + Date.now(),
        uidShort: 'TEST001',
        subscription: 'premium',
        sessionExpiresAt: Date.now() + 86400000,
        user: {
          login: email,
          id: 'test-user-id',
          role: 'user',
          subscription: 'premium'
        }
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
  
  // Manifest for launcher
  if (url.includes('/api/launcher/manifest') && req.method === 'POST') {
    return res.json({
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
    });
  }
  
  // Heartbeat
  if (url.includes('/api/launcher/heartbeat') && req.method === 'POST') {
    return res.json({ status: 'ok', timestamp: Date.now() });
  }
  
  // Mod verification
  if (url.includes('/api/client/mods/verify') && req.method === 'POST') {
    return res.json({ status: 'authorized' });
  }
  
  // Launcher download URL generation
  if (url.includes('/api/account/download/launcher-url') && req.method === 'GET') {
    return res.json({
      ok: true,
      url: 'https://aura-client-sites.vercel.app/downloads/AuraLauncher.exe',
      expiresAt: Date.now() + 3600000,
      sha256: 'test-launcher-hash',
      version: '2.0.0'
    });
  }
  
  // 404
  res.status(404).json({ error: 'Not found' });
};


