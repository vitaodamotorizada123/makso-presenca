/* maksō — contagem de visitas anônima (Umami Cloud, sem cookies).
 * Nunca envia nome, e-mail, WhatsApp ou texto digitado: só nomes de eventos
 * e, no máximo, um booleano. Desligado no modo demonstração. */
// @ts-check
var MaksoAnalytics = (function () {
  'use strict';

  var SCRIPT = 'https://cloud.umami.is/script.js';

  /**
   * @param {{websiteId?: string, demo: boolean, siteUrl: string, doc?: Document}} o
   * @returns {boolean} se o script foi injetado
   */
  function load(o) {
    var doc = o.doc || document;
    if (!o.websiteId || o.demo) return false;
    var host = '';
    try { host = new URL(o.siteUrl).hostname; } catch (e) { return false; }
    var s = doc.createElement('script');
    s.src = SCRIPT;
    s.defer = true;
    s.dataset.websiteId = o.websiteId;
    s.dataset.domains = host; // só conta no site publicado (não em testes/local)
    doc.head.appendChild(s);
    return true;
  }

  /** @param {string} name @param {Record<string, boolean|string|number>} [data] */
  function track(name, data) {
    try {
      var u = /** @type {any} */ (window).umami;
      if (u && typeof u.track === 'function') {
        if (data) u.track(name, data);
        else u.track(name);
      }
    } catch (e) { /* analytics nunca derruba a página */ }
  }

  return { load: load, track: track };
})();
