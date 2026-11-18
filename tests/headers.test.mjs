import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { headersFor } from '../scripts/headers.mjs';
import { renderYaml } from '../scripts/render-yaml.mjs';
import { root } from './helpers/load-shared.mjs';

test('render.yaml versionado é igual ao gerado a partir de headers.mjs', () => {
  assert.equal(readFileSync(path.join(root, 'render.yaml'), 'utf8'), renderYaml());
});

test('assets com hash são imutáveis e a página não é cacheada', () => {
  assert.match(headersFor('/assets/app.ab12cd34.js')['Cache-Control'], /immutable/);
  assert.equal(headersFor('/')['Cache-Control'], 'no-cache');
  assert.equal(headersFor('/index.html')['Cache-Control'], 'no-cache');
  assert.equal(headersFor('/event.json')['Cache-Control'], 'no-cache');
});

test('toda rota tem CSP sem unsafe-inline e noindex', () => {
  const h = headersFor('/');
  assert.ok(h['Content-Security-Policy'].includes("script-src 'self'"));
  assert.ok(!h['Content-Security-Policy'].includes('unsafe-inline'));
  assert.ok(h['Content-Security-Policy'].includes('connect-src https://script.google.com https://script.googleusercontent.com'));
  assert.equal(h['X-Robots-Tag'], 'noindex');
});

test('CSP libera o Umami (script e envio) e mais nada novo', () => {
  const csp = headersFor('/')['Content-Security-Policy'];
  assert.ok(csp.includes("script-src 'self' https://cloud.umami.is"));
  // O script do Umami Cloud envia para https://gateway.umami.is/api/send (lido do script.js em produção).
  const connect = csp.match(/connect-src ([^;]*)/)[1].split(' ');
  assert.deepEqual(connect, ['https://script.google.com', 'https://script.googleusercontent.com', 'https://gateway.umami.is']);
  assert.ok(!csp.includes('unsafe-inline'));
});

test('CSP libera o kit do Adobe Fonts (IvyOra) e o Google Fonts, e mais nada', () => {
  const csp = headersFor('/')['Content-Security-Policy'];
  assert.ok(csp.includes("style-src 'self' https://fonts.googleapis.com https://use.typekit.net https://p.typekit.net"));
  assert.ok(csp.includes('font-src https://fonts.gstatic.com https://use.typekit.net'));
});
