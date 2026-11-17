// Dublês em memória para o núcleo do Apps Script (Submission.js).
import path from 'node:path';
import { loadShared, root, runScript } from './load-shared.mjs';

loadShared('rules');
loadShared('event-state');
export const handleSubmission = runScript(path.join(root, 'apps-script', 'src', 'Submission.js'), 'handleSubmission');

export const UUID = (n = 1) => `3f2b6c1e-8d4a-4b7e-9c2f-${String(n).padStart(12, '0')}`;
export const CFG = { siteUrl: 'https://makso.onrender.com', appsScriptUrl: '', rsvpDeadline: null,
  event: { title: 'Lançamento maksō', start: '2037-12-12T20:00:00-03:00', end: '2037-12-12T23:00:00-03:00', venueName: '', address: '', mapsUrl: '', dressCode: '', description: '' } };

export function body(over = {}) {
  return JSON.stringify({
    id: UUID(1), presenca: 'sim', nome: 'Mariana Souza', email: 'mariana@gmail.com', whatsapp: '(31) 99876-5432',
    acompanhante: false, acompanhanteNome: '', restricao: '', observacao: '', hp: '', t: 5000, ...over,
  });
}

export function makeDeps({ quota = 10, now = '2037-12-01T12:00:00-03:00', ...over } = {}) {
  const records = [];
  const log = { errors: [], warns: [], error: (...a) => log.errors.push(a), warn: (...a) => log.warns.push(a) };
  const mail = { quota, sent: [] };
  const store = {
    findExisting(id, email, whatsapp) {
      return {
        byId: records.find((r) => r.id === id) || null,
        byContact: records.find((r) => r.email === email || r.whatsapp === whatsapp) || null,
      };
    },
    append(r) { records.push({ ...r }); },
    setEmailStatus(id, status) { records.find((r) => r.id === id).emailStatus = status; },
  };
  const mailer = { remainingQuota: () => mail.quota, send(r) { mail.sent.push(r.id); mail.quota--; } };
  const lock = { acquired: 0, released: 0, acquire() { this.acquired++; }, release() { this.released++; } };
  const rate = { hit: () => true };
  const deps = { store, mailer, lock, rate, now: () => new Date(now), cfg: CFG, log, ...over };
  return { deps, records, log, mail, lock };
}
