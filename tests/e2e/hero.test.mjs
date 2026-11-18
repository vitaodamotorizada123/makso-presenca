import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { startBrowser, closeBrowser } from '../helpers/browser.mjs';

after(closeBrowser);

const BG = 'rgb(59, 41, 53)'; // #3b2935 (Pantone 6077 C)
const CREAM = 'rgb(229, 221, 209)'; // #e5ddd1

const hero = (page) => page.evaluate(() => {
  const h = document.querySelector('.hero');
  const logo = h.querySelector('.hero__logo .logo');
  const before = getComputedStyle(h.querySelector('.hero__logo'), '::before');
  return {
    bodyBg: getComputedStyle(document.body).backgroundColor,
    heroBg: getComputedStyle(h).backgroundColor,
    heroBgImage: getComputedStyle(h, '::before').backgroundImage,
    canvas: !!document.querySelector('canvas'),
    capsule: before.content !== 'none' && before.content !== 'normal',
    logoColor: getComputedStyle(logo).color,
    logoAnimation: getComputedStyle(logo).animationName,
    logoIteration: getComputedStyle(logo).animationIterationCount,
    themeColor: document.querySelector('meta[name=theme-color]').content,
  };
});

test('topo: logo creme flutuando sobre #3b2935, sem pílula e sem WebGL', async () => {
  const { page, close } = await startBrowser();
  try {
    const h = await hero(page);
    assert.equal(h.bodyBg, BG);
    assert.equal(h.heroBg, BG);
    assert.ok(h.heroBgImage === 'none' || h.heroBgImage === '', `fundo do hero com imagem: ${h.heroBgImage}`);
    assert.equal(h.canvas, false, 'não deveria haver canvas');
    assert.equal(h.capsule, false, 'não deveria haver cápsula/pílula em volta da logo');
    assert.equal(h.logoAnimation, 'makso-float');
    assert.equal(h.logoIteration, 'infinite');
    assert.equal(h.themeColor, '#3B2935');
    assert.equal(h.logoColor, CREAM);
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('logo realmente se move (flutua) com o tempo', async () => {
  const { page, close } = await startBrowser();
  try {
    const y = () => page.evaluate(() => document.querySelector('.hero__logo .logo').getBoundingClientRect().top);
    await page.waitForTimeout(700);
    const a = await y();
    await page.waitForTimeout(1500);
    const b = await y();
    assert.ok(Math.abs(a - b) > 1, `logo parada: ${a} → ${b}`);
  } finally { await close(); }
});

test('com movimento reduzido, a logo fica parada', async () => {
  const { page, close } = await startBrowser({ reducedMotion: 'reduce' });
  try {
    const h = await hero(page);
    assert.notEqual(h.logoIteration, 'infinite');
    const y = () => page.evaluate(() => document.querySelector('.hero__logo .logo').getBoundingClientRect().top);
    const a = await y();
    await page.waitForTimeout(1200);
    assert.equal(await y(), a);
  } finally { await close(); }
});

test('seções de baixo também em #3b2935, com texto claro legível', async () => {
  const { page, close } = await startBrowser();
  try {
    const s = await page.evaluate(() => ['.details', '.rsvp', '.site-footer'].map((sel) => {
      const el = document.querySelector(sel);
      return { sel, bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el.querySelector('h2, dd, p') || el).color };
    }));
    for (const x of s) {
      assert.ok(x.bg === BG || x.bg === 'rgba(0, 0, 0, 0)', `${x.sel} com fundo ${x.bg}`);
      const [r, g, b] = x.color.match(/\d+/g).map(Number);
      assert.ok(r > 150 && g > 140 && b > 145, `${x.sel} com texto escuro demais: ${x.color}`);
    }
  } finally { await close(); }
});
