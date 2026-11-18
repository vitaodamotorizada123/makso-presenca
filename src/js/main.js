/* maksō — inicialização da página. */
// @ts-check
(function () {
  'use strict';

  var cfg = /** @type {MaksoConfig} */ (/** @type {any} */ (window).MAKSO_CONFIG);
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // 1. Inter só fora de plataformas Apple (lá a fonte do sistema já é a SF Pro).
  //    Injetada por JS para não bloquear a primeira pintura nem violar a CSP.
  (function loadFonts() {
    if (/Mac|iPhone|iPad|iPod/.test(navigator.platform || '')) return;
    var pre = document.createElement('link');
    pre.rel = 'preconnect';
    pre.href = 'https://fonts.gstatic.com';
    pre.crossOrigin = 'anonymous';
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap';
    document.head.appendChild(pre);
    document.head.appendChild(css);
  })();

  // 2. Estado da página.
  var demoInfo = MaksoApi.detectDemo(location);
  var hasEndpoint = !!cfg.appsScriptUrl || demoInfo.demo;
  /** @type {RsvpState} */
  var page = demoInfo.scenario === 'encerrado' || demoInfo.scenario === 'passado'
    ? demoInfo.scenario
    : MaksoEventState.getRsvpState({ now: new Date(), cfg: cfg, hasEndpoint: hasEndpoint });

  // 3. Hero: entrada da logo (uma vez por sessão). A flutuação é só CSS.
  var hero = /** @type {HTMLElement|null} */ (document.querySelector('.hero'));
  if (hero) {
    var store = MaksoStorage.session();
    var alreadyPainted = false;
    try {
      alreadyPainted = performance.getEntriesByType('paint').some(function (e) { return e.name === 'first-contentful-paint'; });
    } catch (e) { /* sem Paint Timing */ }
    // Se a página já pintou, animar a entrada faria a logo piscar: pula.
    var intro = !reduced && !store.get('makso-intro') && !alreadyPainted;
    store.set('makso-intro', '1');
    if (intro) hero.classList.add('is-intro');
  }

  // 4. Contagem de visitas anônima (Umami). Nunca no modo demonstração.
  MaksoAnalytics.load({ websiteId: cfg.umamiWebsiteId, demo: demoInfo.demo, siteUrl: cfg.siteUrl });

  // 5. Formulário.
  MaksoForm.mount({
    root: /** @type {HTMLElement} */ (document.getElementById('confirmar')),
    cfg: cfg,
    page: page,
    api: MaksoApi,
    demo: demoInfo.demo,
    scenario: demoInfo.scenario,
    now: function () { return performance.now(); },
    reducedMotion: reduced,
    track: MaksoAnalytics.track,
  });

  // 6. Selo de demonstração e botão do hero.
  var badge = document.querySelector('.demo-badge');
  if (badge && demoInfo.demo) /** @type {HTMLElement} */ (badge).hidden = false;

  var cta = document.querySelector('.hero__cta');
  var rsvp = document.getElementById('confirmar');
  if (cta && rsvp) {
    var section = rsvp;
    cta.addEventListener('click', function (e) {
      e.preventDefault();
      MaksoAnalytics.track('clicou-confirmar-topo');
      section.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  }
})();
