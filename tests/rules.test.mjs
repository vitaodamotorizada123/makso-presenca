import test from 'node:test';
import assert from 'node:assert/strict';
import { loadShared } from './helpers/load-shared.mjs';

const R = loadShared('rules');
const UUID = '3f2b6c1e-8d4a-4b7e-9c2f-1a2b3c4d5e6f';

function valid(over = {}) {
  return {
    id: UUID, presenca: 'sim', nome: 'Mariana Souza', email: 'mariana@gmail.com',
    whatsapp: '(31) 99876-5432', acompanhante: false, acompanhanteNome: '',
    restricao: '', observacao: '', ...over,
  };
}

test('normalizeEmail apara e põe em minúsculas', () => {
  assert.equal(R.normalizeEmail('  Mariana@Gmail.COM '), 'mariana@gmail.com');
});

test('normalizeWhatsapp aceita formatos brasileiros e devolve 55+DDD+número', () => {
  assert.equal(R.normalizeWhatsapp('(31) 99876-5432'), '5531998765432');
  assert.equal(R.normalizeWhatsapp('+55 31 99876-5432'), '5531998765432');
  assert.equal(R.normalizeWhatsapp('31 3222-1100'), '553132221100');
  assert.equal(R.normalizeWhatsapp('5531998765432'), '5531998765432');
});

test('normalizeWhatsapp aceita número (como o Sheets devolve)', () => {
  assert.equal(R.normalizeWhatsapp(5531998765432), '5531998765432');
});

test('normalizeWhatsapp devolve vazio para números sem DDD ou curtos', () => {
  assert.equal(R.normalizeWhatsapp('99876-5432'), '');
  assert.equal(R.normalizeWhatsapp('123'), '');
});

test('validateSubmission aceita confirmação com acompanhante e apara o nome dele', () => {
  const r = R.validateSubmission(valid({ acompanhante: true, acompanhanteNome: ' João ' }));
  assert.equal(r.ok, true);
  assert.equal(r.value.acompanhante, true);
  assert.equal(r.value.acompanhanteNome, 'João');
  assert.equal(r.value.whatsapp, '5531998765432');
});

test('validateSubmission recusa presença fora de sim/nao', () => {
  const r = R.validateSubmission(valid({ presenca: 'talvez' }));
  assert.equal(r.ok, false);
  assert.equal(r.fields.presenca, 'Escolha se você vai.');
});

test('validateSubmission exige nome', () => {
  assert.equal(R.validateSubmission(valid({ nome: '  ' })).fields.nome, 'Informe seu nome.');
});

test('validateSubmission exige e-mail válido', () => {
  assert.equal(R.validateSubmission(valid({ email: 'mariana@' })).fields.email, 'Informe um e-mail válido.');
});

test('validateSubmission exige WhatsApp com DDD', () => {
  assert.equal(R.validateSubmission(valid({ whatsapp: '123' })).fields.whatsapp, 'Informe um WhatsApp com DDD.');
});

test('validateSubmission exige nome do acompanhante quando há acompanhante', () => {
  const r = R.validateSubmission(valid({ acompanhante: true, acompanhanteNome: '' }));
  assert.equal(r.fields.acompanhanteNome, 'Informe o nome do acompanhante.');
});

test('validateSubmission limita observação a 500 caracteres', () => {
  const r = R.validateSubmission(valid({ observacao: 'a'.repeat(501) }));
  assert.equal(r.fields.observacao, 'Texto muito longo (máx. 500).');
});

test('validateSubmission só aceita acompanhante booleano verdadeiro', () => {
  const r = R.validateSubmission(valid({ acompanhante: 'yes', acompanhanteNome: 'X' }));
  assert.equal(r.ok, true);
  assert.equal(r.value.acompanhante, false);
  assert.equal(r.value.acompanhanteNome, '');
});

test('validateSubmission limpa acompanhante e restrição de quem não vai', () => {
  const r = R.validateSubmission(valid({ presenca: 'nao', acompanhante: true, acompanhanteNome: 'X', restricao: 'Y' }));
  assert.equal(r.ok, true);
  assert.equal(r.value.acompanhante, false);
  assert.equal(r.value.acompanhanteNome, '');
  assert.equal(r.value.restricao, '');
});

test('validateSubmission recusa id que não é UUID', () => {
  assert.equal(R.validateSubmission(valid({ id: 'abc' })).fields.id, 'invalido');
});

test('validateSubmission mantém emoji e acentos', () => {
  const r = R.validateSubmission(valid({ nome: 'Zoë Ândrade 💼' }));
  assert.equal(r.ok, true);
  assert.equal(r.value.nome, 'Zoë Ândrade 💼');
});

test('sanitizeCell neutraliza fórmulas e mantém texto comum', () => {
  assert.equal(R.sanitizeCell('=HYPERLINK("x")'), '\'=HYPERLINK("x")');
  for (const v of ['+55', '-1', '@a', '\tx', '\rx']) assert.equal(R.sanitizeCell(v), "'" + v);
  assert.equal(R.sanitizeCell('Maria'), 'Maria');
  assert.equal(R.sanitizeCell(''), '');
});

test('utf8Bytes conta bytes UTF-8', () => {
  assert.equal(R.utf8Bytes('ō💼'), 6);
});
