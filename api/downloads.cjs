const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
    const pathname = req.url.split('?')[0];
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Handle downloads
    if (pathname.startsWith('/downloads/')) {
        const filePath = pathname.substring(1); // Remove leading /
        const fullPath = path.join(__dirname, '..', 'public', filePath);
        
        console.log(`Download request: ${filePath}`);
        console.log(`Full path: ${fullPath}`);
        
        try {
            if (fs.existsSync(fullPath)) {
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    // List directory contents
                    const files = fs.readdirSync(fullPath);
                    let html = '<!DOCTYPE html><html><head><title>Aura Downloads</title><style>body{font-family:Arial,sans-serif;margin:40px;background:#1a1a1a;color:#fff}h1{color:#00ff88}ul{list-style:none;padding:0}li{margin:10px 0;padding:15px;background:#2a2a2a;border-radius:8px}a{color:#00ff88;text-decoration:none;font-weight:bold}a:hover{color:#00ffaa}</style></head><body><h1>🚀 Aura Downloads</h1><ul>';
                    files.forEach(file => {
                        const fileSize = fs.statSync(path.join(fullPath, file)).size;
                        const sizeMB = (fileSize / 1024 / 1024).toFixed(2);
                        html += `<li><a href="/downloads/${file}">${file}</a> (${sizeMB} MB)</li>`;
                    });
                    html += '</ul></body></html>';
                    
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(html);
                    return;
                }
                
                if (stat.isFile()) {
                    const ext = path.extname(fullPath);
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
                    
                    res.writeHead(200, { 
                        'Content-Type': contentType,
                        'Content-Length': stat.size
                    });
                    
                    const fileStream = fs.createReadStream(fullPath);
                    fileStream.pipe(res);
                    return;
                }
            }
        } catch (err) {
            console.error('File error:', err);
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<html><body><h1>500 Server Error</h1></body></html>');
            return;
        }
    }
    
    // Handle root
    if (pathname === '/' || pathname === '') {
        const html = '<!DOCTYPE html><html><head><title>Aura Client</title><style>body{font-family:Arial,sans-serif;margin:40px;background:#1a1a1a;color:#fff;text-align:center}h1{color:#00ff88}.download-btn{display:inline-block;padding:15px30px;background:#00ff88;color:#1a1a1a;text-decoration:none;font-weight:bold;border-radius:8px;margin:20px}a:hover{background:#00ffaa}</style></head><body><h1>🚀 Aura Client</h1><p>Защищенный Minecraft клиент с анти-чит системой</p><a href="/downloads" class="download-btn">Скачать лаунчер</a></body></html>';
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>404 Not Found</h1></body></html>');
};
