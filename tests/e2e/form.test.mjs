import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { startBrowser as openPage, closeBrowser } from '../helpers/browser.mjs';

// O formulário vive na tela 2: todos os testes daqui abrem direto em #confirmar.
const startBrowser = (o = {}) => openPage({ ...o, query: (o.query || '') + '#confirmar' });

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

test('tela 2: Dados para contato (Nome, E-mail, Telefone) antes de Sobre a noite', async () => {
  const { page, close } = await startBrowser();
  try {
    const r = await page.evaluate(() => ({
      names: [...document.querySelectorAll('#confirmar form [name]')].map((el) => el.getAttribute('name')).filter((n) => n !== 'hp'),
      phoneLabel: document.querySelector('label[for=f-whatsapp]').textContent.trim(),
      groups: [...document.querySelectorAll('#confirmar fieldset.group > legend')].map((l) => l.textContent.trim()),
    }));
    assert.deepEqual(r.names, ['nome', 'email', 'whatsapp', 'presenca', 'presenca', 'acompanhante', 'acompanhanteNome', 'restricao', 'observacao']);
    assert.equal(r.phoneLabel, 'Telefone');
    assert.deepEqual(r.groups, ['Dados para contato', 'Sobre a noite']);
  } finally { await close(); }
});

test('obrigado mostra quando, onde e traje', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1' });
  try {
    assert.equal(await visible(page, '.rsvp__details'), false);
    await fill(page);
    await page.click('.rsvp__submit');
    await resultTitle(page).waitFor({ state: 'visible' });
    assert.equal(await visible(page, '.rsvp__details'), true);
    const text = await page.textContent('.rsvp__details');
    assert.match(text, /Casa Fiat de Cultura/);
    assert.match(text, /Praça da Liberdade, 10/);
    assert.match(text, /Esporte fino/);
    assert.match(text, /12 de dezembro/);
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
    assert.equal(await visible(page, '.rsvp__details'), false);
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('envio vazio mostra 4 erros e foca o primeiro inválido', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1' });
  try {
    await page.click('.rsvp__submit');
    const errs = await page.$$eval('.field__error', (els) => els.filter((e) => e.textContent).map((e) => e.id));
    assert.deepEqual(errs, ['err-nome', 'err-email', 'err-whatsapp', 'err-presenca']);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'nome');
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

test('fontes: Cormorant sempre, Nunito Sans só fora da Apple, IvyOra pelo kit do Adobe Fonts', async () => {
  const googleHrefs = (page) => page.$$eval('link[rel=stylesheet][href*="fonts.googleapis"]', (ls) => ls.map((l) => l.href));
  const iphone = await startBrowser({ initScript: () => { Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'iPhone' }); } });
  try {
    const g = await googleHrefs(iphone.page);
    assert.equal(g.length, 1);
    assert.ok(g[0].includes('Cormorant+Garamond') && !g[0].includes('Nunito'), g[0]);
    const serif = await iphone.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-serif').trim());
    assert.ok(serif.startsWith('"ivyora-text"'), serif);
  } finally { await iphone.close(); }
  const linux = await startBrowser();
  try {
    const g = await googleHrefs(linux.page);
    assert.equal(g.length, 1);
    assert.ok(g[0].includes('Cormorant+Garamond') && g[0].includes('Nunito+Sans'), g[0]);
    // [review min#3] rótulos usam 600: a Nunito Sans precisa vir em 400 e 600 (sem negrito falso no Android).
    assert.ok(g[0].includes('Nunito+Sans:wght@400;600'), g[0]);
    assert.equal(await linux.page.locator('link[href*="typekit"]').count(), 0);
  } finally { await linux.close(); }
  const kit = await startBrowser({ config: 'fonts' });
  try {
    assert.equal(await kit.page.locator('link[rel=stylesheet][href="https://use.typekit.net/abc1def.css"]').count(), 1);
    const g = await googleHrefs(kit.page);
    assert.ok(g.every((h) => !h.includes('Cormorant')), g.join(' '));
  } finally { await kit.close(); }
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

test('[review #2] Enter num campo "next" vai para o próximo campo, sem enviar', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1' });
  try {
    await page.check('input[name=presenca][value=sim]');
    await page.fill('input[name=nome]', 'Mariana Souza');
    await page.fill('input[name=email]', 'mariana@gmail.com');
    await page.fill('input[name=whatsapp]', '(31) 99876-5432');
    await page.focus('input[name=nome]');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'email');
    await page.focus('input[name=whatsapp]');
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('name')), 'restricao');
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.__maksoSubmitCount || 0), 0);
    assert.equal(await visible(page, '.rsvp__result'), false);
    const errs = await page.$$eval('.field__error', (els) => els.filter((e) => e.textContent).length);
    assert.equal(errs, 0);
  } finally { await close(); }
});

