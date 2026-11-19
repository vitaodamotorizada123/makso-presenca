import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildAppsScript } from '../scripts/build.mjs';
import { root } from './helpers/load-shared.mjs';
import { makeGas, loadAppsScript } from './helpers/gas-fakes.mjs';

const fixture = path.join(root, 'tests', 'fixtures', 'config.full.json');
const fullCfg = JSON.parse(readFileSync(fixture, 'utf8'));
let distDir;
async function dist() {
  if (!distDir) {
    distDir = mkdtempSync(path.join(os.tmpdir(), 'makso-gas-'));
    await buildAppsScript({ root, configPath: fixture, outDir: distDir, version: 'test1234' });
  }
  return distDir;
}

const UUID = (n) => `3f2b6c1e-8d4a-4b7e-9c2f-${String(n).padStart(12, '0')}`;
const post = (ctx, over = {}) => {
  const body = JSON.stringify({ id: UUID(1), presenca: 'sim', nome: 'Mariana Souza', email: 'mariana@gmail.com', whatsapp: '(31) 99876-5432',
    acompanhante: false, acompanhanteNome: '', restricao: '', observacao: '', hp: '', t: 5000, ...over });
  return JSON.parse(ctx.doPost({ postData: { contents: body } }).getContent());
};

async function setupCtx(opts = {}) {
  const gas = makeGas(opts);
  const ctx = loadAppsScript(await dist(), gas, opts);
  ctx.setup();
  const ss = gas.spreadsheets.get(gas.props.get('SHEET_ID'));
  return { gas, ctx, ss, sheet: ss.getSheetByName('Respostas'), resumo: ss.getSheetByName('Resumo') };
}

test('setup cria as abas, o cabeçalho, o resumo, o fuso e o formato de texto', async () => {
  const { ctx, ss, sheet, resumo, gas } = await setupCtx();
  assert.deepEqual(sheet.data[0], [...ctx.COLUMNS]);
  assert.equal(resumo.getRange(3, 2).getFormula(), '=B1+B2');
  assert.equal(resumo.getRange(1, 2).getFormula(), '=COUNTIF(Respostas!B:B,"Vou")');
  assert.equal(ss.tz, 'America/Sao_Paulo');
  assert.equal(sheet.frozen, 1);
  ctx.setup();
  assert.equal(gas.triggers.filter((t) => t.fn === 'processPendingEmails').length, 1);
});

test('doPost válido grava a linha, envia o e-mail com .ics e neutraliza fórmula', async () => {
  const { ctx, sheet, gas } = await setupCtx();
  assert.deepEqual(post(ctx, { observacao: '=1+1' }), { ok: true, status: 'confirmado' });
  const row = sheet.data[1];
  const col = (name) => row[ctx.COLUMNS.indexOf(name)];
  assert.equal(col('Presença'), 'Vou');
  assert.equal(col('Observação'), '=1+1'); // gravado como '=1+1: texto, não fórmula
  assert.equal(col('WhatsApp'), '5531998765432');
  assert.equal(col('E-mail (status)'), 'enviado');
  assert.equal(gas.sent.length, 1);
  assert.equal(gas.sent[0].name, 'maksō');
  assert.equal(gas.sent[0].to, 'mariana@gmail.com');
  assert.equal(gas.sent[0].attachments[0].name, 'convite-makso.ics');
});

test('WhatsApp que o Sheets virou número continua bloqueando duplicidade', async () => {
  const { ctx, sheet } = await setupCtx();
  delete sheet.formats[5]; // alguém mudou o formato da coluna WhatsApp na planilha
  const row = ctx.COLUMNS.map(() => '');
  row[ctx.COLUMNS.indexOf('Presença')] = 'Vou';
  row[ctx.COLUMNS.indexOf('E-mail')] = 'antiga@gmail.com';
  row[ctx.COLUMNS.indexOf('WhatsApp')] = '5531998765432'; // sem apóstrofo: vira número
  row[ctx.COLUMNS.indexOf('ID')] = UUID(9);
  sheet.appendRow(row);
  assert.equal(typeof sheet.data[1][ctx.COLUMNS.indexOf('WhatsApp')], 'number');
  assert.deepEqual(post(ctx), { ok: false, code: 'ja_respondeu' });
});

