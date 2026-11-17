import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { root } from './helpers/load-shared.mjs';

const qr = path.join(root, 'scripts', 'qr.py');
const URL = 'https://makso.onrender.com/';

test('qr.py gera SVG nítido e PNG grande', () => {
  const out = mkdtempSync(path.join(os.tmpdir(), 'makso-qr-'));
  execFileSync('python3', ['-I', qr, URL, out]);
  const svg = readFileSync(path.join(out, 'qr-makso.svg'), 'utf8');
  assert.match(svg, /viewBox="0 0 \d+ \d+"/);
  assert.ok(svg.includes('crispEdges'));
  assert.ok(existsSync(path.join(out, 'qr-makso.png')));
});

test('qr.py recusa URL sem https', () => {
  const out = mkdtempSync(path.join(os.tmpdir(), 'makso-qr-'));
  const r = spawnSync('python3', ['-I', qr, 'http://x', out]);
  assert.notEqual(r.status, 0);
});

const hasCv2 = spawnSync('python3', ['-c', 'import cv2']).status === 0;
test('o PNG decodifica para a URL', { skip: hasCv2 ? false : 'OpenCV (cv2) indisponível' }, () => {
  const out = mkdtempSync(path.join(os.tmpdir(), 'makso-qr-'));
  execFileSync('python3', ['-I', qr, URL, out]);
  const decoded = execFileSync('python3', ['-I', '-c',
    // O detector do OpenCV falha em imagens enormes; 600 px ≈ o que a câmera do celular vê.
    'import sys, cv2; img = cv2.resize(cv2.imread(sys.argv[1]), (600, 600), interpolation=cv2.INTER_AREA); d, _, _ = cv2.QRCodeDetector().detectAndDecode(img); print(d)',
    path.join(out, 'qr-makso.png')]).toString().trim();
  assert.equal(decoded, URL);
});
