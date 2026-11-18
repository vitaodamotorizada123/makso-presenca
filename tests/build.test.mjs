import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build, validateConfig } from '../scripts/build.mjs';
import { root } from './helpers/load-shared.mjs';

const fixture = (n) => path.join(root, 'tests', 'fixtures', `config.${n}.json`);
async function buildWith(name) {
  const outDir = mkdtempSync(path.join(os.tmpdir(), 'makso-build-'));
  const res = await build({ root, configPath: fixture(name), outDir });
  const html = readFileSync(path.join(outDir, 'index.html'), 'utf8');
  return { outDir, res, html };
}

test('index.html tem logo, noindex, theme-color, viewport-fit e lang', async () => {
  const { html } = await buildWith('full');
  assert.ok(html.includes('<title id="makso-title">maksō</title>'));
  assert.ok(html.includes('name="robots" content="noindex"'));
  assert.ok(html.includes('name="theme-color" content="#24151F"'));
  assert.ok(html.includes('viewport-fit=cover'));
  assert.ok(html.includes('lang="pt-BR"'));
});

test('index.html sem placeholders, sem style=, sem on*= e sem script inline', async () => {
  const { html } = await buildWith('full');
  assert.ok(!html.includes('%%'));
  assert.ok(!/\sstyle=/i.test(html), 'atributo style= encontrado');
  assert.ok(!/\son[a-z]+=/i.test(html), 'atributo on*= encontrado');
  assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>/i.test(html), 'script inline encontrado');
});

test('assets com hash existem e o bundle começa com a config', async () => {
  const { html, outDir } = await buildWith('full');
  const js = html.match(/src="\/(assets\/app\.[0-9a-f]{8}\.js)"/);
  const css = html.match(/href="\/(assets\/styles\.[0-9a-f]{8}\.css)"/);
  assert.ok(js && css, 'referências de assets não encontradas');
  assert.ok(existsSync(path.join(outDir, js[1])));
  assert.ok(existsSync(path.join(outDir, css[1])));
  const bundle = readFileSync(path.join(outDir, js[1]), 'utf8');
  assert.ok(bundle.startsWith('window.MAKSO_CONFIG = '));
  assert.ok(bundle.includes('"appsScriptUrl":""'));
});

test('evento completo: data no HTML, evento.ics e event.json', async () => {
  const { html, outDir, res } = await buildWith('full');
  assert.ok(html.includes('sábado, 12 de dezembro · 20h'));
  assert.ok(existsSync(path.join(outDir, 'evento.ics')));
  const ej = JSON.parse(readFileSync(path.join(outDir, 'event.json'), 'utf8'));
  assert.equal(ej.event.start, '2037-12-12T20:00:00-03:00');
  assert.equal(ej.version, res.hash);
  for (const f of ['robots.txt', 'favicon.svg', 'apple-touch-icon.png', 'og.png']) assert.ok(existsSync(path.join(outDir, f)), f);
});

test('evento sem data: "Data em breve" e sem evento.ics', async () => {
  const { html, outDir } = await buildWith('empty');
  assert.ok(html.includes('Data em breve'));
  assert.ok(!existsSync(path.join(outDir, 'evento.ics')));
  assert.ok(existsSync(path.join(outDir, 'event.json')));
});

test('validateConfig acusa siteUrl sem https e appsScriptUrl estranho', () => {
  const ok = JSON.parse(readFileSync(fixture('full'), 'utf8'));
  assert.deepEqual(validateConfig(ok), []);
  assert.ok(validateConfig({ ...ok, siteUrl: 'http://x' }).some((p) => p.includes('siteUrl')));
  assert.ok(validateConfig({ ...ok, appsScriptUrl: 'https://evil.com/exec' }).some((p) => p.includes('appsScriptUrl')));
  assert.ok(validateConfig({ ...ok, event: { ...ok.event, end: '2026-12-12T19:00:00-03:00' } }).some((p) => p.includes('end')));
});

test('build recusa outDir fora do projeto e do tmp', async () => {
  await assert.rejects(build({ root, configPath: fixture('full'), outDir: '/etc/makso-x' }), /outDir/);
});
