/* maksō — data por extenso, Google Agenda e .ics (navegador, Apps Script V8 e Node).
 * Usa o global MaksoEventState na hora da chamada. */
// @ts-check
var MaksoCalendar = (function () {
  'use strict';

  var WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
    'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var TZ = 'America/Sao_Paulo';

  /** @param {number} n */
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /** @param {Date} d  ex.: 20261212T230000Z */
  function utcStamp(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }

  /** @param {MaksoEvent} event */
  function range(event) {
    var start = MaksoEventState.parseDate(event.start);
    if (!start) return null;
    var end = MaksoEventState.eventEnd({ event: event });
    return { start: start, end: /** @type {Date} */ (end) };
  }

  /** @param {MaksoEvent} event @returns {{date: string, time: string}|null} */
  function formatWhen(event) {
    var start = MaksoEventState.parseDate(event.start);
    if (!start) return null;
    var p = MaksoEventState.toLocalParts(start);
    return {
      date: WEEKDAYS[p.weekday] + ', ' + p.d + ' de ' + MONTHS[p.m - 1],
      time: p.hh + 'h' + (p.mm ? pad(p.mm) : ''),
    };
  }

  /** Formato do convite: "10 . 12 . 2026" e "19h" (ou "19h30") — sempre assim, nunca 19:30.
   * @param {MaksoEvent} event @returns {{date: string, time: string}|null} */
  function formatShort(event) {
    var start = MaksoEventState.parseDate(event.start);
    if (!start) return null;
    var p = MaksoEventState.toLocalParts(start);
    return {
      date: pad(p.d) + ' . ' + pad(p.m) + ' . ' + p.y,
      time: p.hh + 'h' + (p.mm ? pad(p.mm) : ''),
    };
  }

  /** @param {MaksoEvent} event */
  function placeLine(event) {
    return [event.venueName, event.address].filter(Boolean).join(', ');
  }

  /** @param {MaksoEvent} event */
  function details(event) {
    var lines = [];
    if (event.description) lines.push(event.description);
    var place = placeLine(event);
    if (place) lines.push(place);
    if (event.mapsUrl) lines.push(event.mapsUrl);
    if (event.dressCode) lines.push('Traje: ' + event.dressCode);
    return lines.join('\n\n');
  }

  /** @param {MaksoEvent} event @returns {string|null} */
  function googleCalendarUrl(event) {
    var r = range(event);
    if (!r) return null;
    var enc = encodeURIComponent;
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + enc(event.title) +
      '&dates=' + enc(utcStamp(r.start) + '/' + utcStamp(r.end)) +
      '&details=' + enc(details(event)) +
      '&location=' + enc(placeLine(event)) +
      '&ctz=' + enc(TZ);
  }

  /** Escape de TEXT (RFC 5545 §3.3.11). @param {string} s */
  function icsText(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  /** @param {string} ch */
  function bytesOf(ch) {
    var c = ch.codePointAt(0) || 0;
    return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }

  /** Dobra em até 75 bytes UTF-8 sem partir caracteres (RFC 5545 §3.1). @param {string} line */
  function fold(line) {
    var out = [];
    var current = '';
    var size = 0;
    var limit = 75;
    for (var ch of Array.from(line)) {
      var b = bytesOf(ch);
      if (size + b > limit) {
        out.push(current);
        current = ' ';
        size = 1;
        limit = 75;
      }
      current += ch;
      size += b;
    }
    out.push(current);
    return out.join('\r\n');
  }

  /** UID estável do evento (igual no .ics do site e no do e-mail). @param {MaksoEvent} event */
  function eventUid(event) {
    var start = MaksoEventState.parseDate(event.start);
    return start ? 'lancamento-' + utcStamp(start) + '@makso' : null;
  }

  /** @param {MaksoEvent} event @param {{uid: string, now: Date}} o @returns {string|null} */
  function buildIcs(event, o) {
    var r = range(event);
    if (!r) return null;
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//DIMAK Solucoes//makso//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + o.uid,
      'DTSTAMP:' + utcStamp(o.now),
      'DTSTART:' + utcStamp(r.start),
      'DTEND:' + utcStamp(r.end),
      'SUMMARY:' + icsText(event.title),
    ];
    var place = placeLine(event);
    if (place) lines.push('LOCATION:' + icsText(place));
    var desc = details(event);
    if (desc) lines.push('DESCRIPTION:' + icsText(desc));
    if (event.mapsUrl) lines.push('URL:' + event.mapsUrl);
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  return {
    formatWhen: formatWhen,
    formatShort: formatShort,
    googleCalendarUrl: googleCalendarUrl,
    buildIcs: buildIcs,
    eventUid: eventUid,
    placeLine: placeLine,
  };
})();

