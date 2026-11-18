import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { startBrowser, closeBrowser } from '../helpers/browser.mjs';

after(closeBrowser);

const WEBSITE_ID = '0d6f3a5e-2b7c-4e1a-9f8d-1c2b3a4d5e6f';
// Umami falso: registra os eventos em window.__events.
const UMAMI_STUB = 'window.__events = window.__events || []; window.umami = { track: function (n, d) { window.__events.push([n, d === undefined ? null : d]); } };';

async function routes(context) {
  await context.route('https://cloud.umami.is/**', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: UMAMI_STUB }));
  // Apps Script de verdade responde com redirect para googleusercontent; aqui, JSON direto com CORS.
  await context.route('https://script.google.com/**', (r) => r.fulfill({
    status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ok: true, status: 'confirmado' }),
  }));
}

const umamiTag = (page) => page.evaluate(() => {
  const s = document.querySelector('script[src="https://cloud.umami.is/script.js"]');
  return s && { id: s.dataset.websiteId, domains: s.dataset.domains, defer: s.defer };
});

test('com o ID configurado, carrega o Umami só no domínio do site', async () => {
  const { page, close } = await startBrowser({ config: 'analytics', routes });
  try {
    assert.deepEqual(await umamiTag(page), { id: WEBSITE_ID, domains: 'makso.onrender.com', defer: true });
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('modo demonstração nunca carrega o Umami', async () => {
  const { page, close } = await startBrowser({ config: 'analytics', query: '?demo=1', routes });
  try {
    assert.equal(await umamiTag(page), null);
  } finally { await close(); }
});

test('sem ID, nada de Umami', async () => {
  const { page, close } = await startBrowser({ config: 'full', routes });
  try {
    assert.equal(await umamiTag(page), null);
  } finally { await close(); }
});

test('funil: botão do topo, início do formulário e confirmação — sem dado pessoal nos eventos', async () => {
  const { page, close } = await startBrowser({ config: 'analytics', routes });
  try {
    await page.waitForFunction(() => window.umami);
    await page.click('.hero__cta');
    await page.check('input[name=presenca][value=sim]');
    await page.fill('input[name=nome]', 'Mariana Souza');
    await page.fill('input[name=email]', 'mariana@gmail.com');
    await page.fill('input[name=whatsapp]', '(31) 99876-5432');
    await page.waitForTimeout(900); // antispam do servidor: t ≥ 800 ms
    await page.click('.rsvp__submit');
    await page.locator('.rsvp__result-title').waitFor({ state: 'visible' });
    assert.equal(await page.textContent('.rsvp__result-title'), 'Presença confirmada, Mariana.');
    const events = await page.evaluate(() => window.__events);
    const names = events.map((e) => e[0]);
    assert.deepEqual(names, ['clicou-confirmar-topo', 'iniciou-formulario', 'confirmou']);
    assert.deepEqual(events[2][1], { acompanhante: false });
    const blob = JSON.stringify(events);
    assert.ok(!/Mariana|mariana|@|9876/.test(blob), `dado pessoal em evento: ${blob}`);
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('erro de validação e "não vou" viram eventos (sem dados)', async () => {
  const { page, close } = await startBrowser({ config: 'analytics', routes });
  try {
    await page.waitForFunction(() => window.umami);
    await page.click('.rsvp__submit');
    await page.check('input[name=presenca][value=nao]');
    const names = await page.evaluate(() => window.__events.map((e) => e[0]));
    assert.deepEqual(names, ['erro-validacao', 'iniciou-formulario']);
  } finally { await close(); }
});
