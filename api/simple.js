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
  
  // Simple auth for launcher
  if (url.includes('/api/auth/login') && req.method === 'POST') {
    return res.json({
      success: true,
      token: 'test-token-' + Date.now(),
      user: {
        login: 'test',
        subscription: 'premium',
        expiresAt: Date.now() + 86400000
      }
    });
  }
  
  // Manifest for launcher
  if (url.includes('/api/launcher/manifest') && req.method === 'POST') {
    return res.json({
      version: '1.21.4',
      Fabric: '1.21.4-36.2.42',
      minecraft: '1.21.4',
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
        jvm: ['-Xmx4G', '-Xms1G', '-Daura.client.guard=true'],
        game: ['--username', 'TestUser', '--version', '1.21.4']
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
  
  // 404
  res.status(404).json({ error: 'Not found' });
};


