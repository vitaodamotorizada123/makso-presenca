// Gera favicon.svg, apple-touch-icon.png e og.png a partir da logo.
// Rodar uma vez (precisa de rsvg-convert): node scripts/make-icons.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logo = readFileSync(path.join(root, 'assets/brand/makso-logo.svg'), 'utf8');
const paths = [...logo.matchAll(/<path d="([^"]+)"\/>/g)].map((m) => m[1]);
const viewBox = logo.match(/viewBox="([^"]+)"/)[1];
const BG = '#3B2935'; // Pantone 6077 C (guia maksō)
const FG = '#E5DDD1'; // creme da marca

// Ō = paths 3 (O) e 4 (mácron). Quadrado centrado no glifo.
const omacron = `<path d="${paths[3]}"/><path d="${paths[4]}"/>`;
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="1371 248 528 528"><rect x="1371" y="248" width="528" height="528" rx="118" fill="${BG}"/><g fill="${FG}">${omacron}</g></svg>\n`;
writeFileSync(path.join(root, 'assets/icons/favicon.svg'), favicon);

const tmp = mkdtempSync(path.join(os.tmpdir(), 'makso-icons-'));
const touch = favicon.replace(' rx="118"', '');
writeFileSync(path.join(tmp, 'touch.svg'), touch);
execFileSync('rsvg-convert', ['-w', '180', '-h', '180', path.join(tmp, 'touch.svg'), '-o', path.join(root, 'assets/icons/apple-touch-icon.png')]);

// OG 1200×630: logo creme com 60% da largura, centrada, sobre o fundo da marca.
const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);
const w = 720;
const h = (w * vh) / vw;
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${BG}"/><svg x="${(1200 - w) / 2}" y="${(630 - h) / 2}" width="${w}" height="${h}" viewBox="${viewBox}" fill="${FG}">${paths.map((d) => `<path d="${d}"/>`).join('')}</svg></svg>`;
writeFileSync(path.join(tmp, 'og.svg'), og);
execFileSync('rsvg-convert', ['-w', '1200', '-h', '630', path.join(tmp, 'og.svg'), '-o', path.join(root, 'assets/og.png')]);
console.log('ícones gerados', { vx, vy });
