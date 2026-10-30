const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = { '/': 'index.html', '/index.html': 'index.html', '/style.css': 'style.css', '/upgrades.css': 'upgrades.css', '/game.js': 'game.js', '/customers.js': 'customers.js', '/app.js': 'app.js' };
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
http.createServer((req, res) => {
  const name = files[req.url.split('?')[0]];
  if (!name) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(__dirname, name), (error, data) => {
    if (error) { res.writeHead(500); res.end('Unable to read file'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(name)], 'Cache-Control': 'no-cache' }); res.end(data);
  });
}).listen(Number(process.env.PORT) || 4173, '127.0.0.1', () => console.log('Alpego’s Blacksmith Tycoon: http://localhost:' + (Number(process.env.PORT) || 4173)));
