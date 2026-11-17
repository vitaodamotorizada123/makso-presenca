// Dublês dos serviços do Google Apps Script, rodando os arquivos de
// apps-script/dist num contexto vm (escopo global compartilhado, como no GAS).
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

/** Planilha: strings só de dígitos viram número (como o Sheets), exceto
 * com apóstrofo na frente (o Sheets guarda como texto e esconde o apóstrofo)
 * ou em coluna com formato '@'. Fórmulas (=...) ficam como { formula }. */
export class FakeSheet {
  constructor(name, gasState) { this.name = name; this.data = []; this.formats = {}; this.frozen = 0; this.reads = 0; this.gas = gasState; }
  touch() { if (this.gas) this.gas.dirty = true; }
  getName() { return this.name; }
  getLastRow() { return this.data.length; }
  getLastColumn() { return this.data.reduce((m, r) => Math.max(m, r.length), 0); }
  getMaxRows() { return 1000; }
  setFrozenRows(n) { this.frozen = n; }
  coerce(v, col) {
    if (typeof v !== 'string') return v;
    if (v.startsWith("'")) return v.slice(1);
    if (v.startsWith('=')) return { formula: v };
    if (this.formats[col] === '@') return v;
    if (/^\d{1,2}:\d{2}$/.test(v)) return { time: v };
    if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(v)) return { date: v };
    if (/^-?\d+([.,]\d+)?%$/.test(v)) return Number(v.replace('%', '').replace(',', '.')) / 100;
    if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
    if (/^-?\d+$/.test(v)) return Number(v);
    return v;
  }
  appendRow(row) { this.touch(); this.data.push(row.map((v, i) => this.coerce(v, i + 1))); }
  insertColumnBefore(col) { this.data.forEach((r) => r.splice(col - 1, 0, '')); }
  getRange(row, col, numRows = 1, numCols = 1) {
    const sheet = this;
    const cells = () => {
      const out = [];
      for (let r = 0; r < numRows; r++) {
        const line = [];
        for (let c = 0; c < numCols; c++) line.push(sheet.data[row - 1 + r]?.[col - 1 + c] ?? '');
        out.push(line);
      }
      return out;
    };
    const put = (r, c, v) => {
      sheet.touch();
      while (sheet.data.length < r) sheet.data.push([]);
      const line = sheet.data[r - 1];
      while (line.length < c) line.push('');
      line[c - 1] = sheet.coerce(v, c);
    };
    return {
      getValues: () => { if (row >= 2) sheet.reads++; return cells().map((l) => l.map((v) => (v && typeof v === 'object' && 'formula' in v ? '' : v))); },
      getValue: () => cells()[0][0],
      setValues(values) { values.forEach((l, r) => l.forEach((v, c) => put(row + r, col + c, v))); return this; },
      setValue(v) { put(row, col, v); return this; },
      setFormula(f) { put(row, col, f); return this; },
      getFormula: () => { const v = cells()[0][0]; return v && typeof v === 'object' ? v.formula : ''; },
      setNumberFormat(fmt) { for (let c = 0; c < numCols; c++) sheet.formats[col + c] = fmt; return this; },
      setFontWeight() { return this; },
    };
  }
}

export function makeGas({ quota = 10, eventJson = null, fetchThrows = false } = {}) {
  const logs = { log: [], error: [], warn: [] };
  const sent = [];
  const props = new Map();
  const cache = new Map();
  const triggers = [];
  const fetches = [];
  const spreadsheets = new Map();
  const mail = { quota };
  const lockState = { held: false, waits: 0, dirty: false, unflushedReleases: 0 };

  class FakeSpreadsheet {
    constructor(name) { this.name = name; this.id = `ss-${spreadsheets.size + 1}`; this.sheets = [new FakeSheet('Página1', lockState)]; this.tz = 'America/New_York'; }
    getId() { return this.id; }
    getUrl() { return `https://docs.google.com/spreadsheets/d/${this.id}`; }
    getSheets() { return [...this.sheets]; }
    getSheetByName(n) { return this.sheets.find((s) => s.name === n) || null; }
    insertSheet(n) { const s = new FakeSheet(n, lockState); this.sheets.push(s); return s; }
    deleteSheet(s) { this.sheets = this.sheets.filter((x) => x !== s); }
    setSpreadsheetTimeZone(tz) { this.tz = tz; }
  }

  const globals = {
    console: { log: (...a) => logs.log.push(a), error: (...a) => logs.error.push(a), warn: (...a) => logs.warn.push(a) },
    SpreadsheetApp: {
      create(name) { const ss = new FakeSpreadsheet(name); spreadsheets.set(ss.id, ss); return ss; },
      openById(id) { const ss = spreadsheets.get(id); if (!ss) throw new Error(`planilha ${id} não existe`); return ss; },
      flush() { lockState.dirty = false; },
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => props.set(k, String(v)) }) },
    ScriptApp: {
      getProjectTriggers: () => [...triggers],
      newTrigger(fn) {
        const t = { fn, getHandlerFunction: () => fn };
        const b = { timeBased: () => b, everyHours: (h) => { t.hours = h; return b; }, create: () => { triggers.push(t); return t; } };
        return b;
      },
    },
    LockService: { getScriptLock: () => ({ waitLock() { lockState.waits++; lockState.held = true; }, releaseLock() { if (lockState.dirty) lockState.unflushedReleases++; lockState.held = false; } }) },
    MailApp: {
      getRemainingDailyQuota: () => mail.quota,
      sendEmail(opts) { if (mail.quota <= 0) throw new Error('Service invoked too many times for one day: email.'); mail.quota--; sent.push(opts); },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(content) { return { content, mime: null, setMimeType(m) { this.mime = m; return this; }, getContent() { return this.content; } }; },
    },
    CacheService: { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, String(v)) }) },
    UrlFetchApp: {
      fetch(url) {
        fetches.push(url);
        if (fetchThrows) throw new Error('DNS error');
        return { getResponseCode: () => (eventJson ? 200 : 404), getContentText: () => (eventJson ? JSON.stringify(eventJson) : 'Not found') };
      },
    },
    Utilities: { newBlob: (data, mime, name) => ({ data, mime, name, getName: () => name }) },
  };
  return { globals, logs, sent, props, cache, triggers, fetches, spreadsheets, mail, lockState };
}

/** Carrega todos os .js de `dir` num contexto com os dublês. */
export function loadAppsScript(dir, gas, { reverse = false } = {}) {
  const ctx = vm.createContext({ ...gas.globals });
  const files = readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  if (reverse) files.reverse();
  for (const f of files) vm.runInContext(readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  return ctx;
}