test('coluna inserida na planilha não desalinha a gravação', async () => {
  const { ctx, sheet } = await setupCtx();
  sheet.insertColumnBefore(3);
  sheet.getRange(1, 3).setValue('Mesa');
  post(ctx);
  const header = sheet.data[0];
  assert.equal(sheet.data[1][header.indexOf('Nome')], 'Mariana Souza');
  assert.equal(sheet.data[1][header.indexOf('Mesa')], '');
});

test('doPost sem corpo: invalido', async () => {
  const { ctx } = await setupCtx();
  assert.deepEqual(JSON.parse(ctx.doPost({}).getContent()), { ok: false, code: 'invalido' });
});

test('renderEmail escapa o nome e não tem script', async () => {
  const { ctx } = await setupCtx();
  const m = ctx.renderEmail({ nome: '<b>Zoë & Cia</b> 💼', email: 'z@x.com', acompanhante: false, acompanhanteNome: '' }, fullCfg);
  assert.equal(m.subject, 'Presença confirmada — lançamento maksō');
  assert.ok(m.html.includes('&lt;b&gt;Zoë'));
  assert.ok(!m.html.includes('<b>Zoë'));
  assert.ok(!/<script/i.test(m.html));
  assert.ok(m.html.includes('Desenvolvido por DIMAK Soluções'));
  assert.ok(m.text.includes('12 . 12 . 2037') && m.text.includes('20h'));
});

test('e-mail no desenho do obrigado: frase, data, endereço, informações e sem acompanhantes', async () => {
  const { ctx } = await setupCtx();
  const m = ctx.renderEmail({ nome: 'Mariana Souza', email: 'm@x.com', acompanhante: false, acompanhanteNome: '' }, fullCfg);
  for (const t of ['Sua presença foi confirmada.', 'Prepare-se para<br>desvendar as bolsas mais<br>icônicas que você já viu!', 'Ver no mapa',
    '12 . 12 . 2037<br>Casa Fiat de Cultura · Praça da Liberdade, 10 — Funcionários, Belo Horizonte<br>20h', 'bgcolor="#24151f"', 'Petit Formal Script', 'Informações importantes', 'Acesso ao endereço', '(31) 98727-2711', '#24151f']) {
    assert.ok(m.html.includes(t), t);
  }
  assert.ok(m.text.includes('Informações importantes'));
  assert.ok(!/acompanhante/i.test(m.html), 'convites individuais');
});