test('[review #3] campos restaurados pelo navegador (acompanhante ligado) continuam enviáveis', async () => {
  const initScript = () => {
    document.addEventListener('readystatechange', () => {
      if (document.readyState !== 'interactive') return;
      document.querySelector('input[name=presenca][value=sim]').checked = true;
      document.querySelector('input[name=acompanhante]').checked = true;
    });
  };
  const { page, close } = await startBrowser({ query: '?demo=1', initScript });
  try {
    assert.ok(await visible(page, '.companion__name'), 'nome do acompanhante deveria aparecer');
    await page.fill('input[name=nome]', 'Mariana Souza');
    await page.fill('input[name=email]', 'mariana@gmail.com');
    await page.fill('input[name=whatsapp]', '(31) 99876-5432');
    await page.fill('input[name=acompanhanteNome]', 'Ana');
    await page.click('.rsvp__submit');
    await resultTitle(page).waitFor({ state: 'visible' });
    assert.equal(await resultTitle(page).textContent(), 'Presença confirmada, Mariana.');
  } finally { await close(); }
});

test('[review #3] "Não vou" restaurado esconde acompanhante e restrição', async () => {
  const initScript = () => {
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'interactive') document.querySelector('input[name=presenca][value=nao]').checked = true;
    });
  };
  const { page, close } = await startBrowser({ query: '?demo=1', initScript });
  try {
    assert.equal(await visible(page, '.companion'), false);
    assert.equal(await visible(page, '.field--restricao'), false);
  } finally { await close(); }
});

test('[review #5] teclado: usa a área visível real (offsetTop) e só rola se o campo sumiu', async () => {
  const initScript = () => {
    const vv = new EventTarget();
    vv.height = innerHeight; vv.offsetTop = 0; vv.width = innerWidth; vv.offsetLeft = 0; vv.scale = 1; vv.pageTop = 0; vv.pageLeft = 0;
    Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv });
    window.__vv = vv;
  };
  const { page, close } = await startBrowser({ query: '?demo=1', initScript });
  try {
    // Campo visível dentro de uma área visível deslocada (offsetTop 300, altura 300): não rola.
    const y0 = await page.evaluate(() => {
      const el = document.querySelector('input[name=email]');
      el.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -350); // campo ~350 px abaixo do topo da janela
      el.focus({ preventScroll: true });
      return scrollY;
    });
    const r1 = await page.evaluate(() => {
      const el = document.querySelector('input[name=email]');
      const r = el.getBoundingClientRect();
      window.__vv.offsetTop = Math.max(0, r.top - 50); window.__vv.height = 300;
      window.__vv.dispatchEvent(new Event('resize'));
      return scrollY;
    });
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => scrollY), y0, 'não deveria rolar um campo já visível');
    void r1;
    // Campo atrás do teclado (área visível 0..150): rola até aparecer.
    await page.evaluate(() => {
      window.__vv.offsetTop = 0; window.__vv.height = 150;
      window.__vv.dispatchEvent(new Event('resize'));
    });
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const r = document.querySelector('input[name=email]').getBoundingClientRect();
      return { bottom: r.bottom, top: r.top };
    });
    assert.ok(after.bottom <= 150 && after.top >= 0, JSON.stringify(after));
  } finally { await close(); }
});
