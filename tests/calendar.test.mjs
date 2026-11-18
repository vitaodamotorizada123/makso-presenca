import test from 'node:test';
import assert from 'node:assert/strict';
import { loadShared } from './helpers/load-shared.mjs';

loadShared('event-state');
const C = loadShared('calendar');

const ev = (over = {}) => ({
  title: 'Lançamento maksō', start: '2026-12-12T20:00:00-03:00', end: '2026-12-12T23:00:00-03:00',
  venueName: 'Casa X', address: 'Rua X, 10; BH', mapsUrl: 'https://maps.app.goo.gl/abc',
  dressCode: 'Esporte fino', description: 'Linha 1\nLinha 2', ...over,
});

test('formatWhen: sábado, 12 de dezembro às 20h', () => {
  assert.deepEqual(C.formatWhen(ev()), { date: 'sábado, 12 de dezembro', time: '20h' });
});

test('formatWhen: minutos aparecem como 20h30', () => {
  assert.equal(C.formatWhen(ev({ start: '2026-12-12T20:30:00-03:00' })).time, '20h30');
});

test('formatShort: 10.12.2026 e 19h (convite)', () => {
  assert.deepEqual(C.formatShort(ev({ start: '2026-12-10T19:00:00-03:00' })), { date: '10.12.2026', time: '19h' });
});

test('formatShort: minutos aparecem como 19h30', () => {
  assert.equal(C.formatShort(ev({ start: '2026-12-10T19:30:00-03:00' })).time, '19h30');
});

test('formatShort: sem início, null', () => {
  assert.equal(C.formatShort(ev({ start: null })), null);
});

test('formatWhen: sem início, null', () => {
  assert.equal(C.formatWhen(ev({ start: null })), null);
});

test('googleCalendarUrl monta o link do Google Agenda em UTC', () => {
  const url = C.googleCalendarUrl(ev());
  assert.ok(url.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE'));
  assert.ok(url.includes('dates=20261212T230000Z%2F20261213T020000Z'));
  assert.ok(url.includes('ctz=America%2FSao_Paulo'));
});

test('googleCalendarUrl: sem início, null', () => {
  assert.equal(C.googleCalendarUrl(ev({ start: null })), null);
});

const now = new Date('2026-11-20T15:00:00Z');

test('buildIcs gera um VCALENDAR com CRLF e horários em UTC', () => {
  const ics = C.buildIcs(ev(), { uid: 'abc@makso', now });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(ics.includes('DTSTART:20261212T230000Z\r\n'));
  assert.ok(ics.includes('UID:abc@makso'));
  assert.ok(ics.includes('METHOD:PUBLISH'));
});

test('buildIcs escapa vírgula, ponto e vírgula e quebra de linha', () => {
  const ics = C.buildIcs(ev(), { uid: 'abc@makso', now });
  const unfolded = ics.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('Rua X\\, 10\\; BH'));
  assert.ok(unfolded.includes('Linha 1\\nLinha 2'));
});

test('buildIcs dobra linhas em até 75 bytes sem partir caracteres', () => {
  const title = 'ō💼'.repeat(200);
  const ics = C.buildIcs(ev({ title }), { uid: 'abc@makso', now });
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, `linha com ${Buffer.byteLength(line)} bytes`);
  assert.ok(!ics.includes('�'));
  const summary = ics.replace(/\r\n /g, '').split('\r\n').find((l) => l.startsWith('SUMMARY:'));
  assert.equal(summary, 'SUMMARY:' + title);
});

test('buildIcs: sem início, null', () => {
  assert.equal(C.buildIcs(ev({ start: null }), { uid: 'x', now }), null);
});

test('eventUid é o mesmo para o .ics do site e o do e-mail', () => {
  assert.equal(C.eventUid(ev()), 'lancamento-20261212T230000Z@makso');
  assert.equal(C.eventUid(ev({ start: null })), null);
});
