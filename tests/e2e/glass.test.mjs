import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { startBrowser, closeBrowser } from '../helpers/browser.mjs';

after(closeBrowser);

const state = (page) => page.evaluate(() => {
  const hero = document.querySelector('.hero');
  const canvas = hero.querySelector('.hero__glass');
  return { glass: hero.dataset.glass, motion: hero.dataset.motion, cw: canvas.width, ch: canvas.height, hw: hero.clientWidth, hh: hero.clientHeight };
});

const layoutBox = (page) => page.evaluate(() => {
  const hero = document.querySelector('.hero');
  const logo = hero.querySelector('.hero__logo');
  return { x: logo.offsetLeft, y: logo.offsetTop, w: logo.offsetWidth, h: logo.offsetHeight, rect: hero.querySelector('.hero__glass').__maksoRect };
});

test('vidro em WebGL, animado, com buffer = hero × min(dpr, 1.5)', async () => {
  const { page, close } = await startBrowser();
  try {
    await page.waitForTimeout(600);
    const s = await state(page);
    assert.equal(s.glass, 'webgl');
    assert.equal(s.motion, 'live');
    assert.equal(s.cw, Math.round(s.hw * 1.5));
    assert.equal(s.ch, Math.round(s.hh * 1.5));
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('sem WebGL cai no vidro CSS', async () => {
  const { page, close } = await startBrowser({ initScript: () => { HTMLCanvasElement.prototype.getContext = () => null; } });
  try {
    await page.waitForTimeout(300);
    assert.equal((await state(page)).glass, 'css');
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});

test('com movimento reduzido, quadro parado', async () => {
  const { page, close } = await startBrowser({ reducedMotion: 'reduce' });
  try {
    await page.waitForTimeout(400);
    const s = await state(page);
    assert.equal(s.motion, 'static');
    assert.equal(s.glass, 'webgl');
  } finally { await close(); }
});

test('canvas acompanha a mudança de tamanho (celular deitado)', async () => {
  const { page, close } = await startBrowser();
  try {
    await page.waitForTimeout(300);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(300);
    const s = await state(page);
    assert.equal(s.cw, Math.round(s.hw * 1.5));
    assert.equal(s.ch, Math.round(s.hh * 1.5));
  } finally { await close(); }
});

test('cápsula medida pela caixa de layout relativa ao hero, mesmo rolado', async () => {
  const { page, close } = await startBrowser();
  try {
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.setViewportSize({ width: 400, height: 844 });
    await page.waitForTimeout(300);
    const b = await layoutBox(page);
    assert.deepEqual(b.rect, { x: b.x, y: b.y, w: b.w, h: b.h });
  } finally { await close(); }
});

test('cápsula ignora transform da logo (intro com scale)', async () => {
  const { page, close } = await startBrowser();
  try {
    await page.waitForTimeout(300);
    await page.evaluate(() => { document.querySelector('.hero__logo').style.transform = 'scale(0.9)'; });
    await page.setViewportSize({ width: 392, height: 844 });
    await page.waitForTimeout(300);
    const b = await layoutBox(page);
    assert.equal(b.rect.w, b.w);
    assert.equal(b.rect.h, b.h);
  } finally { await close(); }
});

test('perda e restauração do contexto WebGL', async () => {
  const { page, close } = await startBrowser();
  try {
    await page.waitForTimeout(400);
    await page.evaluate(() => { window.__lose = document.querySelector('.hero__glass').getContext('webgl').getExtension('WEBGL_lose_context'); window.__lose.loseContext(); });
    await page.waitForTimeout(200);
    assert.equal((await state(page)).glass, 'css');
    await page.evaluate(() => window.__lose.restoreContext());
    await page.waitForTimeout(400);
    assert.equal((await state(page)).glass, 'webgl');
    assert.deepEqual(page.__problems, []);
  } finally { await close(); }
});
