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
      assert.ok(m.introHeight >= m.innerHeight - 1, `tela 1 ${m.introHeight} < ${m.innerHeight}`);

      await page.click('.intro__cta');
      // [review imp#2] mede depois da entrada (translateY animado deixava o "‹ Voltar" com 43,99px).
      await page.waitForFunction(() => !document.getElementById('confirmar').classList.contains('is-entering'));
      const m2 = await measure(page);
      assert.ok(m2.scrollWidth <= m2.innerWidth, `tela 2: scrollWidth ${m2.scrollWidth} > ${m2.innerWidth}`);
      assert.deepEqual(m2.smallTargets, []);
      assert.deepEqual(page.__problems, []);
    } finally {
      await close();
    }
  });
}
