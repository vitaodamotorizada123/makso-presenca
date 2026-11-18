/* maksō — inicialização da página. */
// @ts-check
(function () {
  'use strict';

  var cfg = /** @type {MaksoConfig} */ (/** @type {any} */ (window).MAKSO_CONFIG);
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // 1. Fontes da marca, injetadas por JS para não bloquear a primeira pintura nem violar a CSP.
  //    - IvyOra Text (serifada da marca): só pelo kit do Adobe Fonts (licença); sem kit, Cormorant Garamond.
  //    - Avenir (complementar): já vem no iPhone/Mac; fora da Apple, Nunito Sans.
  (function loadFonts() {
    /** @param {string} rel @param {string} href */
    function link(rel, href) {
      var l = document.createElement('link');
      l.rel = rel;
      l.href = href;
      if (rel === 'preconnect') l.crossOrigin = 'anonymous';
      document.head.appendChild(l);
    }
    // Poppins no documento todo; Petit Formal Script só na frase do "obrigado".
    link('preconnect', 'https://fonts.gstatic.com');
    link('stylesheet', 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&family=Petit+Formal+Script&display=swap');
  })();

  // 2. Estado da página.
  var demoInfo = MaksoApi.detectDemo(location);
  var hasEndpoint = !!cfg.appsScriptUrl || demoInfo.demo;
  /** @type {RsvpState} */
  var page = demoInfo.scenario === 'encerrado' || demoInfo.scenario === 'passado'
    ? demoInfo.scenario
    : MaksoEventState.getRsvpState({ now: new Date(), cfg: cfg, hasEndpoint: hasEndpoint });

  // 3. Duas telas: o formulário só aparece depois de "Confirme sua presença".
  //    Montadas antes de tudo o que pode falhar; html.js (que desliga a regra de "sem JavaScript",
  //    #confirmar:target) só entra depois que a navegação está de pé.
  var intro = /** @type {HTMLElement|null} */ (document.getElementById('inicio'));
  var rsvp = document.getElementById('confirmar');
  var cta = document.querySelector('.intro__cta');
  var back = document.querySelector('.rsvp__back');
  var title = document.getElementById('rsvp-title');
  if (intro && rsvp && cta && back && title) {
    MaksoScreens.mount({
      intro: intro,
      rsvp: rsvp,
      cta: /** @type {HTMLAnchorElement} */ (cta),
      back: /** @type {HTMLAnchorElement} */ (back),
      title: title,
      reducedMotion: reduced,
      onOpen: function () { MaksoAnalytics.track('clicou-confirmar-topo'); },
    });
    document.documentElement.classList.add('js');
  }

  // 4. Tela 1: entrada (uma vez por sessão). A flutuação da logo é só CSS.
  if (intro) {
    var store = MaksoStorage.session();
    var alreadyPainted = false;
    try {
      alreadyPainted = performance.getEntriesByType('paint').some(function (e) { return e.name === 'first-contentful-paint'; });
    } catch (e) { /* sem Paint Timing */ }
    // Se a página já pintou, animar a entrada faria o texto piscar: pula.
    var animate = !reduced && !store.get('makso-intro') && !alreadyPainted && location.hash !== '#confirmar';
    store.set('makso-intro', '1');
    if (animate) intro.classList.add('is-intro');
  }

  // 5. Contagem de visitas anônima (Umami). Nunca no modo demonstração.
  MaksoAnalytics.load({ websiteId: cfg.umamiWebsiteId, demo: demoInfo.demo, siteUrl: cfg.siteUrl });

  // 6. Formulário.
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

  // 7. Selo de demonstração.
  var badge = document.querySelector('.demo-badge');
  if (badge && demoInfo.demo) /** @type {HTMLElement} */ (badge).hidden = false;
})();
