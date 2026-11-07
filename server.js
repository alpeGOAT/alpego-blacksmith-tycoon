const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = { '/': 'index.html', '/index.html': 'index.html', '/style.css': 'style.css', '/upgrades.css': 'upgrades.css', '/polish.css': 'polish.css', '/game.js': 'game.js', '/customers.js': 'customers.js', '/app.js': 'app.js', '/music.js': 'music.js', '/assets/audio/the-old-tower-inn.mp3': 'assets/audio/the-old-tower-inn.mp3', '/assets/audio/the-old-tower-inn.wav': 'assets/audio/the-old-tower-inn.wav' };
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
http.createServer((req, res) => {
  const name = files[req.url.split('?')[0]];
  if (!name) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(__dirname, name), (error, data) => {
    if (error) { res.writeHead(500); res.end('Unable to read file'); return; }
    const headers = { 'Content-Type': types[path.extname(name)], 'Content-Length': data.length, 'Cache-Control': 'no-cache' };
    if (['.mp3', '.wav'].includes(path.extname(name))) {
      headers['Accept-Ranges'] = 'bytes';
      if (req.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        let start = range?.[1] ? Number(range[1]) : 0;
        let end = range?.[2] ? Number(range[2]) : data.length - 1;
        if (range && !range[1] && range[2]) { start = Math.max(0, data.length - end); end = data.length - 1; }
        end = Math.min(end, data.length - 1);
        if (!range || (!range[1] && !range[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= data.length) {
          res.writeHead(416, { 'Content-Range': `bytes */${data.length}` }); res.end(); return;
        }
        res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 });
        res.end(data.subarray(start, end + 1)); return;
      }
    }
    res.writeHead(200, headers); res.end(data);
  });
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('Alpego’s Blacksmith Tycoon: http://localhost:' + (process.env.PORT || 4173)));
