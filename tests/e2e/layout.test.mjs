import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { startBrowser, closeBrowser, VIEWPORTS } from '../helpers/browser.mjs';

after(closeBrowser);

for (const viewport of VIEWPORTS) {
  const desktop = viewport.width >= 1024;
  test(`layout ${viewport.width}×${viewport.height}: sem rolagem horizontal, alvos ≥44px, inputs ≥16px`, async () => {
    const { page, close } = await startBrowser({ viewport, isMobile: !desktop, hasTouch: !desktop });
    try {
      const m = await page.evaluate(() => {
        const px = (el, p) => parseFloat(getComputedStyle(el)[p]);
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth,
          innerHeight,
          heroHeight: document.querySelector('.hero').getBoundingClientRect().height,
          smallInputs: [...document.querySelectorAll('input:not([name=hp]), textarea, select')]
            .filter((el) => px(el, 'fontSize') < 16).map((el) => el.name),
          smallTargets: [...document.querySelectorAll('button, a.hero__cta, label.chip')]
            .filter((el) => el.getClientRects().length && el.getBoundingClientRect().height < 44)
            .map((el) => el.className || el.tagName),
          footer: document.querySelector('footer.site-footer')?.textContent ?? '',
        };
      });
      assert.ok(m.scrollWidth <= m.innerWidth, `scrollWidth ${m.scrollWidth} > ${m.innerWidth}`);
      assert.deepEqual(m.smallInputs, []);
      assert.deepEqual(m.smallTargets, []);
      assert.ok(m.footer.includes('Desenvolvido por DIMAK Soluções'));
      assert.ok(m.heroHeight >= m.innerHeight - 1, `hero ${m.heroHeight} < ${m.innerHeight}`);
      assert.deepEqual(page.__problems, []);
    } finally {
      await close();
    }
  });
}
