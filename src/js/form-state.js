/* maksō — estado do formulário como redutor puro (testável em Node).
 * Toda mudança de tela passa por reduce(); form.js só desenha o estado. */
// @ts-check
var MaksoFormState = (function () {
  'use strict';

  /** Campos que existem no formulário (erros só podem apontar para eles). */
  var FIELDS = ['nome', 'email', 'whatsapp', 'presenca', 'acompanhanteNome', 'restricao', 'observacao']; // ordem da tela 2

  /**
   * @typedef {{kind: 'confirmado'|'recusado'|'ja_respondeu'|'encerrado', nome: string, email: string}} Result
   * @typedef {{page: RsvpState, phase: 'editando'|'enviando'|'concluido', presenca: null|'sim'|'nao',
   *   companion: boolean, errors: Record<string, string>, status: null|'erro'|'em_breve', result: Result|null}} State
   */

  /** @param {RsvpState} page @returns {State} */
  function initialState(page) {
    return {
      page: page,
      phase: 'editando',
      presenca: null,
      companion: false,
      errors: {},
      status: page === 'em_breve' ? 'em_breve' : null,
      result: null,
    };
  }

  /** @param {Record<string, string>} errors @param {string} key */
  function without(errors, key) {
    if (!(key in errors)) return errors;
    /** @type {Record<string, string>} */
    var out = {};
    Object.keys(errors).forEach(function (k) { if (k !== key) out[k] = errors[k]; });
    return out;
  }

  /** @param {State} s @param {Partial<State>} patch @returns {State} */
  function with_(s, patch) { return Object.assign({}, s, patch); }

  /** @param {State} s */
  function failed(s) { return with_(s, { phase: 'editando', status: 'erro' }); }

  /** @param {State} s @param {any} ev */
  function respond(s, ev) {
    var res = ev.res;
    /** @param {Result['kind']} kind */
    var done = function (kind) {
      return with_(s, { phase: 'concluido', status: null, errors: {}, result: { kind: kind, nome: ev.nome || '', email: ev.email || '' } });
    };
    if (res && res.ok === true) {
      switch (res.status) {
        case 'confirmado': return done('confirmado');
        case 'recusado': return done('recusado');
        default: return failed(s);
      }
    }
    switch (res && res.code) {
      case 'ja_respondeu': return done('ja_respondeu');
      case 'encerrado': return done('encerrado');
      case 'invalido': {
        var campos = res.campos && typeof res.campos === 'object' ? res.campos : {};
        var keys = Object.keys(campos);
        if (!keys.length || keys.some(function (k) { return FIELDS.indexOf(k) < 0; })) return failed(s);
        return with_(s, { phase: 'editando', status: null, errors: campos });
      }
      default: return failed(s);
    }
  }

  /** @param {State} s @param {any} ev @returns {State} */
  function reduce(s, ev) {
    switch (ev && ev.type) {
      case 'choose':
        if (s.phase !== 'editando') return s;
        return with_(s, {
          presenca: ev.presenca,
          companion: ev.presenca === 'nao' ? false : s.companion,
          errors: without(s.errors, 'presenca'),
        });
      case 'toggleCompanion':
        if (s.phase !== 'editando') return s;
        return with_(s, {
          companion: !!ev.on && s.presenca !== 'nao',
          errors: ev.on ? s.errors : without(s.errors, 'acompanhanteNome'),
        });
      case 'edit':
        return with_(s, { errors: without(s.errors, ev.field) });
      case 'invalid':
        return with_(s, { errors: ev.fields || {}, status: s.status === 'erro' ? null : s.status });
      case 'submit':
        if (s.phase !== 'editando' || s.page !== 'aberto') return s;
        return with_(s, { phase: 'enviando', errors: {}, status: null });
      case 'response':
        if (s.phase !== 'enviando') return s;
        return respond(s, ev);
      default:
        return s;
    }
  }

  return { FIELDS: FIELDS, initialState: initialState, reduce: reduce };
})();
