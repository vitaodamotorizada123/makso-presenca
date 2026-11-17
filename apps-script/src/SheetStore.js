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
      put('Nome', MaksoRules.sanitizeCell(rec.nome));
      put('E-mail', MaksoRules.sanitizeCell(rec.email));
      put('WhatsApp', "'" + rec.whatsapp);
      put('Acompanhante', rec.acompanhante ? 'Sim' : 'Não');
      put('Nome do acompanhante', MaksoRules.sanitizeCell(rec.acompanhanteNome));
      put('Restrição alimentar', MaksoRules.sanitizeCell(rec.restricao));
      put('Observação', MaksoRules.sanitizeCell(rec.observacao));
      put('E-mail (status)', rec.emailStatus);
      put('E-mail atualizado em', rec.createdAt);
      put('ID', "'" + rec.id);
      sheet.appendRow(row);
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
