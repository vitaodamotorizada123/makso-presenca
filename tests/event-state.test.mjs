import test from 'node:test';
import assert from 'node:assert/strict';
import { loadShared } from './helpers/load-shared.mjs';

const S = loadShared('event-state');
const START = '2026-12-12T20:00:00-03:00';
const cfg = (over = {}) => ({ rsvpDeadline: null, event: { start: START, end: '2026-12-12T23:00:00-03:00' }, ...over });
const at = (iso) => new Date(iso);

test('resolveDeadline: sem prazo explícito, 3 dias antes do início', () => {
  const d = S.resolveDeadline({ rsvpDeadline: null, event: { start: START } });
  assert.equal(d.getTime(), at('2026-12-09T20:00:00-03:00').getTime());
});

test('resolveDeadline: prazo explícito prevalece', () => {
  const d = S.resolveDeadline({ rsvpDeadline: '2026-12-11T12:00:00-03:00', event: { start: START } });
  assert.equal(d.getTime(), at('2026-12-11T12:00:00-03:00').getTime());
});

test('resolveDeadline: sem início, sem prazo', () => {
  assert.equal(S.resolveDeadline({ rsvpDeadline: null, event: { start: null } }), null);
});

test('getRsvpState: aberto antes do prazo com endpoint', () => {
  assert.equal(S.getRsvpState({ now: at('2026-12-01T10:00:00-03:00'), cfg: cfg(), hasEndpoint: true }), 'aberto');
});

test('getRsvpState: em_breve sem endpoint', () => {
  assert.equal(S.getRsvpState({ now: at('2026-12-01T10:00:00-03:00'), cfg: cfg(), hasEndpoint: false }), 'em_breve');
});

test('getRsvpState: encerrado depois do prazo', () => {
  assert.equal(S.getRsvpState({ now: at('2026-12-10T10:00:00-03:00'), cfg: cfg(), hasEndpoint: true }), 'encerrado');
});

test('getRsvpState: passado depois do fim', () => {
  assert.equal(S.getRsvpState({ now: at('2026-12-13T00:30:00-03:00'), cfg: cfg(), hasEndpoint: true }), 'passado');
});

test('getRsvpState: sem fim, passado 5h depois do início (fim = início + 4h)', () => {
  const c = cfg({ event: { start: START, end: null } });
  assert.equal(S.getRsvpState({ now: at('2026-12-13T01:00:00-03:00'), cfg: c, hasEndpoint: true }), 'passado');
});

test('getRsvpState: sem datas e com endpoint, aberto', () => {
  const c = { rsvpDeadline: null, event: { start: null, end: null } };
  assert.equal(S.getRsvpState({ now: new Date(), cfg: c, hasEndpoint: true }), 'aberto');
});

test('toLocalParts usa −03:00', () => {
  const p = S.toLocalParts(at('2026-12-12T23:00:00Z'));
  assert.deepEqual(p, { y: 2026, m: 12, d: 12, hh: 20, mm: 0, weekday: 6 });
});
