import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { startBrowser, closeBrowser } from '../helpers/browser.mjs';

after(closeBrowser);

const BG = 'rgb(36, 21, 31)'; // #24151f (Pantone 6077 C)
const CREAM = 'rgb(225, 218, 208)'; // #e1dad0
const LOGO = '#inicio .screen__logo .logo';

const intro = (page) => page.evaluate((sel) => {
  const s = document.getElementById('inicio');
  const logo = document.querySelector(sel);
  const when = s.querySelector('.intro__when');
  const box = (el) => el.getBoundingClientRect();
  return {
    bodyBg: getComputedStyle(document.body).backgroundColor,
    introBg: getComputedStyle(s).backgroundColor,
    introHeight: box(s).height,
    innerHeight,
    footerHeight: document.querySelector('footer.site-footer').getBoundingClientRect().height,
    canvas: !!document.querySelector('canvas'),
    logoAboveLede: box(logo).bottom <= box(s.querySelector('.intro__lede')).top,
    logoColor: getComputedStyle(logo).color,
    logoAnimation: getComputedStyle(logo).animationName,
    logoIteration: getComputedStyle(logo).animationIterationCount,
    themeColor: document.querySelector('meta[name=theme-color]').content,
    order: [...s.querySelectorAll('.intro__lede, .intro__cta, .intro__when, .screen__logo')].map((el) => el.className.split(' ').pop()),
    date: s.querySelector('.intro__date')?.textContent,
    time: s.querySelector('.intro__time')?.textContent,
  };
}, LOGO);

test('tela 1: frase, botão, data e logo creme flutuando no pé, sobre #24151f', async () => {
  const { page, close } = await startBrowser();
  try {
    const h = await intro(page);
    assert.equal(h.bodyBg, BG);
    assert.ok(h.introBg === BG || h.introBg === 'rgba(0, 0, 0, 0)', `fundo da tela 1: ${h.introBg}`);
    // Tela 1 + rodapé = exatamente uma tela (sem rolagem: ver layout.test.mjs).
    assert.ok(Math.abs(h.introHeight + h.footerHeight - h.innerHeight) <= 1, `tela 1 ${h.introHeight} + rodapé ${h.footerHeight} ≠ ${h.innerHeight}`);
    assert.deepEqual(h.order, ['screen__logo', 'intro__lede', 'intro__cta', 'intro__when']);
    assert.equal(h.date, '12 . 12 . 2037');
    assert.equal(h.time, '20h');
    assert.equal(h.logoAboveLede, true, 'a logo deveria ficar acima da frase');
    assert.equal(h.canvas, false, 'não deveria haver canvas');
    assert.equal(h.logoAnimation, 'makso-float');
    assert.equal(h.logoIteration, 'infinite');
    assert.equal(h.logoColor, CREAM);
    assert.equal(h.themeColor, '#24151F');
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('logo realmente se move (flutua) com o tempo', async () => {
  const { page, close } = await startBrowser();
  try {
    const y = () => page.evaluate((sel) => document.querySelector(sel).getBoundingClientRect().top, LOGO);
    await page.waitForTimeout(700);
    const a = await y();
    await page.waitForTimeout(1500);
    const b = await y();
    assert.ok(Math.abs(a - b) > 0.5, `logo parada: ${a} → ${b}`);
  } finally { await close(); }
});

test('com movimento reduzido, a logo fica parada', async () => {
  const { page, close } = await startBrowser({ reducedMotion: 'reduce' });
  try {
    const h = await intro(page);
    assert.notEqual(h.logoIteration, 'infinite');
    const y = () => page.evaluate((sel) => document.querySelector(sel).getBoundingClientRect().top, LOGO);
    const a = await y();
    await page.waitForTimeout(1200);
    assert.equal(await y(), a);
  } finally { await close(); }
});

test('tela 2 e rodapé também em #24151f, com texto claro legível', async () => {
  const { page, close } = await startBrowser({ query: '#confirmar' });
  try {
    const s = await page.evaluate(() => ['.rsvp', '.site-footer'].map((sel) => {
      const el = document.querySelector(sel);
      return { sel, bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el.querySelector('h2, p') || el).color };
    }));
    for (const x of s) {
      assert.ok(x.bg === BG || x.bg === 'rgba(0, 0, 0, 0)', `${x.sel} com fundo ${x.bg}`);
      const [r, g, b] = x.color.match(/\d+/g).map(Number);
      assert.ok(r > 150 && g > 140 && b > 145, `${x.sel} com texto escuro demais: ${x.color}`);
    }
  } finally { await close(); }
});

test('a logo decorativa da tela 2 não duplica id nem é lida duas vezes', async () => {
  const { page, close } = await startBrowser();
  try {
    const r = await page.evaluate(() => ({
      titles: document.querySelectorAll('#makso-title').length,
      decorHidden: document.querySelector('#confirmar .screen__logo svg')?.getAttribute('aria-hidden'),
    }));
    assert.equal(r.titles, 1);
    assert.equal(r.decorHidden, 'true');
  } finally { await close(); }
});

for (const viewport of [{ width: 440, height: 956 }, { width: 390, height: 844 }, { width: 375, height: 667 }]) {
  test(`tela 1 ${viewport.width}×${viewport.height}: botão e data mais para cima, sem encostar na frase`, async () => {
    const { page, close } = await startBrowser({ viewport });
    try {
      const r = await page.evaluate(() => {
        const b = (s) => document.querySelector(s).getBoundingClientRect();
        const h = innerHeight;
        const cta = b('.intro__cta');
        return { lede: b('.intro__lede').bottom / h, ctaTop: cta.top / h, ctaMid: (cta.top + cta.bottom) / 2 / h, ctaBottom: cta.bottom / h, whenTop: b('.intro__when').top / h };
      });
      assert.ok(r.ctaMid <= 0.565, `botão no meio em ${r.ctaMid.toFixed(3)} da altura (era ~0,61)`);
      assert.ok(r.whenTop <= 0.75, `data em ${r.whenTop.toFixed(3)} da altura (era ~0,81)`);
      assert.ok(r.ctaTop - r.lede >= 0.06, 'respiro entre a frase e o botão');
      assert.ok(r.whenTop - r.ctaBottom >= 0.08, 'respiro entre o botão e a data');
    } finally { await close(); }
  });
}
