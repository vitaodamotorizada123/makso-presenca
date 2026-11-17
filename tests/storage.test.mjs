import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './helpers/load-shared.mjs';

const S = loadSrc('storage', 'MaksoStorage');
const boom = () => { throw new Error('SecurityError'); };

test('safe: storage que lança não derruba e guarda em memória', () => {
  const s = S.safe({ getItem: boom, setItem: boom, removeItem: boom });
  s.set('a', '1');
  assert.equal(s.get('a'), '1');
  s.remove('a');
  assert.equal(s.get('a'), null);
});

test('safe: storage que funciona é usado de verdade', () => {
  const data = new Map();
  const real = { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) };
  const s = S.safe(real);
  s.set('x', 'y');
  assert.equal(data.get('x'), 'y');
  assert.equal(s.get('x'), 'y');
});

test('safe: sem storage, só memória', () => {
  const s = S.safe(undefined);
  s.set('k', 'v');
  assert.equal(s.get('k'), 'v');
});

test('session: acessar window.sessionStorage lançando não derruba', () => {
  const win = {};
  Object.defineProperty(win, 'sessionStorage', { get: boom });
  const s = S.session(win);
  s.set('k', 'v');
  assert.equal(s.get('k'), 'v');
});
