/* maksō — envio da confirmação ao Apps Script, modo demonstração e id. */
// @ts-check
var MaksoApi = (function () {
  'use strict';

  var SCENARIOS = ['ja_respondeu', 'erro', 'invalido', 'encerrado', 'passado'];
  /** @type {ServerResponse} */
  var ERRO = { ok: false, code: 'erro' };

  /** @param {{hostname: string, search: string}} loc */
  function detectDemo(loc) {
    var params = new URLSearchParams(loc.search || '');
    var local = /^(localhost|127\.0\.0\.1)$/.test(loc.hostname || '');
    var demo = params.get('demo') === '1' || local;
    var sc = params.get('cenario');
    return { demo: demo, scenario: demo && sc && SCENARIOS.indexOf(sc) > -1 ? sc : null };
  }

  /** @param {number} n */
  function hex(n) { return (n < 16 ? '0' : '') + n.toString(16); }

  /** UUID v4. @param {any} [cryptoObj] */
  function makeId(cryptoObj) {
    var c = arguments.length ? cryptoObj : (typeof crypto !== 'undefined' ? crypto : undefined);
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    var b = new Uint8Array(16);
    if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
    else for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, hex).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  /** Só as formas do contrato (spec, seção 7); o resto é erro. @param {any} json @returns {ServerResponse} */
  function parseResponse(json) {
    if (!json || typeof json !== 'object') return ERRO;
    if (json.ok === true && (json.status === 'confirmado' || json.status === 'recusado')) {
      return { ok: true, status: json.status };
    }
    if (json.ok === false) {
      if (json.code === 'ja_respondeu' || json.code === 'encerrado' || json.code === 'erro') return { ok: false, code: json.code };
      if (json.code === 'invalido') {
        /** @type {Record<string, string>} */
        var campos = {};
        if (json.campos && typeof json.campos === 'object') {
          Object.keys(json.campos).forEach(function (k) {
            if (typeof json.campos[k] === 'string') campos[k] = json.campos[k];
          });
        }
        return { ok: false, code: 'invalido', campos: campos };
      }
    }
    return ERRO;
  }

  /** @param {{presenca?: string}} payload @param {string|null} scenario @returns {ServerResponse} */
  function demoResponse(payload, scenario) {
    switch (scenario) {
      case 'ja_respondeu': return { ok: false, code: 'ja_respondeu' };
      case 'erro': return ERRO;
      case 'invalido': return { ok: false, code: 'invalido', campos: { email: 'Informe um e-mail válido.' } };
      case 'encerrado': return { ok: false, code: 'encerrado' };
      default: return { ok: true, status: payload.presenca === 'nao' ? 'recusado' : 'confirmado' };
    }
  }

  /**
   * @param {Record<string, unknown>} payload
   * @param {{endpoint: string, demo: boolean, scenario?: string|null, fetchImpl?: typeof fetch, timeoutMs?: number}} o
   * @returns {Promise<ServerResponse>}
   */
  function submit(payload, o) {
    if (o.demo) {
      var g = /** @type {any} */ (globalThis);
      g.__maksoSubmitCount = (g.__maksoSubmitCount || 0) + 1;
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(demoResponse(payload, o.scenario || null)); }, 900);
      });
    }
    var fetchImpl = o.fetchImpl || fetch;
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    /** @type {any} */
    var timer;
    /** @type {Promise<ServerResponse>} */
    var timeout = new Promise(function (resolve) {
      timer = setTimeout(function () {
        if (controller) controller.abort();
        resolve(ERRO);
      }, o.timeoutMs || 15000);
    });
    /** @type {Promise<ServerResponse>} */
    var request = Promise.resolve()
      .then(function () {
        return fetchImpl(o.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          redirect: 'follow',
          credentials: 'omit',
          signal: controller ? controller.signal : undefined,
        });
      })
      .then(function (r) {
        if (!r.ok) return ERRO;
        return r.text().then(function (t) {
          try { return parseResponse(JSON.parse(t)); } catch (e) { return ERRO; }
        });
      })
      .catch(function () { return ERRO; });
    return Promise.race([request, timeout]).then(function (res) {
      clearTimeout(timer);
      return res;
    });
  }

  return { detectDemo: detectDemo, makeId: makeId, parseResponse: parseResponse, submit: submit, ERRO: ERRO };
})();
