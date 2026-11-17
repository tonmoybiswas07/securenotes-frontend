import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
process.loadEnvFile && (() => { try { process.loadEnvFile(); } catch (error) { if (error.code !== 'ENOENT') throw error; } })();
await import('./build.mjs');
const allowed = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'],
  '/app.js': ['app.js', 'text/javascript'], '/config.js': ['config.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
createServer(async (req, res) => {
  const file = allowed[new URL(req.url, 'http://localhost').pathname];
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  try { const body = await readFile(`dist/${file[0]}`); res.writeHead(200, { 'Content-Type': file[1], 'Cache-Control': 'no-store' }); res.end(body); }
  catch { res.writeHead(500); res.end('Unable to serve frontend'); }
}).listen(5173, '127.0.0.1', () => console.log('Frontend: http://localhost:5173'));
