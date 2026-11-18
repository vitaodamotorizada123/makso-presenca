import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { startBrowser, closeBrowser, VIEWPORTS } from '../helpers/browser.mjs';

after(closeBrowser);

const measure = (page) => page.evaluate(() => {
  const px = (el, p) => parseFloat(getComputedStyle(el)[p]);
  return {
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    innerHeight,
    introHeight: document.getElementById('inicio').getBoundingClientRect().height,
    smallInputs: [...document.querySelectorAll('input:not([name=hp]), textarea, select')]
      .filter((el) => px(el, 'fontSize') < 16).map((el) => el.name),
    smallTargets: [...document.querySelectorAll('button, a.intro__cta, a.rsvp__back, label.chip')]
      .filter((el) => el.getClientRects().length && el.getBoundingClientRect().height < 44)
      .map((el) => el.className || el.tagName),
    footer: document.querySelector('footer.site-footer')?.textContent ?? '',
    docHeight: document.documentElement.scrollHeight,
    htmlOverflow: getComputedStyle(document.documentElement).overflowY,
    footerBox: (() => { const r = document.querySelector('footer.site-footer').getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; })(),
    introBox: (() => { const r = document.getElementById('inicio').getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; })(),
    introParts: [...document.querySelectorAll('#inicio .screen__logo, #inicio .intro__lede, #inicio .intro__cta, #inicio .intro__when')]
      .map((el) => { const r = el.getBoundingClientRect(); return { name: el.className, top: r.top, bottom: r.bottom }; }),
  };
});

for (const viewport of VIEWPORTS) {
  const desktop = viewport.width >= 1024;
  test(`layout ${viewport.width}×${viewport.height}: sem rolagem horizontal, alvos ≥44px, inputs ≥16px (telas 1 e 2)`, async () => {
    const { page, close } = await startBrowser({ viewport, isMobile: !desktop, hasTouch: !desktop });
    try {
      const m = await measure(page);
      assert.ok(m.scrollWidth <= m.innerWidth, `tela 1: scrollWidth ${m.scrollWidth} > ${m.innerWidth}`);
      assert.deepEqual(m.smallInputs, []);
      assert.deepEqual(m.smallTargets, []);
      assert.ok(m.footer.includes('Desenvolvido por DIMAK Soluções'));
      // Tela 1 = exatamente uma tela, com o rodapé visível e nada para rolar (pedido do cliente 18/11).
      assert.ok(m.docHeight <= m.innerHeight, `tela 1 rola: altura ${m.docHeight} > ${m.innerHeight}`);
      assert.equal(m.introBox.top, 0);
      assert.ok(Math.abs(m.introBox.bottom - m.footerBox.top) <= 1, 'a tela 1 vai até o rodapé');
      assert.ok(m.footerBox.bottom <= m.innerHeight + 0.5, `rodapé fora da tela (${m.footerBox.bottom} > ${m.innerHeight})`);
      for (const p of m.introParts) assert.ok(p.top >= 0 && p.bottom <= m.footerBox.top + 0.5, `${p.name} cortado (${p.top}–${p.bottom}, rodapé em ${m.footerBox.top})`);
      await page.mouse.wheel(0, 2000);
      await page.evaluate(() => window.scrollTo(0, 2000));
      assert.equal(await page.evaluate(() => window.scrollY), 0, 'tela 1 não rola');

      await page.click('.intro__cta');
      // [review imp#2] mede depois da entrada (translateY animado deixava o "‹ Voltar" com 43,99px).
      await page.waitForFunction(() => !document.getElementById('confirmar').classList.contains('is-entering'));
      const m2 = await measure(page);
      assert.ok(m2.scrollWidth <= m2.innerWidth, `tela 2: scrollWidth ${m2.scrollWidth} > ${m2.innerWidth}`);
      assert.deepEqual(m2.smallTargets, []);
      assert.notEqual(m2.htmlOverflow, 'hidden', 'a tela 2 (formulário) continua rolando');
      assert.deepEqual(page.__problems, []);
    } finally {
      await close();
    }
  });
}
