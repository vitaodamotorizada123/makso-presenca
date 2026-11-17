import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSubmission, makeDeps, body, UUID } from './helpers/apps-script-core.mjs';

test('confirmação válida grava, envia e-mail e marca enviado', () => {
  const { deps, records, mail } = makeDeps();
  assert.deepEqual(handleSubmission(body(), deps), { ok: true, status: 'confirmado' });
  assert.equal(records.length, 1);
  assert.deepEqual(mail.sent, [UUID(1)]);
  assert.equal(records[0].emailStatus, 'enviado');
  assert.equal(records[0].whatsapp, '5531998765432');
  assert.ok(records[0].createdAt instanceof Date);
});

test('"não vou" grava sem e-mail', () => {
  const { deps, records, mail } = makeDeps();
  assert.deepEqual(handleSubmission(body({ presenca: 'nao' }), deps), { ok: true, status: 'recusado' });
  assert.equal(mail.sent.length, 0);
  assert.equal(records[0].emailStatus, 'n.a.');
});

test('mesmo id duas vezes: idempotente', () => {
  const { deps, records } = makeDeps();
  handleSubmission(body(), deps);
  assert.deepEqual(handleSubmission(body(), deps), { ok: true, status: 'confirmado' });
  assert.equal(records.length, 1);
});

test('mesmo e-mail (com maiúsculas e espaço) em outro id: ja_respondeu', () => {
  const { deps, records } = makeDeps();
  handleSubmission(body(), deps);
  assert.deepEqual(handleSubmission(body({ id: UUID(2), email: ' MARIANA@gmail.com', whatsapp: '31 3222-1100' }), deps), { ok: false, code: 'ja_respondeu' });
  assert.equal(records.length, 1);
});

test('mesmo WhatsApp em outro formato: ja_respondeu', () => {
  const { deps } = makeDeps();
  handleSubmission(body(), deps);
  assert.deepEqual(handleSubmission(body({ id: UUID(2), email: 'outra@gmail.com', whatsapp: '+55 31 99876-5432' }), deps), { ok: false, code: 'ja_respondeu' });
});

test('honeypot preenchido ou envio rápido demais: ok sem gravar', () => {
  const a = makeDeps();
  assert.deepEqual(handleSubmission(body({ hp: 'x' }), a.deps), { ok: true, status: 'confirmado' });
  assert.equal(a.records.length, 0);
  const b = makeDeps();
  assert.deepEqual(handleSubmission(body({ t: 500, presenca: 'nao' }), b.deps), { ok: true, status: 'recusado' });
  assert.equal(b.records.length, 0);
});

test('JSON quebrado, corpo ausente e corpo de 20 KB: invalido', () => {
  const { deps, records } = makeDeps();
  assert.deepEqual(handleSubmission('{', deps), { ok: false, code: 'invalido' });
  assert.deepEqual(handleSubmission(undefined, deps), { ok: false, code: 'invalido' });
  assert.deepEqual(handleSubmission(body({ observacao: 'x'.repeat(20000) }), deps), { ok: false, code: 'invalido' });
  assert.equal(records.length, 0);
});

test('e-mail inválido: invalido com o campo', () => {
  const { deps } = makeDeps();
  assert.deepEqual(handleSubmission(body({ email: 'mariana@' }), deps), { ok: false, code: 'invalido', campos: { email: 'Informe um e-mail válido.' } });
});

test('depois do prazo: encerrado', () => {
  const { deps, records } = makeDeps({ now: '2037-12-10T12:00:00-03:00' });
  assert.deepEqual(handleSubmission(body(), deps), { ok: false, code: 'encerrado' });
  assert.equal(records.length, 0);
});

test('acima do limite de envios: erro e aviso no log', () => {
  const { deps, records, log } = makeDeps({ rate: { hit: () => false } });
  assert.deepEqual(handleSubmission(body(), deps), { ok: false, code: 'erro' });
  assert.equal(records.length, 0);
  assert.equal(log.warns.length, 1);
});

test('sem cota de e-mail: grava como pendente sem enviar', () => {
  const { deps, records, mail } = makeDeps({ quota: 0 });
  assert.deepEqual(handleSubmission(body(), deps), { ok: true, status: 'confirmado' });
  assert.equal(mail.sent.length, 0);
  assert.equal(records[0].emailStatus, 'pendente');
});

test('e-mail falha com cota sobrando: falhou, confirmação vale e loga 1 erro', () => {
  const { deps, records, log } = makeDeps();
  deps.mailer = { remainingQuota: () => 5, send() { throw new Error('Invalid email'); } };
  assert.deepEqual(handleSubmission(body(), deps), { ok: true, status: 'confirmado' });
  assert.equal(records[0].emailStatus, 'falhou');
  assert.equal(log.errors.length, 1);
});

test('e-mail falha porque a cota acabou no meio: pendente', () => {
  const { deps, records } = makeDeps();
  let quota = 1;
  deps.mailer = { remainingQuota: () => quota, send() { quota = 0; throw new Error('Service invoked too many times'); } };
  handleSubmission(body(), deps);
  assert.equal(records[0].emailStatus, 'pendente');
});

test('append falha: erro e o lock é solto', () => {
  const { deps, lock } = makeDeps();
  deps.store.append = () => { throw new Error('planilha apagada'); };
  assert.deepEqual(handleSubmission(body(), deps), { ok: false, code: 'erro' });
  assert.equal(lock.released, lock.acquired);
});

test('lock não sai: erro', () => {
  const { deps, records } = makeDeps();
  deps.lock = { acquire() { throw new Error('Lock timeout'); }, release() {} };
  assert.deepEqual(handleSubmission(body(), deps), { ok: false, code: 'erro' });
  assert.equal(records.length, 0);
});

test('[review #6] humano rápido (t entre 800 e 3000 ms) é gravado', () => {
  const { deps, records } = makeDeps();
  assert.deepEqual(handleSubmission(body({ t: 1500 }), deps), { ok: true, status: 'confirmado' });
  assert.equal(records.length, 1);
});

test('[review #6] descarte do antispam fica registrado no log', () => {
  const { deps, records, log } = makeDeps();
  handleSubmission(body({ t: 500 }), deps);
  handleSubmission(body({ id: UUID(3), hp: 'x' }), deps);
  assert.equal(records.length, 0);
  assert.equal(log.warns.length, 2);
  assert.ok(JSON.stringify(log.warns[0]).includes('mariana@gmail.com'));
});
