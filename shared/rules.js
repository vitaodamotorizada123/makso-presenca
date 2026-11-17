/* maksō — regras compartilhadas (navegador, Apps Script V8 e Node).
 * Script clássico: define o global MaksoRules. Nenhum código de topo
 * depende de outro arquivo. */
// @ts-check
var MaksoRules = (function () {
  'use strict';

  /** Limites [mín, máx] em caracteres (code points); bodyBytes em bytes UTF-8. */
  var LIMITS = {
    nome: [2, 80],
    email: [3, 120],
    acompanhanteNome: [2, 80],
    restricao: [0, 300],
    observacao: [0, 500],
    bodyBytes: 10240,
  };

  var MESSAGES = {
    presenca: 'Escolha se você vai.',
    nome: 'Informe seu nome.',
    email: 'Informe um e-mail válido.',
    whatsapp: 'Informe um WhatsApp com DDD.',
    acompanhanteNome: 'Informe o nome do acompanhante.',
    /** @param {number} max */
    tooLong: function (max) { return 'Texto muito longo (máx. ' + max + ').'; },
    id: 'invalido',
  };

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var FORMULA_RE = /^[=+\-@\t\r]/;

  /** @param {unknown} v */
  function str(v) {
    return typeof v === 'string' ? v.trim() : '';
  }

  /** @param {string} s */
  function length(s) {
    return Array.from(s).length;
  }

  /** @param {unknown} s */
  function normalizeEmail(s) {
    return str(s).toLowerCase();
  }

  /** @param {unknown} v string ou número (o Sheets devolve número) */
  function normalizeWhatsapp(v) {
    var digits = String(v == null ? '' : v).replace(/\D+/g, '');
    if (digits.length === 10 || digits.length === 11) return '55' + digits;
    if ((digits.length === 12 || digits.length === 13) && digits.indexOf('55') === 0) return digits;
    return '';
  }

  /** @param {unknown} s */
  function isUuid(s) {
    return typeof s === 'string' && UUID_RE.test(s);
  }

  /** @param {string} s */
  function utf8Bytes(s) {
    var bytes = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) bytes += 1;
      else if (c < 0x800) bytes += 2;
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) { bytes += 4; i++; }
      else bytes += 3;
    }
    return bytes;
  }

  /** @param {unknown} v */
  function sanitizeCell(v) {
    var s = v == null ? '' : String(v);
    return FORMULA_RE.test(s) ? "'" + s : s;
  }

  /**
   * @param {Record<string, unknown>} raw
   * @returns {{ok: true, value: Submission} | {ok: false, fields: Record<string, string>}}
   */
  function validateSubmission(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    /** @type {Record<string, string>} */
    var fields = {};

    var presenca = r.presenca === 'sim' || r.presenca === 'nao' ? r.presenca : null;
    if (!presenca) fields.presenca = MESSAGES.presenca;

    if (!isUuid(r.id)) fields.id = MESSAGES.id;

    var nome = str(r.nome);
    if (length(nome) < LIMITS.nome[0]) fields.nome = MESSAGES.nome;
    else if (length(nome) > LIMITS.nome[1]) fields.nome = MESSAGES.tooLong(LIMITS.nome[1]);

    var email = normalizeEmail(r.email);
    if (!EMAIL_RE.test(email) || length(email) > LIMITS.email[1]) fields.email = MESSAGES.email;

    var whatsapp = normalizeWhatsapp(r.whatsapp);
    if (!whatsapp) fields.whatsapp = MESSAGES.whatsapp;

    var vai = presenca === 'sim';
    var acompanhante = vai && r.acompanhante === true;
    var acompanhanteNome = acompanhante ? str(r.acompanhanteNome) : '';
    if (acompanhante) {
      if (length(acompanhanteNome) < LIMITS.acompanhanteNome[0]) fields.acompanhanteNome = MESSAGES.acompanhanteNome;
      else if (length(acompanhanteNome) > LIMITS.acompanhanteNome[1]) fields.acompanhanteNome = MESSAGES.tooLong(LIMITS.acompanhanteNome[1]);
    }

    var restricao = vai ? str(r.restricao) : '';
    if (length(restricao) > LIMITS.restricao[1]) fields.restricao = MESSAGES.tooLong(LIMITS.restricao[1]);

    var observacao = str(r.observacao);
    if (length(observacao) > LIMITS.observacao[1]) fields.observacao = MESSAGES.tooLong(LIMITS.observacao[1]);

    if (Object.keys(fields).length) return { ok: false, fields: fields };

    return {
      ok: true,
      value: {
        id: /** @type {string} */ (r.id),
        presenca: /** @type {'sim'|'nao'} */ (presenca),
        nome: nome,
        email: email,
        whatsapp: whatsapp,
        acompanhante: acompanhante,
        acompanhanteNome: acompanhanteNome,
        restricao: restricao,
        observacao: observacao,
      },
    };
  }

  return {
    LIMITS: LIMITS,
    MESSAGES: MESSAGES,
    normalizeEmail: normalizeEmail,
    normalizeWhatsapp: normalizeWhatsapp,
    validateSubmission: validateSubmission,
    sanitizeCell: sanitizeCell,
    isUuid: isUuid,
    utf8Bytes: utf8Bytes,
  };
})();

if (typeof module !== 'undefined') module.exports = MaksoRules;
