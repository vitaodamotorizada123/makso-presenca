// Serve arquivos de um diretório de build com os headers de produção.
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { headersFor } from './headers.mjs';

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ics': 'text/calendar; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

/** @param {string} dir @param {string} pathname */
export function serveFile(dir, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(dir, '.' + rel);
  if (!file.startsWith(path.resolve(dir) + path.sep) || !existsSync(file) || !statSync(file).isFile()) {
    return { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: 'Não encontrado' };
  }
  const headers = { ...headersFor(pathname), 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' };
  return { status: 200, headers, body: readFileSync(file) };
}
