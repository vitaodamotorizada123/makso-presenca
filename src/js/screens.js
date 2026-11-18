/* maksō — duas telas: convite (1) e formulário (2). O formulário só aparece depois do clique.
 * A tela 2 vive em #confirmar: o "voltar" do celular volta para a tela 1 e o que foi digitado fica. */
// @ts-check
var MaksoScreens = (function () {
  'use strict';

  var HASH = '#confirmar';

  /**
   * @param {{
   *   intro: HTMLElement, rsvp: HTMLElement, cta: HTMLAnchorElement, back: HTMLAnchorElement,
   *   title: HTMLElement, reducedMotion: boolean, onOpen?: () => void
   * }} o
   */
  function mount(o) {
    /** @type {1|2} */
    var shown = o.rsvp.hidden ? 1 : 2;

    /** @param {HTMLElement} el */
    function enter(el) {
      if (o.reducedMotion) return;
      el.classList.remove('is-entering');
      void el.offsetWidth; // reinicia a animação
      el.classList.add('is-entering');
    }

    /** @param {1|2} n @param {{push?: boolean, focus?: boolean}} [opts] */
    function show(n, opts) {
      var push = !!(opts && opts.push);
      var focus = !opts || opts.focus !== false;
      if (push) history.pushState({ makso: 2 }, '', HASH);
      var changed = n !== shown;
      shown = n;
      o.intro.hidden = n !== 1;
      o.rsvp.hidden = n !== 2;
      if (!changed) return;
      enter(n === 1 ? o.intro : o.rsvp);
      window.scrollTo(0, 0);
      if (focus) (n === 2 ? o.title : o.cta).focus({ preventScroll: true });
    }

    function fromLocation() {
      show(location.hash === HASH ? 2 : 1);
    }

    o.cta.addEventListener('click', function (e) {
      e.preventDefault();
      if (o.onOpen) o.onOpen();
      if (location.hash === HASH) show(2);
      else show(2, { push: true });
    });

    o.back.addEventListener('click', function (e) {
      e.preventDefault();
      if (history.state && history.state.makso === 2) {
        history.back(); // o popstate mostra a tela 1
        return;
      }
      history.replaceState(null, '', location.pathname + location.search);
      show(1);
    });

    o.rsvp.addEventListener('animationend', function () { o.rsvp.classList.remove('is-entering'); });
    o.intro.addEventListener('animationend', function (e) {
      if (e.target === o.intro) o.intro.classList.remove('is-entering');
    });

    window.addEventListener('popstate', fromLocation);
    window.addEventListener('pageshow', function (e) { if (e.persisted) fromLocation(); });

    // Link aberto já em #confirmar (ou recarregado ali): abre direto na tela 2, sem roubar o foco.
    if (location.hash === HASH) show(2, { focus: false });

    return {
      show: show,
      /** @returns {1|2} */
      current: function () { return shown; },
    };
  }

  return { mount: mount };
})();
