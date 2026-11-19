/* maksō — e-mail de confirmação (HTML com estilos inline + texto), no desenho do "obrigado" do site. */

function escapeHtml_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Mesmas informações da tela final do site (sem acompanhantes: convites individuais). */
// Atalhos (os mesmos do site, pedido do cliente 18/11).
var EMAIL_LINKS_ = [
  ['WhatsApp', 'https://wa.me/5531987272711'],
  ['Instagram', 'https://www.instagram.com/makso.br/'],
];

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

  var street = [ev.venueName, (ev.address || '').split(' – ')[0]].filter(Boolean).join(' · ');

  var info = EMAIL_INFO_.map(function (it) {
    var body = e(it[1]).replace('(31) 98727-2711', '<a href="tel:+5531987272711" style="color:' + CREAM + ';">(31) 98727-2711</a>');
    return '<p style="margin:32px 0 0;font:13px/1.4 ' + SANS + ';letter-spacing:1.5px;text-transform:uppercase;color:' + CREAM + ';">' + e(it[0]) + '</p>' +
      '<p style="margin:8px 0 0;font:15px/1.6 ' + SANS + ';color:' + MUTED + ';">' + body + '</p>';
  }).join('');

  var button = gcal
    ? '<p style="margin:36px 0 0;"><a href="' + e(gcal) + '" style="display:inline-block;padding:14px 28px;border-radius:999px;background:' + CREAM + ';color:' + BG + ';font:14px ' + SANS + ';letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;">Adicionar à agenda</a></p>' +
      '<p style="margin:12px 0 0;font:13px/1.4 ' + SANS + ';color:' + MUTED + ';">Usa Apple Calendar ou Outlook? Abra o anexo convite-makso.ics.</p>'
    : '';

  // bgcolor + background em cada camada: o Gmail (inclusive no modo escuro) ignora o fundo do <body>.
  var html = '<!doctype html><html lang="pt-BR"><head><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">' +
    // O iPhone transforma data, endereço e horário em links sublinhados: desliga e, se vier, herda o estilo.
    '<meta name="format-detection" content="telephone=no,date=no,address=no,email=no">' +
    '<style>a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }</style></head>' +
    '<body bgcolor="' + BG + '" style="margin:0;padding:0;background:' + BG + ';background-color:' + BG + ';">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="' + BG + '" style="background:' + BG + ';background-color:' + BG + ';"><tr><td align="center" bgcolor="' + BG + '" style="padding:48px 24px;background-color:' + BG + ';">' +
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="' + BG + '" style="width:100%;max-width:560px;background-color:' + BG + ';">' +
    '<tr><td align="center">' +
    // Logo oficial (PNG creme do site; SVG não funciona no Gmail). alt mantém o nome se a imagem não carregar.
    '<img src="' + e(String(cfg.siteUrl || '').replace(/\/$/, '')) + '/email-logo.png" width="180" height="48" alt="maksō" style="display:block;margin:0 auto 96px;width:180px;height:48px;border:0;outline:none;text-decoration:none;color:' + CREAM + ';font:300 28px ' + SERIF + ';letter-spacing:6px;">' +
    '<p style="margin:0;font:17px/1.4 ' + SANS + ';color:' + CREAM + ';">Olá, ' + e(first) + '. Sua presença foi confirmada.</p>' +
    '<p style="margin:64px 0 0;font:400 22px/1.45 ' + SCRIPT + ';color:' + CREAM + ';">Prepare-se para<br>desvendar as bolsas mais<br>icônicas que você já viu!</p>' +
    // Data, endereço e hora, nessa ordem, num bloco juntinho.
    (short || street ? '<p style="margin:64px 0 0;font:300 19px/1.35 ' + SANS + ';color:' + CREAM + ';">' +
      [short && e(short.date), street && e(street), short && e(short.time)].filter(Boolean).join('<br>') + '</p>'
      : '<p style="margin:48px 0 0;font:17px/1.5 ' + SANS + ';color:' + MUTED + ';">Data e local serão enviados em breve.</p>') +
    (ev.mapsUrl ? '<p style="margin:8px 0 0;"><a href="' + e(ev.mapsUrl) + '" style="font:15px ' + SANS + ';color:' + MUTED + ';">Ver no mapa</a></p>' : '') +
    (ev.dressCode ? '<p style="margin:6px 0 0;font:300 18px/1.5 ' + SANS + ';color:' + CREAM + ';">Traje: ' + e(ev.dressCode) + '</p>' : '') +
    button +
    '</td></tr>' +
    '<tr><td bgcolor="' + BG + '" style="padding:48px 0 0;border-bottom:1px solid ' + LINE + ';"></td></tr>' +
    '<tr><td align="left" style="padding:40px 0 0;">' +
    '<p style="margin:0;font:13px ' + SANS + ';letter-spacing:1.5px;text-transform:uppercase;color:' + CREAM + ';">Informações importantes</p>' +
    info +
    '</td></tr></table>' +
    // Atalhos da maksō (os mesmos do site): dois botões de contorno creme, lado a lado.
    '<p style="margin:48px 0 0;font:12px ' + SANS + ';letter-spacing:1.5px;text-transform:uppercase;color:' + MUTED + ';">Fale com a maksō</p>' +
    '<p style="margin:16px 0 0;">' +
      EMAIL_LINKS_.map(function (l) {
        return '<a href="' + l[1] + '" style="display:inline-block;margin:0 4px 8px;padding:12px 22px;border:1px solid ' + CREAM + ';border-radius:999px;color:' + CREAM + ';font:13px ' + SANS + ';letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;">' + l[0] + '</a>';
      }).join('') +
    '</p>' +
    '<p style="margin:40px 0 0;font:12px ' + SANS + ';color:' + MUTED + ';">Desenvolvido por DIMAK Soluções</p>' +
    '</td></tr></table></body></html>';

  var lines = [];
  if (short) lines.push(short.date);
  if (street) lines.push(street + (ev.mapsUrl ? ' (' + ev.mapsUrl + ')' : ''));
  if (short) lines.push(short.time);
  if (ev.dressCode) lines.push('Traje: ' + ev.dressCode);
  if (!short) lines.push('Data e local serão enviados em breve.');

  var text = ['Olá, ' + first + '. Sua presença foi confirmada.', '', 'Prepare-se para desvendar as bolsas mais icônicas que você já viu!', '']
    .concat(lines)
    .concat(gcal ? ['', 'Adicionar à agenda: ' + gcal] : [])
    .concat(['', 'Informações importantes'])
    .concat(EMAIL_INFO_.map(function (it) { return '- ' + it[0] + ': ' + it[1]; }))
    .concat([''].concat(EMAIL_LINKS_.map(function (l) { return l[0] + ': ' + l[1]; })))
    .concat(['', '—', 'Desenvolvido por DIMAK Soluções'])
    .join('\n');

  return { subject: 'Presença confirmada — lançamento maksō', html: html, text: text };
}