test('e-mail tem botões de WhatsApp e Instagram da maksō (html e texto)', async () => {
  const { ctx } = await setupCtx();
  const m = ctx.renderEmail({ nome: 'Mariana Souza', email: 'm@x.com', acompanhante: false, acompanhanteNome: '' }, fullCfg);
  assert.match(m.html, /<a href="https:\/\/wa\.me\/5531987272711"[^>]*>[^<]*WhatsApp/);
  assert.match(m.html, /<a href="https:\/\/www\.instagram\.com\/makso\.br\/"[^>]*>[^<]*Instagram/);
  assert.match(m.text, /WhatsApp: https:\/\/wa\.me\/5531987272711/);
  assert.match(m.text, /Instagram: https:\/\/www\.instagram\.com\/makso\.br\//);
});

test('sem cota: pendente; com cota de volta, a fila envia', async () => {
  const { ctx, sheet, gas } = await setupCtx({ quota: 0 });
  post(ctx);
  const st = () => sheet.data[1][ctx.COLUMNS.indexOf('E-mail (status)')];
  assert.equal(st(), 'pendente');
  gas.mail.quota = 5;
  ctx.processPendingEmails();
  assert.equal(st(), 'enviado');
  assert.equal(gas.sent.length, 1);
  assert.equal(gas.lockState.held, false);
});

test('linha presa em "enviando" há 20 min volta para a fila e sai', async () => {
  const { ctx, sheet, gas } = await setupCtx({ quota: 0 });
  post(ctx);
  const c = (n) => ctx.COLUMNS.indexOf(n);
  sheet.data[1][c('E-mail (status)')] = 'enviando';
  sheet.data[1][c('E-mail atualizado em')] = new Date(Date.now() - 20 * 60 * 1000);
  gas.mail.quota = 5;
  ctx.processPendingEmails();
  assert.equal(sheet.data[1][c('E-mail (status)')], 'enviado');
});

test('loadConfig: event.json do site prevalece, com cache; sem site, usa a reserva', async () => {
  const newer = { ...fullCfg, rsvpDeadline: '2037-12-05T12:00:00-03:00', version: 'site9999' };
  const a = makeGas({ eventJson: newer });
  const ctxA = loadAppsScript(await dist(), a);
  assert.equal(ctxA.getConfig_().rsvpDeadline, '2037-12-05T12:00:00-03:00');
  ctxA.getConfig_();
  assert.equal(a.fetches.length, 1);
  assert.equal(a.fetches[0], 'https://makso.onrender.com/event.json');

  const b = makeGas({ fetchThrows: true });
  const ctxB = loadAppsScript(await dist(), b);
  assert.equal(ctxB.getConfig_().rsvpDeadline, null);
  assert.equal(ctxB.getConfig_().version, 'test1234');
});

test('arquivos carregados em ordem invertida funcionam (sem dependência de ordem)', async () => {
  const gas = makeGas();
  const ctx = loadAppsScript(await dist(), gas, { reverse: true });
  const res = JSON.parse(ctx.doGet().getContent());
  assert.equal(res.ok, true);
  assert.equal(res.service, 'makso-rsvp');
  assert.equal(res.version, 'test1234');
});

test('appsscript.json: V8, fuso, web app anônimo e escopos mínimos', async () => {
  const manifest = JSON.parse(readFileSync(path.join(await dist(), 'appsscript.json'), 'utf8'));
  assert.equal(manifest.runtimeVersion, 'V8');
  assert.equal(manifest.timeZone, 'America/Sao_Paulo');
  assert.deepEqual(manifest.webapp, { executeAs: 'USER_DEPLOYING', access: 'ANYONE_ANONYMOUS' });
  assert.deepEqual(manifest.oauthScopes.sort(), [
    'https://www.googleapis.com/auth/script.external_request',
    'https://www.googleapis.com/auth/script.scriptapp',
    'https://www.googleapis.com/auth/script.send_mail',
    'https://www.googleapis.com/auth/spreadsheets',
  ]);
});

test('[review #1] toda escrita na planilha é confirmada (flush) antes de soltar o lock', async () => {
  const { ctx, gas } = await setupCtx({ quota: 0 });
  post(ctx);
  post(ctx, { id: UUID(2), email: 'outra@gmail.com', whatsapp: '31 98888-7777' });
  gas.mail.quota = 5;
  ctx.processPendingEmails();
  assert.equal(gas.lockState.unflushedReleases, 0);
});

test('[review #10] texto livre fica literal na planilha (hora, %, booleano, zero à esquerda)', async () => {
  const { ctx, sheet } = await setupCtx();
  post(ctx, { nome: 'TRUE', observacao: '21:30', restricao: '50%', acompanhante: true, acompanhanteNome: '0800' });
  const row = sheet.data[1];
  const col = (name) => row[ctx.COLUMNS.indexOf(name)];
  assert.equal(col('Nome'), 'TRUE');
  assert.equal(col('Observação'), '21:30');
  assert.equal(col('Restrição alimentar'), '50%');
  assert.equal(col('Nome do acompanhante'), '0800');
  assert.equal(col('WhatsApp'), '5531998765432');
  assert.equal(typeof col('WhatsApp'), 'string');
});

test('[review #8] a fila grava os status de uma vez (uma leitura da planilha)', async () => {
  const { ctx, sheet, gas } = await setupCtx({ quota: 0 });
  for (let i = 1; i <= 5; i++) post(ctx, { id: UUID(i), email: `p${i}@gmail.com`, whatsapp: `31 9${String(i).repeat(4)}-000${i}` });
  gas.mail.quota = 10;
  sheet.reads = 0;
  ctx.processPendingEmails();
  assert.ok(sheet.reads <= 3, `${sheet.reads} leituras`);
  assert.equal(sheet.data.slice(1).filter((r) => r[ctx.COLUMNS.indexOf('E-mail (status)')] === 'enviado').length, 5);
});
