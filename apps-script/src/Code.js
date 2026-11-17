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
      release: function () { lock.releaseLock(); },
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
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  ['WhatsApp', 'ID'].forEach(function (name) {
    var i = header.indexOf(name);
    if (i > -1) sheet.getRange(1, i + 1, sheet.getMaxRows(), 1).setNumberFormat('@');
  });

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
