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
