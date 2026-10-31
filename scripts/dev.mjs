import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const args = process.argv.slice(2);
const arg = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const root = resolve(args.includes('--dist') ? 'dist' : '.');
const port = Number(arg('--port') || process.env.PORT || 3000);
const host = arg('--host') || process.env.HOST || '0.0.0.0';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/plain; charset=utf-8' };

http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const relative = path.slice(root.length + 1);
    if ((path !== root && !path.startsWith(root + sep)) || relative.split(sep).some(p => p.startsWith('.')) || relative.startsWith('node_modules')) { res.writeHead(403); return res.end('Forbidden'); }
    if (!(await stat(path)).isFile()) { res.writeHead(404); return res.end('Not found'); }
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, host, () => console.log(`Project Workspace serving on ${host}:${port}`));
