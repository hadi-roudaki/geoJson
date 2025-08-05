const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5173;

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.geojson': 'application/json'
};

function serveFile(filePath, res) {
  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // File not found
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      // Success
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end(content, 'utf-8');
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Log requests for debugging
  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);

  // Handle root path
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Try to serve from public directory first for static assets
  let filePath;
  if (pathname.endsWith('.geojson') || pathname.endsWith('.json') || pathname.endsWith('.svg')) {
    // Check public directory first
    filePath = path.join(__dirname, 'public', pathname.substring(1));
  } else {
    // For other files, check root directory
    filePath = path.join(__dirname, pathname.substring(1));
  }

  // Security check - prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If it was a public file request, try root directory
      if (pathname.endsWith('.geojson') || pathname.endsWith('.json') || pathname.endsWith('.svg')) {
        const rootFilePath = path.join(__dirname, pathname.substring(1));
        fs.stat(rootFilePath, (rootErr, rootStats) => {
          if (rootErr || !rootStats.isFile()) {
            // If file doesn't exist and it's not an API route, serve index.html for SPA routing
            if (!pathname.startsWith('/api/')) {
              serveFile(path.join(__dirname, 'index.html'), res);
            } else {
              res.writeHead(404);
              res.end('Not Found');
            }
          } else {
            serveFile(rootFilePath, res);
          }
        });
      } else {
        // If file doesn't exist and it's not an API route, serve index.html for SPA routing
        if (!pathname.startsWith('/api/')) {
          serveFile(path.join(__dirname, 'index.html'), res);
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      }
    } else {
      serveFile(filePath, res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Development server running at:`);
  console.log(`   Local:   http://localhost:${PORT}/`);
  console.log(`   Network: http://0.0.0.0:${PORT}/`);
  console.log('');
  console.log('📁 Serving files from current directory');
  console.log('🔄 Ready for development!');
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down development server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down development server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
