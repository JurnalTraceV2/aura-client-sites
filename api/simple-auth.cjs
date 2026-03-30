module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = (req.url || '').split('?')[0];
    
    // Simple auth for launcher
    if (url.includes('/api/auth/login') && req.method === 'POST') {
      let body = {};
      try {
        body = await new Promise((resolve, reject) => {
          let data = '';
          req.on('data', chunk => {
            data += chunk;
          });
          req.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve({});
            }
          });
        });
      } catch (e) {
        body = {};
      }
      
      const { email, password, hwid } = body;
      
      // Demo credentials
      if (email === 'test' && password === 'test123') {
        return res.json({
          ok: true,
          user: {
            uid: 'demo-user-id',
            email: 'asdasdasdzxc11@gmail.com',
            subscription: 'premium',
            role: 'user',
            hwidHash: null,
            createdAt: Date.now() - 86400000
          }
        });
      } else {
        return res.status(401).json({
          ok: false,
          error: 'Invalid credentials'
        });
      }
    }
    
    // Account profile (for React app)
    if (url.includes('/api/account/me') && req.method === 'GET') {
      // Always return success for demo
      const responseData = {
        ok: true,
        user: {
          uid: 'demo-user-id',
          email: 'asdasdasdzxc11@gmail.com',
          subscription: 'premium',
          role: 'user',
          hwidHash: null,
          createdAt: Date.now() - 86400000
        }
      };
      
      // Set headers first
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      // Return response
      return res.status(200).json(responseData);
    }
    
    // Launcher download URL
    if (url.includes('/api/account/download/launcher-url') && req.method === 'GET') {
      return res.json({
        ok: true,
        url: 'https://aura-client-sites.vercel.app/downloads/AuraLauncher.exe',
        expiresAt: Date.now() + 3600000,
        sha256: 'test-launcher-hash',
        version: '2.0.0'
      });
    }
    
    // Default response
    return res.status(404).json({
      error: 'Endpoint not found'
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Server error occurred'
    });
  }
};
