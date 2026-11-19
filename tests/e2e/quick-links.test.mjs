// Atalhos fixos de WhatsApp e Instagram (pedido do cliente, 18/11): canto inferior direito,
// um em cima do outro, nas telas 1 e 3; mesma posição e tamanho em todas as telas; nunca
// por cima de nenhuma informação, mesmo rolando a tela 3.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { startBrowser, closeBrowser } from '../helpers/browser.mjs';

after(closeBrowser);

const WA = 'https://wa.me/5531987272711';
const IG = 'https://www.instagram.com/makso.br/';

/** @param {import('playwright').Page} page */
async function links(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll('.quick-links a')];
    return els.map((a) => {
      const r = a.getBoundingClientRect();
      const dot = a.querySelector('.quick-links__dot')?.getBoundingClientRect();
      return {
        href: a.getAttribute('href'), label: a.getAttribute('aria-label') || '', target: a.target,
        visible: !!(r.width && r.height) && getComputedStyle(a).visibility !== 'hidden',
        x: r.x, y: r.y, w: r.width, h: r.height,
        dot: dot ? { left: dot.left, top: dot.top, right: dot.right, bottom: dot.bottom } : null,
        position: getComputedStyle(a.closest('.quick-links')).position,
        color: getComputedStyle(a).color, bg: getComputedStyle(a.querySelector('.quick-links__dot')).backgroundColor,
      };
    });
  });
}

/** Tudo o que é visível dentro de um seletor (texto, botões, logo). */
async function contentBoxes(page, rootSel) {
  return page.evaluate((sel) => {
    const out = [];
    for (const el of document.querySelectorAll(sel.split(',').map((x) => `${x.trim()} *`).join(', '))) {
      if (el.closest('.quick-links, [hidden]')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const isBox = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'svg'].includes(el.tagName);
      if (!hasText && !isBox) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      // Largura real do texto (um bloco pode ocupar a linha toda com o texto centralizado).
      let { left, right } = r;
      if (hasText && !isBox) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const rr = range.getBoundingClientRect();
        left = rr.left; right = rr.right;
      }
      out.push({ name: `${el.tagName.toLowerCase()}.${el.className?.baseVal ?? el.className}`, left, right, top: r.top, bottom: r.bottom });
    }
    return out;
  }, rootSel);
}

const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

for (const viewport of [{ width: 440, height: 956 }, { width: 390, height: 844 }, { width: 375, height: 667 }, { width: 1440, height: 900 }]) {
  test(`atalhos ${viewport.width}×${viewport.height}: telas 1 e 3, canto inferior direito, mesmo lugar e tamanho, sem cobrir nada`, async () => {
    const { page, close } = await startBrowser({ query: '?demo=1', viewport });
    try {
      // Tela 1
      const l1 = await links(page);
      assert.deepEqual(l1.map((l) => l.href), [WA, IG], 'WhatsApp em cima, Instagram embaixo');
      assert.ok(l1.every((l) => l.visible), 'visíveis na tela 1');
      assert.ok(l1.every((l) => l.target === '_blank'));
      assert.match(l1[0].label, /WhatsApp/);
      assert.match(l1[1].label, /Instagram/);
      assert.ok(l1.every((l) => l.w >= 44 && l.h >= 44), 'área de toque ≥ 44px');
      assert.equal(l1[0].position, 'fixed');
      assert.equal(l1[0].color, 'rgb(225, 218, 208)');
      assert.equal(l1[0].bg, 'rgb(36, 21, 31)');
      // empilhados e juntinhos, no canto direito
      assert.ok(Math.abs(l1[0].x - l1[1].x) < 0.5, 'alinhados na vertical');
      assert.ok(l1[1].dot.top - l1[0].dot.bottom <= 12, 'juntinhos');
      assert.ok(viewport.width - l1[0].dot.right <= 16, 'encostados na direita');
      const footer = await page.evaluate(() => {
        const f = document.querySelector('footer.site-footer');
        return { top: f.getBoundingClientRect().top, border: getComputedStyle(f).borderTopWidth };
      });
      assert.equal(footer.border, '1px', 'linha do rodapé na tela 1');
      assert.ok(l1[1].dot.bottom <= footer.top, 'acima da linha do rodapé');
      for (const box of await contentBoxes(page, '#inicio, footer.site-footer')) {
        for (const l of l1) assert.ok(!overlaps(l.dot, box), `atalho cobre ${box.name} na tela 1`);
      }

      // Tela 2 (formulário): sem atalhos
      await page.click('.intro__cta');
      await page.locator('#confirmar').waitFor({ state: 'visible' });
      assert.ok((await links(page)).every((l) => !l.visible), 'escondidos no formulário');

      // Tela 3 (obrigado)
      await page.fill('input[name=nome]', 'Mariana Souza');
      await page.fill('input[name=email]', 'mariana@gmail.com');
      await page.fill('input[name=emailConfirmacao]', 'mariana@gmail.com');
      await page.fill('input[name=whatsapp]', '(31) 99876-5432');
      await page.click('.rsvp__submit');
      await page.locator('.rsvp__result.is-confirmed').waitFor({ state: 'visible' });
      await page.waitForTimeout(400);
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      for (let y = 0; ; y = Math.min(max, y + 40)) {
        await page.evaluate((v) => window.scrollTo(0, v), y);
        const l3 = await links(page);
        assert.ok(l3.every((l) => l.visible), `visíveis na tela 3 (rolagem ${y})`);
        l3.forEach((l, i) => {
          assert.ok(Math.abs(l.x - l1[i].x) < 0.5 && Math.abs(l.y - l1[i].y) < 0.5, `mesmo lugar da tela 1 (rolagem ${y})`);
          assert.ok(Math.abs(l.w - l1[i].w) < 0.5 && Math.abs(l.h - l1[i].h) < 0.5, 'mesmo tamanho');
        });
        for (const box of await contentBoxes(page, '#confirmar, footer.site-footer')) {
          for (const l of l3) assert.ok(!overlaps(l.dot, box), `atalho cobre ${box.name} na tela 3 (rolagem ${y})`);
        }
        if (y >= max) {
          const ft = await page.evaluate(() => document.querySelector('footer.site-footer').getBoundingClientRect().top);
          assert.ok(l3[1].dot.bottom <= ft, `no fim da tela 3 os atalhos ficam acima da linha do rodapé (${l3[1].dot.bottom} > ${ft})`);
          break;
        }
      }
      assert.deepEqual(page.__problems, []);
    } finally { await close(); }
  });
}
