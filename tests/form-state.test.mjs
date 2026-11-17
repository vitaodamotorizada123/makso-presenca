import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './helpers/load-shared.mjs';

const F = loadSrc('form-state', 'MaksoFormState');
const open = () => F.initialState('aberto');
const sending = () => F.reduce(open(), { type: 'submit' });
const respond = (s, res) => F.reduce(s, { type: 'response', res, nome: 'Mariana Souza', email: 'mariana@gmail.com' });

test('submit durante o envio não muda nada', () => {
  const s = sending();
  assert.equal(s.phase, 'enviando');
  assert.equal(F.reduce(s, { type: 'submit' }), s);
});

test('submit com confirmações em breve é ignorado', () => {
  const s = F.initialState('em_breve');
  assert.equal(s.status, 'em_breve');
  assert.equal(F.reduce(s, { type: 'submit' }), s);
});

test('confirmado conclui com o resultado', () => {
  const s = respond(sending(), { ok: true, status: 'confirmado' });
  assert.equal(s.phase, 'concluido');
  assert.equal(s.result.kind, 'confirmado');
  assert.equal(s.result.nome, 'Mariana Souza');
});

test('código desconhecido vira erro e volta a editar', () => {
  const s = respond(sending(), { ok: false, code: 'zzz' });
  assert.equal(s.status, 'erro');
  assert.equal(s.phase, 'editando');
  assert.equal(s.result, null);
});

test('invalido com campo que o formulário não tem vira erro geral', () => {
  const s = respond(sending(), { ok: false, code: 'invalido', campos: { id: 'invalido' } });
  assert.equal(s.status, 'erro');
  assert.deepEqual(s.errors, {});
});

test('invalido com e-mail marca o campo', () => {
  const s = respond(sending(), { ok: false, code: 'invalido', campos: { email: 'Informe um e-mail válido.' } });
  assert.equal(s.errors.email, 'Informe um e-mail válido.');
  assert.equal(s.phase, 'editando');
});

test('escolher "não vou" desliga o acompanhante', () => {
  let s = F.reduce(open(), { type: 'choose', presenca: 'sim' });
  s = F.reduce(s, { type: 'toggleCompanion', on: true });
  assert.equal(s.companion, true);
  s = F.reduce(s, { type: 'choose', presenca: 'nao' });
  assert.equal(s.companion, false);
});

test('editar um campo limpa o erro dele', () => {
  let s = F.reduce(open(), { type: 'invalid', fields: { nome: 'Informe seu nome.', email: 'Informe um e-mail válido.' } });
  s = F.reduce(s, { type: 'edit', field: 'nome' });
  assert.deepEqual(s.errors, { email: 'Informe um e-mail válido.' });
});

test('ja_respondeu e encerrado concluem', () => {
  assert.equal(respond(sending(), { ok: false, code: 'ja_respondeu' }).result.kind, 'ja_respondeu');
  assert.equal(respond(sending(), { ok: false, code: 'encerrado' }).result.kind, 'encerrado');
});
