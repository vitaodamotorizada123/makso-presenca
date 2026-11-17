// Servidor local: faz o build em .dev/ e serve com os headers de produção.
// Uso: npm run dev  →  http://localhost:4173/?demo=1
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';
import { serveFile } from './static-files.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.dev');
const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const configPath = arg('--config') ? path.resolve(arg('--config')) : path.join(root, 'config.json');
const port = Number(process.env.PORT || 4173);

await build({ root, configPath, outDir });
http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname === '/') await build({ root, configPath, outDir }); // recarregar = rebuild
  const r = serveFile(outDir, pathname);
  res.writeHead(r.status, r.headers);
  res.end(r.body);
}).listen(port, () => console.log(`maksō em http://localhost:${port}/?demo=1  (config: ${path.relative(root, configPath)})`));
