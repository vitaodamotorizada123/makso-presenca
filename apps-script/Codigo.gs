/* Gerado por scripts/build.mjs — reserva usada quando o site não responde. */
var MAKSO_CONFIG = {
  "siteUrl": "https://makso.onrender.com",
  "appsScriptUrl": "https://script.google.com/macros/s/AKfycbxkxEX4P4fkSfTUISTCtJ4Tqct6fjsKhePWCiVDLWuGzQCzOE8Etq1TeclX2KSX4vFfkg/exec",
  "rsvpDeadline": null,
  "event": {
    "title": "Lançamento maksō",
    "start": "2026-12-10T19:30:00-03:00",
    "end": null,
    "venueName": "",
    "address": "Rua San Marino, 588 – Vila Castela, Nova Lima – MG",
    "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Rua%20San%20Marino%2C%20588%2C%20Vila%20Castela%2C%20Nova%20Lima%20-%20MG",
    "dressCode": "",
    "description": "Você está convidado para o lançamento da maksō."
  },
  "umamiWebsiteId": "d475ff6c-e0b4-446d-9691-4845d03b6c44",
  "adobeFontsKitId": "",
  "version": "98da5189"
};
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
    if (digits.indexOf('00') === 0) digits = digits.slice(2);            // 0055… (discagem internacional)
    if (digits.indexOf('550') === 0 && (digits.length === 13 || digits.length === 14)) digits = '55' + digits.slice(3); // +55 031…
    if (digits.charAt(0) === '0') digits = digits.slice(1);              // 031… (interurbano)
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

/* maksō — núcleo da confirmação (Apps Script V8).
 * Puro: tudo que fala com o Google chega por `deps` (ver Code.js).
 * Usa os globais MaksoRules e MaksoEventState na hora da chamada. */

/**
 * @param {unknown} rawBody corpo da requisição (texto JSON)
 * @param {{store: any, mailer: any, lock: any, rate: any, now: () => Date, cfg: any, log: any}} deps
 * @returns {{ok: true, status: string} | {ok: false, code: string, campos?: Object}}
 */
