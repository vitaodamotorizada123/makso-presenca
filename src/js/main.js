/* maksō — inicialização da página. */
// @ts-check
(function () {
  'use strict';

  var hero = /** @type {HTMLElement|null} */ (document.querySelector('.hero'));
  if (!hero) return;

  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var store = MaksoStorage.session();

  /** Se a página já pintou, animar a entrada faria a logo piscar: pula. */
  function alreadyPainted() {
    try {
      return performance.getEntriesByType('paint').some(function (e) { return e.name === 'first-contentful-paint'; });
    } catch (e) {
      return false;
    }
  }

  var intro = !reduced && !store.get('makso-intro') && !alreadyPainted();
  store.set('makso-intro', '1');
  if (intro) hero.classList.add('is-intro');

  MaksoGlass.mount({
    hero: hero,
    canvas: /** @type {HTMLCanvasElement} */ (hero.querySelector('.hero__glass')),
    target: /** @type {HTMLElement} */ (hero.querySelector('.hero__logo')),
    reducedMotion: reduced,
    intro: intro,
  });
})();
