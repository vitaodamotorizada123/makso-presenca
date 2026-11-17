import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { startBrowser, closeBrowser } from '../helpers/browser.mjs';

after(closeBrowser);

async function fill(page, { presenca = 'sim', nome = 'Mariana Souza', email = 'mariana@gmail.com', whatsapp = '(31) 99876-5432', acompanhante = '' } = {}) {
  if (presenca) await page.check(`input[name=presenca][value=${presenca}]`);
  if (nome) await page.fill('input[name=nome]', nome);
  if (email) await page.fill('input[name=email]', email);
  if (whatsapp) await page.fill('input[name=whatsapp]', whatsapp);
  if (acompanhante) {
    await page.check('input[name=acompanhante]');
    await page.fill('input[name=acompanhanteNome]', acompanhante);
  }
}
const resultTitle = (page) => page.locator('.rsvp__result-title');
const visible = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); return !!el && el.getClientRects().length > 0; }, sel);

test('Vou + acompanhante: confirmado, botões de agenda e foco no título', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1' });
  try {
    await fill(page, { acompanhante: 'Ana' });
    await page.click('.rsvp__submit');
    await resultTitle(page).waitFor({ state: 'visible' });
    assert.equal(await resultTitle(page).textContent(), 'Presença confirmada, Mariana.');
    assert.match(await page.locator('.rsvp__gcal').getAttribute('href'), /^https:\/\/calendar\.google\.com/);
    assert.equal(await page.locator('.rsvp__ics').getAttribute('href'), '/evento.ics');
    assert.ok(await visible(page, '.rsvp__calendar'));
    assert.match(await page.locator('.rsvp__result-text').textContent(), /mariana@gmail\.com/);
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'rsvp__result-title');
    assert.equal(await visible(page, '.rsvp__form'), false);
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('Não vou: esconde acompanhante e restrição, e agradece', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1' });
  try {
    await page.check('input[name=presenca][value=nao]');
    assert.equal(await visible(page, '.companion'), false);
    assert.equal(await visible(page, '.field--restricao'), false);
    await fill(page, { presenca: '' });
    await page.click('.rsvp__submit');
    await resultTitle(page).waitFor({ state: 'visible' });
    assert.equal(await resultTitle(page).textContent(), 'Obrigado por avisar, Mariana. Sentiremos sua falta.');
    assert.equal(await visible(page, '.rsvp__calendar'), false);
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('envio vazio mostra 4 erros e foca o primeiro inválido', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1' });
  try {
    await page.click('.rsvp__submit');
    const errs = await page.$$eval('.field__error', (els) => els.filter((e) => e.textContent).map((e) => e.id));
    assert.deepEqual(errs, ['err-presenca', 'err-nome', 'err-email', 'err-whatsapp']);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'presenca');
    assert.equal(await page.getAttribute('input[name=nome]', 'aria-invalid'), 'true');
    assert.equal(await page.evaluate(() => window.__maksoSubmitCount || 0), 0);
  } finally { await close(); }
});

test('cenário ja_respondeu', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1&cenario=ja_respondeu' });
  try {
    await fill(page);
    await page.click('.rsvp__submit');
    await resultTitle(page).waitFor({ state: 'visible' });
    assert.equal(await resultTitle(page).textContent(), 'Sua resposta já está registrada.');
  } finally { await close(); }
});

test('cenário erro: mensagem, dados mantidos e o mesmo id na nova tentativa', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1&cenario=erro' });
  try {
    await fill(page);
    await page.click('.rsvp__submit');
    await page.locator('.rsvp__status.is-error').waitFor({ state: 'visible' });
    assert.equal(await page.textContent('.rsvp__status'), 'Não conseguimos enviar agora. Verifique sua conexão e tente de novo.');
    assert.equal(await page.inputValue('input[name=nome]'), 'Mariana Souza');
    assert.equal(await page.textContent('.rsvp__submit'), 'Tentar de novo');
    const id1 = await page.evaluate(() => sessionStorage.getItem('makso-rsvp-id'));
    await page.click('.rsvp__submit');
    await page.waitForFunction(() => window.__maksoSubmitCount === 2);
    await page.locator('.rsvp__status.is-error').waitFor({ state: 'visible' });
    const id2 = await page.evaluate(() => sessionStorage.getItem('makso-rsvp-id'));
    assert.ok(id1 && id1 === id2, `${id1} !== ${id2}`);
  } finally { await close(); }
});

test('toque duplo envia uma vez só', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1' });
  try {
    await fill(page);
    await page.evaluate(() => { const b = document.querySelector('.rsvp__submit'); b.click(); b.click(); });
    await resultTitle(page).waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => window.__maksoSubmitCount), 1);
  } finally { await close(); }
});

test('sessionStorage bloqueado não impede confirmar', async () => {
  const initScript = () => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  };
  const { page, close } = await startBrowser({ query: '?demo=1', initScript });
  try {
    await fill(page);
    await page.click('.rsvp__submit');
    await resultTitle(page).waitFor({ state: 'visible' });
    assert.equal(await resultTitle(page).textContent(), 'Presença confirmada, Mariana.');
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('sem endpoint e sem demo: confirmações em breve, formulário desabilitado', async () => {
  const { page, close } = await startBrowser({ config: 'empty' });
  try {
    assert.equal(await page.textContent('.rsvp__status'), 'Confirmações abrem em breve.');
    assert.equal(await page.$eval('.rsvp__fields', (f) => f.disabled), true);
    assert.equal(await visible(page, '.demo-badge'), false);
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('cenário passado: agradece com a data', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1&cenario=passado' });
  try {
    assert.equal(await resultTitle(page).textContent(), 'O lançamento aconteceu em sábado, 12 de dezembro. Obrigado.');
    assert.equal(await visible(page, '.rsvp__form'), false);
    assert.ok(await visible(page, '.demo-badge'));
  } finally { await close(); }
});

test('fonte Inter só é carregada fora de plataformas Apple', async () => {
  const iphone = await startBrowser({ initScript: () => { Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'iPhone' }); } });
  try {
    assert.equal(await iphone.page.locator('link[href*="fonts.googleapis"]').count(), 0);
  } finally { await iphone.close(); }
  const linux = await startBrowser();
  try {
    assert.equal(await linux.page.locator('link[rel=stylesheet][href*="fonts.googleapis"]').count(), 1);
  } finally { await linux.close(); }
});

for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
  test(`${viewport.width}×${viewport.height}: campo focado fica visível`, async () => {
    const { page, close } = await startBrowser({ viewport, query: '?demo=1' });
    try {
      await page.focus('textarea[name=observacao]');
      await page.waitForTimeout(400);
      const box = await page.$eval('textarea[name=observacao]', (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: innerHeight }; });
      assert.ok(box.top >= 0 && box.bottom <= box.h, JSON.stringify(box));
    } finally { await close(); }
  });
}