function handleSubmission(rawBody, deps) {
  var INVALIDO = { ok: false, code: 'invalido' };
  var ERRO = { ok: false, code: 'erro' };

  // 1. Corpo: precisa ser texto, até 10 KB, JSON de objeto.
  if (typeof rawBody !== 'string' || MaksoRules.utf8Bytes(rawBody) > MaksoRules.LIMITS.bodyBytes) return INVALIDO;
  var raw;
  try { raw = JSON.parse(rawBody); } catch (e) { return INVALIDO; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return INVALIDO;

  var statusOf = function (presenca) { return presenca === 'nao' ? 'recusado' : 'confirmado'; };

  // 2. Antispam: responde ok sem gravar, para o robô não aprender. 800 ms é
  //    impossível para uma pessoa (rolar até o formulário e preencher); o
  //    descarte vai para o log com o contato, para dar para recuperar.
  if ((typeof raw.hp === 'string' && raw.hp !== '') || typeof raw.t !== 'number' || raw.t < 800) {
    deps.log.warn('antispam: descartado', JSON.stringify({ nome: raw.nome, email: raw.email, whatsapp: raw.whatsapp, t: raw.t, hp: !!raw.hp }));
    return { ok: true, status: statusOf(raw.presenca) };
  }

  // 3. Validação (as mesmas regras do navegador).
  var v = MaksoRules.validateSubmission(raw);
  if (!v.ok) return { ok: false, code: 'invalido', campos: v.fields };
  var sub = v.value;

  // 4. Prazo.
  var page = MaksoEventState.getRsvpState({ now: deps.now(), cfg: deps.cfg, hasEndpoint: true });
  if (page === 'encerrado' || page === 'passado') return { ok: false, code: 'encerrado' };

  // 5. Limite global de envios.
  try {
    if (!deps.rate.hit()) {
      deps.log.warn('limite de envios atingido', sub.id);
      return ERRO;
    }
  } catch (e) {
    deps.log.error('rate', sub.id, e);
  }

  // 6–9. Sob lock: idempotência, duplicidade e gravação.
  var record;
  var acquired = false;
  try {
    deps.lock.acquire(10000);
    acquired = true;
    var existing = deps.store.findExisting(sub.id, sub.email, sub.whatsapp);
    if (existing.byId) return { ok: true, status: statusOf(existing.byId.presenca) };
    if (existing.byContact) return { ok: false, code: 'ja_respondeu' };

    var emailStatus = 'n.a.';
    if (sub.presenca === 'sim') emailStatus = deps.mailer.remainingQuota() > 0 ? 'enviando' : 'pendente';
    record = Object.assign({}, sub, { createdAt: deps.now(), emailStatus: emailStatus });
    deps.store.append(record);
  } catch (e) {
    deps.log.error('gravação', sub.id, e);
    return ERRO;
  } finally {
    if (acquired) {
      try { deps.lock.release(); } catch (e) { /* lock já expirou */ }
    }
  }

  // 10. E-mail fora do lock (lento). Falha aqui não derruba a confirmação.
  if (record.emailStatus === 'enviando') {
    var final = 'enviado';
    try {
      deps.mailer.send(record, deps.cfg);
    } catch (e) {
      var semCota = false;
      try { semCota = deps.mailer.remainingQuota() <= 0; } catch (e2) { /* ignora */ }
      final = semCota ? 'pendente' : 'falhou';
      if (!semCota) deps.log.error('e-mail', sub.id, e);
    }
    setEmailStatusLocked(deps, sub.id, final);
  }

  return { ok: true, status: statusOf(sub.presenca) };
}

/** Atualiza o status do e-mail com um lock curto (a linha é achada pelo ID). */
function setEmailStatusLocked(deps, id, status) {
  var acquired = false;
  try {
    deps.lock.acquire(5000);
    acquired = true;
    deps.store.setEmailStatus(id, status);
  } catch (e) {
    deps.log.error('status do e-mail', id, e);
  } finally {
    if (acquired) {
      try { deps.lock.release(); } catch (e) { /* ignora */ }
    }
  }
}
/* maksō — leitura e escrita na planilha "Respostas" (Apps Script V8).
 * Colunas achadas pelo cabeçalho a cada operação (inserir colunas não quebra).
 * Linhas achadas pelo ID (ordenar a planilha não quebra). */

var COLUMNS = ['Data/hora', 'Presença', 'Nome', 'E-mail', 'WhatsApp', 'Acompanhante', 'Nome do acompanhante',
  'Restrição alimentar', 'Observação', 'E-mail (status)', 'E-mail atualizado em', 'ID'];
var SHEET_NAME = 'Respostas';

function createSheetStore(sheet) {
  function headerMap() {
    var width = sheet.getLastColumn();
    var header = width ? sheet.getRange(1, 1, 1, width).getValues()[0] : [];
    var map = {};
    header.forEach(function (h, i) { map[String(h).trim()] = i; });
    COLUMNS.forEach(function (c) {
      if (!(c in map)) throw new Error('Coluna "' + c + '" não encontrada na aba ' + SHEET_NAME + '. Rode setup() de novo.');
    });
    return { map: map, width: width };
  }

  function rows(width) {
    var last = sheet.getLastRow();
    return last < 2 ? [] : sheet.getRange(2, 1, last - 1, width).getValues();
  }

  /** Texto do convidado entra literal: o apóstrofo impede o Sheets de virar
   *  fórmula (=), hora (21:30), data (10/12), % ou número (0800), e fica oculto. */
  function asText(v) {
    var s = v == null ? '' : String(v);
    return s ? "'" + s : '';
  }

  /** O Sheets pode devolver número (WhatsApp) ou texto com apóstrofo. */
  function text(v) {
    var s = v == null ? '' : String(v);
    return s.charAt(0) === "'" ? s.slice(1) : s;
  }

  function toRecord(row, m) {
    var updated = row[m['E-mail atualizado em']];
    return {
      id: text(row[m['ID']]),
      presenca: text(row[m['Presença']]) === 'Vou' ? 'sim' : 'nao',
      nome: text(row[m['Nome']]),
      email: MaksoRules.normalizeEmail(text(row[m['E-mail']])),
      whatsapp: MaksoRules.normalizeWhatsapp(text(row[m['WhatsApp']])),
      acompanhante: text(row[m['Acompanhante']]) === 'Sim',
      acompanhanteNome: text(row[m['Nome do acompanhante']]),
      emailStatus: text(row[m['E-mail (status)']]),
      updatedAt: updated instanceof Date ? updated : (updated ? new Date(updated) : null),
    };
  }

  function rowIndexById(id, m, width) {
    var all = rows(width);
    for (var i = 0; i < all.length; i++) if (text(all[i][m['ID']]) === id) return i + 2;
    return -1;
  }

  function setStatusAt(rowIndex, m, status, now) {
    sheet.getRange(rowIndex, m['E-mail (status)'] + 1).setValue(status);
    sheet.getRange(rowIndex, m['E-mail atualizado em'] + 1).setValue(now || new Date());
  }

  return {
    findExisting: function (id, email, whatsapp) {
      var h = headerMap();
      var byId = null;
      var byContact = null;
      rows(h.width).forEach(function (row) {
        var r = toRecord(row, h.map);
        if (!byId && r.id === id) byId = r;
        if (!byContact && ((email && r.email === email) || (whatsapp && r.whatsapp === whatsapp))) byContact = r;
      });
      return { byId: byId, byContact: byContact };
    },

    append: function (rec) {
      var h = headerMap();
      var row = [];
      for (var i = 0; i < h.width; i++) row.push('');
      var put = function (col, v) { row[h.map[col]] = v; };
      put('Data/hora', rec.createdAt);
      put('Presença', rec.presenca === 'sim' ? 'Vou' : 'Não vou');
      put('Nome', asText(rec.nome));
      put('E-mail', asText(rec.email));
      put('WhatsApp', asText(rec.whatsapp));
      put('Acompanhante', rec.acompanhante ? 'Sim' : 'Não');
      put('Nome do acompanhante', asText(rec.acompanhanteNome));
      put('Restrição alimentar', asText(rec.restricao));
      put('Observação', asText(rec.observacao));
      put('E-mail (status)', rec.emailStatus);
      put('E-mail atualizado em', rec.createdAt);
      put('ID', asText(rec.id));
      sheet.appendRow(row);
    },

    /** Vários status com uma leitura só (a fila não segura o lock por muito tempo). */
    setEmailStatuses: function (pairs) {
      if (!pairs.length) return;
      var h = headerMap();
      var all = rows(h.width);
      var index = {};
      all.forEach(function (row, i) { index[text(row[h.map['ID']])] = i + 2; });
      var now = new Date();
      pairs.forEach(function (p) {
        var at = index[p[0]];
        if (at) setStatusAt(at, h.map, p[1], now);
      });
    },

    setEmailStatus: function (id, status) {
      var h = headerMap();
      var at = rowIndexById(id, h.map, h.width);
      if (at < 0) throw new Error('ID não encontrado: ' + id);
      setStatusAt(at, h.map, status, new Date());
    },

    /** Marca até `max` linhas "pendente" como "enviando" e devolve os registros. */
    claimPending: function (max, now) {
      if (!(max > 0)) return [];
      var h = headerMap();
      var claimed = [];
      rows(h.width).forEach(function (row, i) {
        if (claimed.length >= max) return;
        var r = toRecord(row, h.map);
        if (r.emailStatus === 'pendente' && r.presenca === 'sim') {
          setStatusAt(i + 2, h.map, 'enviando', now);
          claimed.push(r);
        }
      });
      return claimed;
    },

    /** "enviando" há mais de `minutes` (o script morreu no meio) volta para "pendente". */
    releaseStale: function (minutes, now) {
      var h = headerMap();
      var limit = now.getTime() - minutes * 60 * 1000;
      rows(h.width).forEach(function (row, i) {
        var r = toRecord(row, h.map);
        if (r.emailStatus === 'enviando' && (!r.updatedAt || r.updatedAt.getTime() < limit)) {
          setStatusAt(i + 2, h.map, 'pendente', now);
        }
      });
    },
  };
}
/* maksō — config do evento lida do site (event.json), com cache de 10 min.
 * Assim, mudar data/local/prazo no config.json e publicar o site basta:
 * o script não precisa ser colado de novo. Sem site, usa o MAKSO_CONFIG embutido. */

var CONFIG_CACHE_KEY = 'makso-config';

function isValidConfig_(c) {
  if (!c || typeof c !== 'object' || !c.event || typeof c.event !== 'object') return false;
  var okDate = function (v) { return v === null || v === undefined || (typeof v === 'string' && !isNaN(Date.parse(v))); };
  return okDate(c.rsvpDeadline) && okDate(c.event.start) && okDate(c.event.end) && typeof c.event.title === 'string';
}

/** @param {{fetch: function(string): {code: number, text: string}, cache: any, fallback: any, log?: any}} o */
function loadConfig(o) {
  try {
    var cached = o.cache.get(CONFIG_CACHE_KEY);
    if (cached) {
      var c = JSON.parse(cached);
      if (isValidConfig_(c)) return c;
    }
  } catch (e) { /* cache corrompido: busca de novo */ }
  try {
    var r = o.fetch(String(o.fallback.siteUrl).replace(/\/$/, '') + '/event.json');
    if (r.code === 200) {
      var fresh = JSON.parse(r.text);
      if (isValidConfig_(fresh)) {
        o.cache.put(CONFIG_CACHE_KEY, JSON.stringify(fresh), 600);
        return fresh;
      }
    }
  } catch (e) {
    if (o.log) o.log.warn('event.json indisponível, usando a config embutida', e);
  }
  return o.fallback;
}
/* maksō — e-mail de confirmação (HTML com estilos inline + texto), no desenho do "obrigado" do site. */

function escapeHtml_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Mesmas informações da tela final do site (sem acompanhantes: convites individuais). */
var EMAIL_INFO_ = [
  ['Horário de início', 'Devido ao trânsito na região, sugerimos sair com antecedência para chegar com tranquilidade e aproveitar desde o início.'],
  ['Chuva', 'Se chover, fique tranquila. Haverá uma pessoa na entrada para recebê-la com guarda-chuva e acompanhá-la até a porta do evento.'],
  ['Estacionamento', 'Há vagas para estacionar na rua.'],
  ['Acesso ao endereço', 'O evento acontece dentro de um condomínio fechado. Seu nome estará em uma lista de autorização na portaria. Ao chegar, basta informar seu nome completo e os demais dados ou documentos que lhe forem solicitados no momento.'],
  ['Dúvidas', 'Para outras dúvidas e mais informações, entre em contato pelo número (31) 98727-2711.'],
];

function renderEmail(record, cfg) {
  var ev = cfg.event;
  var first = String(record.nome || '').trim().split(/\s+/)[0] || '';
  var short = MaksoCalendar.formatShort(ev);
  var gcal = MaksoCalendar.googleCalendarUrl(ev);
  var e = escapeHtml_;
  var BG = '#24151f';
  var CREAM = '#e1dad0';
  var MUTED = '#b6a5af';
  var LINE = '#57434f';
  var SANS = "Poppins,'Helvetica Neue',Arial,sans-serif";
  var SERIF = SANS;
  var SCRIPT = "'Petit Formal Script','Snell Roundhand',cursive";

  var street = (ev.address || '').split(' – ')[0];

  var info = EMAIL_INFO_.map(function (it) {
    var body = e(it[1]).replace('(31) 98727-2711', '<a href="tel:+5531987272711" style="color:' + CREAM + ';">(31) 98727-2711</a>');
    return '<p style="margin:18px 0 0;font:13px/1.4 ' + SANS + ';letter-spacing:1.5px;text-transform:uppercase;color:' + CREAM + ';">' + e(it[0]) + '</p>' +
      '<p style="margin:4px 0 0;font:15px/1.5 ' + SANS + ';color:' + MUTED + ';">' + body + '</p>';
  }).join('');

  var button = gcal
    ? '<p style="margin:36px 0 0;"><a href="' + e(gcal) + '" style="display:inline-block;padding:14px 28px;border-radius:999px;background:' + CREAM + ';color:' + BG + ';font:14px ' + SANS + ';letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;">Adicionar à agenda</a></p>' +
      '<p style="margin:12px 0 0;font:13px/1.4 ' + SANS + ';color:' + MUTED + ';">Usa Apple Calendar ou Outlook? Abra o anexo convite-makso.ics.</p>'
    : '';

  var html = '<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:' + BG + ';">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + BG + ';"><tr><td align="center" style="padding:48px 24px;">' +
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;">' +
    '<tr><td align="center">' +
    '<p style="margin:0;font:17px/1.4 ' + SANS + ';color:' + CREAM + ';">Olá, ' + e(first) + '. Sua presença foi confirmada.</p>' +
    '<p style="margin:48px 0 0;font:400 28px/1.45 ' + SCRIPT + ';color:' + CREAM + ';">Prepare-se para desvendar as bolsas mais icônicas que você já viu!</p>' +
    (short ? '<p style="margin:48px 0 0;font:300 20px/1.6 ' + SANS + ';color:' + CREAM + ';">' + e(short.date) + '<br>' + e(short.time) + '</p>' : '<p style="margin:48px 0 0;font:17px/1.5 ' + SANS + ';color:' + MUTED + ';">Data e local serão enviados em breve.</p>') +
    (street ? '<p style="margin:0;font:300 20px/1.6 ' + SANS + ';">' + (ev.mapsUrl ? '<a href="' + e(ev.mapsUrl) + '" style="color:' + CREAM + ';text-decoration:none;">' + e(street) + '</a>' : '<span style="color:' + CREAM + ';">' + e(street) + '</span>') + '</p>' : '') +
    (ev.dressCode ? '<p style="margin:6px 0 0;font:300 18px/1.5 ' + SANS + ';color:' + CREAM + ';">Traje: ' + e(ev.dressCode) + '</p>' : '') +
    '<p style="margin:48px 0 0;font:300 40px ' + SERIF + ';letter-spacing:8px;color:' + CREAM + ';">MAKSŌ</p>' +
    button +
    '</td></tr>' +
    '<tr><td style="padding:48px 0 0;border-bottom:1px solid ' + LINE + ';"></td></tr>' +
    '<tr><td align="left" style="padding:24px 0 0;">' +
    '<p style="margin:0;font:13px ' + SANS + ';letter-spacing:1.5px;text-transform:uppercase;color:' + CREAM + ';">Informações importantes</p>' +
    info +
    '</td></tr></table>' +
    '<p style="margin:40px 0 0;font:12px ' + SANS + ';color:' + MUTED + ';">Desenvolvido por DIMAK Soluções</p>' +
    '</td></tr></table></body></html>';

  var lines = [];
  if (short) lines.push(short.date, short.time);
  if (street) lines.push(street + (ev.mapsUrl ? ' (' + ev.mapsUrl + ')' : ''));
  if (ev.dressCode) lines.push('Traje: ' + ev.dressCode);
  if (!short) lines.push('Data e local serão enviados em breve.');

  var text = ['Olá, ' + first + '. Sua presença foi confirmada.', '', 'Prepare-se para desvendar as bolsas mais icônicas que você já viu!', '']
    .concat(lines)
    .concat(gcal ? ['', 'Adicionar à agenda: ' + gcal] : [])
    .concat(['', 'Informações importantes'])
    .concat(EMAIL_INFO_.map(function (it) { return '- ' + it[0] + ': ' + it[1]; }))
    .concat(['', '—', 'Desenvolvido por DIMAK Soluções'])
    .join('\n');

  return { subject: 'Presença confirmada — lançamento maksō', html: html, text: text };
}
/* maksō — envio de e-mail e fila de pendentes (claim-then-send). */

function createMailer() {
  return {
    remainingQuota: function () { return MailApp.getRemainingDailyQuota(); },
    send: function (record, cfg) {
      var m = renderEmail(record, cfg);
      var opts = { to: record.email, subject: m.subject, htmlBody: m.html, body: m.text, name: 'maksō' };
      var uid = MaksoCalendar.eventUid(cfg.event);
      var ics = uid ? MaksoCalendar.buildIcs(cfg.event, { uid: uid, now: new Date() }) : null;
      if (ics) opts.attachments = [Utilities.newBlob(ics, 'text/calendar', 'convite-makso.ics')];
      MailApp.sendEmail(opts);
    },
  };
}

/** Gatilho de hora em hora. Nunca segura o lock enquanto envia. */
function processPendingEmails() {
  var deps = getDeps_();
  var claimed = [];
  deps.lock.acquire(10000);
  try {
    deps.store.releaseStale(15, deps.now());
    claimed = deps.store.claimPending(deps.mailer.remainingQuota(), deps.now());
  } finally {
    deps.lock.release();
  }
  if (!claimed.length) return;

  var results = claimed.map(function (r) {
    try {
      deps.mailer.send(r, deps.cfg);
      return [r.id, 'enviado'];
    } catch (e) {
      var semCota = false;
      try { semCota = deps.mailer.remainingQuota() <= 0; } catch (e2) { /* ignora */ }
      if (!semCota) deps.log.error('e-mail (fila)', r.id, e);
      return [r.id, semCota ? 'pendente' : 'falhou'];
    }
  });

  deps.lock.acquire(10000);
  try {
    deps.store.setEmailStatuses(results);
  } finally {
    deps.lock.release();
  }
}
/* maksō — pontos de entrada do web app e da instalação.
 * doPost: recebe a confirmação do site. doGet: verificação de saúde.
 * setup: rode uma vez no editor para criar a planilha e o gatilho. */

var SUMMARY = [
  ['Confirmados', '=COUNTIF(Respostas!B:B,"Vou")'],
  ['Acompanhantes', '=COUNTIFS(Respostas!B:B,"Vou",Respostas!F:F,"Sim")'],
  ['Total de pessoas', '=B1+B2'],
  ['Não vão', '=COUNTIF(Respostas!B:B,"Não vou")'],
  ['E-mails pendentes', '=COUNTIF(Respostas!J:J,"pendente")'],
  ['E-mails com falha', '=COUNTIF(Respostas!J:J,"falhou")'],
];

function log_() {
  return {
    error: function () { console.error.apply(console, arguments); },
    warn: function () { console.warn.apply(console, arguments); },
  };
}

function getConfig_() {
  return loadConfig({
    fetch: function (url) {
      var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      return { code: r.getResponseCode(), text: r.getContentText() };
    },
    cache: CacheService.getScriptCache(),
    fallback: MAKSO_CONFIG,
    log: log_(),
  });
}

/** Limite global suave: 60 confirmações a cada 10 minutos. */
function createRate_(cache, now) {
  return {
    hit: function () {
      var key = 'rate:' + Math.floor(now().getTime() / 600000);
      var n = Number(cache.get(key) || 0) + 1;
      cache.put(key, String(n), 900);
      return n <= 60;
    },
  };
}

function getDeps_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Planilha não configurada: rode setup() no editor do Apps Script.');
  var sheet = SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Aba "' + SHEET_NAME + '" não encontrada: rode setup() de novo.');
  var lock = LockService.getScriptLock();
  var now = function () { return new Date(); };
  return {
    store: createSheetStore(sheet),
    mailer: createMailer(),
    lock: {
      acquire: function (ms) { lock.waitLock(ms); },
      // A documentação do Lock pede flush antes de soltar: senão a próxima
      // execução pode não ver a linha recém-gravada (duplicidade).
      release: function () { SpreadsheetApp.flush(); lock.releaseLock(); },
    },
    rate: createRate_(CacheService.getScriptCache(), now),
    now: now,
    cfg: getConfig_(),
    log: log_(),
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = e && e.postData ? e.postData.contents : undefined;
  if (typeof body !== 'string') return json_({ ok: false, code: 'invalido' });
  try {
    return json_(handleSubmission(body, getDeps_()));
  } catch (err) {
    console.error('doPost', err);
    return json_({ ok: false, code: 'erro' });
  }
}

function doGet() {
  var cfg = getConfig_();
  return json_({ ok: true, service: 'makso-rsvp', version: cfg.version || MAKSO_CONFIG.version || null });
}

function setup() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create('maksō — Confirmações');
  ss.setSpreadsheetTimeZone('America/Sao_Paulo');

  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  var resumo = ss.getSheetByName('Resumo') || ss.insertSheet('Resumo');
  SUMMARY.forEach(function (row, i) {
    resumo.getRange(i + 1, 1).setValue(row[0]);
    resumo.getRange(i + 1, 2).setFormula(row[1]);
  });

  ss.getSheets().forEach(function (s) {
    var keep = s.getName() === SHEET_NAME || s.getName() === 'Resumo';
    if (!keep && s.getLastRow() === 0) ss.deleteSheet(s);
  });

  props.setProperty('SHEET_ID', ss.getId());
  var exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'processPendingEmails'; });
  if (!exists) ScriptApp.newTrigger('processPendingEmails').timeBased().everyHours(1).create();

  console.log('Planilha pronta: ' + ss.getUrl());
  return ss.getUrl();
}
