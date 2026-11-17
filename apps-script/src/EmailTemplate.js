/* maksō — e-mail de confirmação (HTML com estilos inline + texto). */

function escapeHtml_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderEmail(record, cfg) {
  var ev = cfg.event;
  var first = String(record.nome || '').trim().split(/\s+/)[0] || '';
  var when = MaksoCalendar.formatWhen(ev);
  var place = MaksoCalendar.placeLine(ev);
  var gcal = MaksoCalendar.googleCalendarUrl(ev);
  var e = escapeHtml_;
  var INK = '#1b0001';
  var MUTED = '#7a7a7a';
  var FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',Arial,sans-serif";

  var rows = [];
  var lines = [];
  if (when) {
    rows.push(['Quando', e(when.date + ', às ' + when.time)]);
    lines.push('Quando: ' + when.date + ', às ' + when.time);
  }
  if (place) {
    rows.push(['Onde', e(place) + (ev.mapsUrl ? '<br><a href="' + e(ev.mapsUrl) + '" style="color:' + INK + ';">Ver no mapa</a>' : '')]);
    lines.push('Onde: ' + place + (ev.mapsUrl ? ' (' + ev.mapsUrl + ')' : ''));
  }
  if (ev.dressCode) {
    rows.push(['Traje', e(ev.dressCode)]);
    lines.push('Traje: ' + ev.dressCode);
  }
  if (record.acompanhante && record.acompanhanteNome) {
    rows.push(['Acompanhante', e(record.acompanhanteNome)]);
    lines.push('Acompanhante: ' + record.acompanhanteNome);
  }
  if (!when) lines.push('Data e local serão enviados em breve.');

  var details = rows.map(function (r) {
    return '<tr><td style="padding:14px 0;border-top:1px solid #e0e0e0;font:600 13px ' + FONT + ';color:' + MUTED + ';width:120px;vertical-align:top;">' + r[0] +
      '</td><td style="padding:14px 0;border-top:1px solid #e0e0e0;font:600 17px/1.4 ' + FONT + ';color:' + INK + ';">' + r[1] + '</td></tr>';
  }).join('');
  if (!when) {
    details = '<tr><td colspan="2" style="padding:14px 0;border-top:1px solid #e0e0e0;font:17px/1.47 ' + FONT + ';color:' + MUTED + ';">Data e local serão enviados em breve.</td></tr>' + details;
  }
  var button = gcal
    ? '<tr><td style="padding:28px 0 0;"><a href="' + e(gcal) + '" style="display:inline-block;padding:14px 28px;border-radius:999px;background:' + INK + ';color:#ffffff;font:17px ' + FONT + ';text-decoration:none;">Adicionar ao Google Agenda</a>' +
      '<p style="margin:12px 0 0;font:13px/1.4 ' + FONT + ';color:' + MUTED + ';">Usa Apple Calendar ou Outlook? Abra o anexo convite-makso.ics.</p></td></tr>'
    : '';

  var html = '<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#f5f5f7;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;"><tr><td align="center" style="padding:32px 16px;">' +
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:18px;">' +
    '<tr><td align="center" style="padding:40px 32px 8px;background:#000000;border-radius:18px 18px 0 0;">' +
    '<div style="font:400 34px Georgia,\'Times New Roman\',serif;letter-spacing:10px;color:#ffffff;padding:0 0 32px;">MAKSŌ</div></td></tr>' +
    '<tr><td style="padding:32px;">' +
    '<h1 style="margin:0;font:600 28px/1.14 ' + FONT + ';color:' + INK + ';">Presença confirmada, ' + e(first) + '.</h1>' +
    '<p style="margin:12px 0 24px;font:17px/1.47 ' + FONT + ';color:' + MUTED + ';">Esperamos você no lançamento da maksō.</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + details + '</table>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + button + '</table>' +
    '</td></tr></table>' +
    '<p style="margin:24px 0 0;font:12px ' + FONT + ';color:' + MUTED + ';">Desenvolvido por DIMAK Soluções</p>' +
    '</td></tr></table></body></html>';

  var text = ['Presença confirmada, ' + first + '.', '', 'Esperamos você no lançamento da maksō.', '']
    .concat(lines)
    .concat(gcal ? ['', 'Adicionar ao Google Agenda: ' + gcal] : [])
    .concat(['', '—', 'Desenvolvido por DIMAK Soluções'])
    .join('\n');

  return { subject: 'Presença confirmada — lançamento maksō', html: html, text: text };
}
