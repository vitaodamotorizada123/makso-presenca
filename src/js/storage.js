/* maksō — sessionStorage à prova de bloqueio (navegadores internos do
 * Instagram/WhatsApp, modo privado). Nunca lança: cai para memória. */
// @ts-check
var MaksoStorage = (function () {
  'use strict';

  /**
   * @param {{getItem(k: string): string|null, setItem(k: string, v: string): void, removeItem(k: string): void}|undefined|null} storage
   */
  function safe(storage) {
    /** @type {Map<string, string>} */
    var memory = new Map();
    return {
      /** @param {string} k @returns {string|null} */
      get: function (k) {
        if (memory.has(k)) return /** @type {string} */ (memory.get(k));
        try { return storage ? storage.getItem(k) : null; } catch (e) { return null; }
      },
      /** @param {string} k @param {string} v */
      set: function (k, v) {
        memory.set(k, String(v));
        try { if (storage) storage.setItem(k, String(v)); } catch (e) { /* fica só na memória */ }
      },
      /** @param {string} k */
      remove: function (k) {
        memory.delete(k);
        try { if (storage) storage.removeItem(k); } catch (e) { /* ignora */ }
      },
    };
  }

  /** O próprio acesso a window.sessionStorage pode lançar SecurityError. @param {any} [win] */
  function session(win) {
    var w = win || (typeof window !== 'undefined' ? window : undefined);
    var s;
    try { s = w ? w.sessionStorage : undefined; } catch (e) { s = undefined; }
    return safe(s);
  }

  return { safe: safe, session: session };
})();
