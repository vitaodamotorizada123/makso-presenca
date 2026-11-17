/* maksō — prazo e estado da página (navegador, Apps Script V8 e Node).
 * Fuso fixo −03:00: o Brasil não tem horário de verão desde 2019. */
// @ts-check
var MaksoEventState = (function () {
  'use strict';

  var OFFSET_MINUTES = -180;
  var DAY = 24 * 60 * 60 * 1000;
  var HOUR = 60 * 60 * 1000;

  /** @param {unknown} s @returns {Date|null} */
  function parseDate(s) {
    if (typeof s !== 'string' || !s) return null;
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  /** Hora de parede em −03:00. weekday: 0 = domingo. @param {Date} d */
  function toLocalParts(d) {
    var l = new Date(d.getTime() + OFFSET_MINUTES * 60 * 1000);
    return {
      y: l.getUTCFullYear(),
      m: l.getUTCMonth() + 1,
      d: l.getUTCDate(),
      hh: l.getUTCHours(),
      mm: l.getUTCMinutes(),
      weekday: l.getUTCDay(),
    };
  }

  /** @param {{rsvpDeadline?: string|null, event?: {start?: string|null}}} cfg */
  function resolveDeadline(cfg) {
    var explicit = parseDate(cfg.rsvpDeadline);
    if (explicit) return explicit;
    var start = parseDate(cfg.event && cfg.event.start);
    return start ? new Date(start.getTime() - 3 * DAY) : null;
  }

  /** @param {{event?: {start?: string|null, end?: string|null}}} cfg */
  function eventEnd(cfg) {
    var end = parseDate(cfg.event && cfg.event.end);
    if (end) return end;
    var start = parseDate(cfg.event && cfg.event.start);
    return start ? new Date(start.getTime() + 4 * HOUR) : null;
  }

  /**
   * @param {{now: Date, cfg: {rsvpDeadline?: string|null, event?: {start?: string|null, end?: string|null}}, hasEndpoint: boolean}} o
   * @returns {RsvpState}
   */
  function getRsvpState(o) {
    var end = eventEnd(o.cfg);
    if (end && o.now.getTime() >= end.getTime()) return 'passado';
    var deadline = resolveDeadline(o.cfg);
    if (deadline && o.now.getTime() > deadline.getTime()) return 'encerrado';
    if (!o.hasEndpoint) return 'em_breve';
    return 'aberto';
  }

  return {
    OFFSET_MINUTES: OFFSET_MINUTES,
    parseDate: parseDate,
    toLocalParts: toLocalParts,
    resolveDeadline: resolveDeadline,
    eventEnd: eventEnd,
    getRsvpState: getRsvpState,
  };
})();

