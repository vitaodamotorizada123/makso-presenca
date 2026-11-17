import test from 'node:test';
import assert from 'node:assert/strict';
import { loadShared, loadSrc } from './helpers/load-shared.mjs';

const R = loadShared('rules');
const A = loadSrc('api', 'MaksoApi');
const payload = { id: '3f2b6c1e-8d4a-4b7e-9c2f-1a2b3c4d5e6f', presenca: 'sim', nome: 'Mariana' };
const ERRO = { ok: false, code: 'erro' };
const okResponse = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, text: async () => body });

test('submit envia POST text/plain com o JSON e devolve a resposta', async () => {
  let call;
  const fetchImpl = async (url, init) => { call = { url, init }; return okResponse('{"ok":true,"status":"confirmado"}'); };
  const res = await A.submit(payload, { endpoint: 'https://script.google.com/macros/s/X/exec', demo: false, fetchImpl });
  assert.deepEqual(res, { ok: true, status: 'confirmado' });
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.headers['Content-Type'], 'text/plain;charset=utf-8');
  assert.equal(call.init.body, JSON.stringify(payload));
});

test('submit: rede caindo vira erro', async () => {
  const res = await A.submit(payload, { endpoint: 'x', demo: false, fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
  assert.deepEqual(res, ERRO);
});

test('submit: timeout vira erro', async () => {
  const res = await A.submit(payload, { endpoint: 'x', demo: false, timeoutMs: 50, fetchImpl: () => new Promise(() => {}) });
  assert.deepEqual(res, ERRO);
});

test('submit: status 500 e corpo HTML viram erro', async () => {
  assert.deepEqual(await A.submit(payload, { endpoint: 'x', demo: false, fetchImpl: async () => okResponse('{"ok":true,"status":"confirmado"}', 500) }), ERRO);
  assert.deepEqual(await A.submit(payload, { endpoint: 'x', demo: false, fetchImpl: async () => okResponse('<html>') }), ERRO);
});

test('parseResponse aceita só o contrato', () => {
  assert.deepEqual(A.parseResponse({ ok: true, status: 'x' }), ERRO);
  assert.deepEqual(A.parseResponse({ ok: false, code: 'ja_respondeu' }), { ok: false, code: 'ja_respondeu' });
  assert.deepEqual(A.parseResponse({ ok: false, code: 'invalido', campos: { email: 'Informe um e-mail válido.' } }),
    { ok: false, code: 'invalido', campos: { email: 'Informe um e-mail válido.' } });
  assert.deepEqual(A.parseResponse(null), ERRO);
  assert.deepEqual(A.parseResponse('ok'), ERRO);
});

test('detectDemo: só com ?demo=1 ou em localhost', () => {
  assert.equal(A.detectDemo({ hostname: 'makso.onrender.com', search: '' }).demo, false);
  assert.deepEqual(A.detectDemo({ hostname: 'makso.onrender.com', search: '?demo=1&cenario=erro' }), { demo: true, scenario: 'erro' });
  assert.equal(A.detectDemo({ hostname: 'localhost', search: '' }).demo, true);
  assert.equal(A.detectDemo({ hostname: 'makso.onrender.com', search: '?demo=1&cenario=xyz' }).scenario, null);
  assert.equal(A.detectDemo({ hostname: 'makso.onrender.com', search: '?cenario=erro' }).scenario, null);
});

test('makeId sem randomUUID usa getRandomValues e gera UUID v4', () => {
  const id = A.makeId({ getRandomValues: (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = (i * 37 + 11) & 255; return arr; } });
  assert.ok(R.isUuid(id), id);
});

test('makeId sem crypto nenhum ainda gera UUID v4', () => {
  assert.ok(R.isUuid(A.makeId(undefined)));
});
