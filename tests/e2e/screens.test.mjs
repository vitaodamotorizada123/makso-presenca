import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { startBrowser, closeBrowser } from '../helpers/browser.mjs';

after(closeBrowser);

const LEDE = 'Algumas coisas precisam ser vistas de perto e você foi escolhida para conhecer em primeira mão.';
const shown = (page, sel) => page.locator(sel).isVisible();
const screenState = (page) => page.evaluate(() => ({
  intro: !document.getElementById('inicio').hidden,
  rsvp: !document.getElementById('confirmar').hidden,
  hash: location.hash,
}));

async function fillYes(page) {
  await page.fill('input[name=nome]', 'Mariana Souza');
  await page.fill('input[name=email]', 'mariana@gmail.com');
  await page.fill('input[name=emailConfirmacao]', 'mariana@gmail.com');
  await page.fill('input[name=whatsapp]', '(31) 99876-5432');
}

test('o formulário só aparece depois do clique em Confirme sua presença', async () => {
  const { page, close } = await startBrowser();
  try {
    assert.deepEqual(await screenState(page), { intro: true, rsvp: false, hash: '' });
    assert.equal(await shown(page, 'form.rsvp__form'), false);
    assert.equal((await page.textContent('.intro__lede')).trim(), LEDE);
    assert.equal((await page.textContent('.intro__cta')).trim(), 'Confirme sua presença');
    await page.click('.intro__cta');
    assert.deepEqual(await screenState(page), { intro: false, rsvp: true, hash: '#confirmar' });
    assert.equal(await shown(page, 'form.rsvp__form'), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'rsvp-title');
    assert.equal((await page.textContent('#rsvp-title')).trim(), 'Dados para contato');
    assert.equal((await page.textContent('.rsvp__submit')).trim(), 'Confirmar presença');
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('voltar do navegador retorna à tela 1 e mantém o que foi digitado', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1' });
  try {
    await page.click('.intro__cta');
    await page.fill('input[name=nome]', 'Ana Lima');
    await page.goBack();
    await page.waitForFunction(() => !document.getElementById('inicio').hidden);
    assert.deepEqual(await screenState(page), { intro: true, rsvp: false, hash: '' });
    await page.click('.intro__cta');
    assert.equal(await page.inputValue('input[name=nome]'), 'Ana Lima');
  } finally { await close(); }
});

test('link ‹ Voltar volta à tela 1', async () => {
  const { page, close } = await startBrowser();
  try {
    await page.click('.intro__cta');
    assert.equal((await page.textContent('.rsvp__back')).trim(), '‹ Voltar');
    await page.click('.rsvp__back');
    await page.waitForFunction(() => !document.getElementById('inicio').hidden);
    assert.deepEqual(await screenState(page), { intro: true, rsvp: false, hash: '' });
  } finally { await close(); }
});

test('abrir com #confirmar mostra a tela 2 direto (e o ‹ Voltar ainda funciona)', async () => {
  const { page, close } = await startBrowser({ query: '#confirmar' });
  try {
    assert.deepEqual(await screenState(page), { intro: false, rsvp: true, hash: '#confirmar' });
    await page.click('.rsvp__back');
    assert.deepEqual(await screenState(page), { intro: true, rsvp: false, hash: '' });
    // replaceState não atualiza :target — a regra de "sem JS" não pode reabrir a tela 2.
    assert.equal(await shown(page, '#confirmar'), false);
  } finally { await close(); }
});

test('#confirmar com confirmações em breve mostra a mensagem, sem erro', async () => {
  const { page, close } = await startBrowser({ query: '#confirmar' });
  try {
    assert.match(await page.textContent('.rsvp__status'), /em breve/);
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('depois de confirmar, voltar e abrir de novo mostra o obrigado', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1' });
  try {
    await page.click('.intro__cta');
    await fillYes(page);
    await page.waitForTimeout(900);
    await page.click('.rsvp__submit');
    await page.locator('.rsvp__result-title').waitFor({ state: 'visible' });
    await page.goBack();
    await page.waitForFunction(() => !document.getElementById('inicio').hidden);
    await page.click('.intro__cta');
    assert.equal(await shown(page, '.rsvp__result'), true);
    assert.equal(await shown(page, 'form.rsvp__form'), false);
  } finally { await close(); }
});

test('sem JavaScript, o botão ainda abre a tela 2 (CSS :target)', async () => {
  const { page, close } = await startBrowser({ javaScriptEnabled: false });
  try {
    assert.equal(await shown(page, '#confirmar'), false);
    await page.click('.intro__cta');
    await page.waitForURL(/#confirmar$/);
    assert.equal(await shown(page, '#confirmar'), true);
  } finally { await close(); }
});

test('com movimento reduzido, troca de tela sem transição', async () => {
  const { page, close } = await startBrowser({ reducedMotion: 'reduce' });
  try {
    await page.click('.intro__cta');
    const s = await page.evaluate(() => {
      const cs = getComputedStyle(document.getElementById('confirmar'));
      return { anim: cs.animationName, dur: cs.transitionDuration };
    });
    assert.equal(s.anim, 'none');
    // base.css zera transições com movimento reduzido (0.01ms → "1e-05s"): nada perceptível.
    assert.ok(s.dur.split(',').every((d) => parseFloat(d) < 0.001), s.dur);
  } finally { await close(); }
});

test('sem movimento reduzido, a tela 2 entra com transição', async () => {
  const { page, close } = await startBrowser();
  try {
    await page.click('.intro__cta');
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('confirmar')).animationName), 'makso-enter');
  } finally { await close(); }
});

test('[review imp#1] confirmações encerradas: o botão leva à tela 2 e o foco vai para a mensagem', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1&cenario=encerrado' });
  try {
    await page.click('.intro__cta');
    assert.equal(await shown(page, '.rsvp__result-title'), true);
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'rsvp__result-title');
  } finally { await close(); }
});

test('[review imp#1] confirmar, voltar e abrir de novo: foco no título do obrigado', async () => {
  const { page, close } = await startBrowser({ query: '?demo=1' });
  try {
    await page.click('.intro__cta');
    await fillYes(page);
    await page.waitForTimeout(900);
    await page.click('.rsvp__submit');
    await page.locator('.rsvp__result-title').waitFor({ state: 'visible' });
    await page.goBack();
    await page.waitForFunction(() => !document.getElementById('inicio').hidden);
    await page.click('.intro__cta');
    assert.equal(await page.evaluate(() => document.activeElement?.className), 'rsvp__result-title');
  } finally { await close(); }
});

test('[review min#1] se um script quebrar antes, o botão ainda abre a tela 2', async () => {
  // Analytics que explode no load: o resto da inicialização não pode deixar o botão morto.
  const initScript = () => {
    Object.defineProperty(window, 'MaksoAnalytics', {
      value: { load() { throw new Error('analytics quebrou'); }, track() {} },
      writable: false, configurable: false,
    });
  };
  const { page, close } = await startBrowser({ initScript });
  try {
    await page.click('.intro__cta');
    await page.waitForTimeout(100);
    assert.equal(await shown(page, '#confirmar'), true);
  } finally { await close(); }
});
