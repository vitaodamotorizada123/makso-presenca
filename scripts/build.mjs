// Build do site (dist/) a partir de config.json. Sem dependências.
// Uso: node scripts/build.mjs [--config caminho] [--out pasta]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Ordem do bundle do navegador. Arquivos que ainda não existem são pulados. */
export const BUNDLE = [
  'shared/rules.js',
  'shared/event-state.js',
  'shared/calendar.js',
  'src/js/storage.js',
  'src/js/analytics.js',
  'src/js/api.js',
  'src/js/form-state.js',
  'src/js/form.js',
  'src/js/screens.js',
  'src/js/main.js',
];

export const STYLES = ['tokens', 'base', 'screens', 'sections', 'form'].map((n) => `src/styles/${n}.css`);

const ISO_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?([+-]\d{2}:\d{2}|Z)$/;
const APPS_SCRIPT = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @returns {string[]} lista de problemas; vazia = ok */
export function validateConfig(cfg) {
  const problems = [];
  if (!cfg || typeof cfg !== 'object') return ['config: não é um objeto'];
  if (typeof cfg.siteUrl !== 'string' || !/^https:\/\/[^/\s]+/.test(cfg.siteUrl)) problems.push('siteUrl: precisa ser https://…');
  if (cfg.appsScriptUrl !== '' && !APPS_SCRIPT.test(String(cfg.appsScriptUrl))) problems.push('appsScriptUrl: vazio ou https://script.google.com/macros/s/…/exec');
  if (cfg.umamiWebsiteId !== undefined && cfg.umamiWebsiteId !== '' && !UUID.test(String(cfg.umamiWebsiteId))) problems.push('umamiWebsiteId: vazio ou o Website ID do Umami (UUID)');
  if (cfg.adobeFontsKitId !== undefined && cfg.adobeFontsKitId !== '' && !/^[a-z0-9]{5,12}$/.test(String(cfg.adobeFontsKitId))) problems.push('adobeFontsKitId: vazio ou o ID do kit do Adobe Fonts (ex.: abc1def)');
  const ev = cfg.event || {};
  for (const k of ['title', 'venueName', 'address', 'mapsUrl', 'dressCode', 'description']) {
    if (typeof ev[k] !== 'string') problems.push(`event.${k}: precisa ser texto (pode ser "")`);
  }
  if (ev.mapsUrl && !/^https:\/\//.test(ev.mapsUrl)) problems.push('event.mapsUrl: precisa ser https://…');
  const dates = { 'event.start': ev.start, 'event.end': ev.end, rsvpDeadline: cfg.rsvpDeadline };
  for (const [k, v] of Object.entries(dates)) {
    if (v !== null && v !== undefined && !(typeof v === 'string' && ISO_OFFSET.test(v) && !isNaN(Date.parse(v)))) {
      problems.push(`${k}: data ISO com fuso, ex.: 2026-12-12T20:00:00-03:00`);
    }
  }
  if (ev.end && !ev.start) problems.push('event.end: sem event.start');
  if (ev.start && ev.end && Date.parse(ev.end) <= Date.parse(ev.start)) problems.push('event.end: precisa ser depois de event.start');
  if (cfg.rsvpDeadline && ev.start && Date.parse(cfg.rsvpDeadline) > Date.parse(ev.start)) problems.push('rsvpDeadline: precisa ser antes de event.start');
  return problems;
}

/** Subconjunto público da config (vai para o navegador e para o event.json). */
export function publicConfig(cfg) {
  const { siteUrl, appsScriptUrl, rsvpDeadline, event, umamiWebsiteId, adobeFontsKitId } = cfg;
  return { siteUrl, appsScriptUrl, rsvpDeadline: rsvpDeadline ?? null, event, umamiWebsiteId: umamiWebsiteId || '', adobeFontsKitId: adobeFontsKitId || '' };
}

const hash8 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 8);

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Carrega os scripts compartilhados num contexto isolado (como no navegador). */
function sharedContext(root) {
  const ctx = vm.createContext({});
  for (const f of ['shared/rules.js', 'shared/event-state.js', 'shared/calendar.js']) {
    vm.runInContext(readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}

/** Data do convite (tela 1): 10.12.2026 / 19h30, em duas linhas. Devolve HTML já escapado. */
function renderWhen(cal, event) {
  const w = cal.formatShort(event);
  if (!w) return '<p class="intro__when intro__when--soon">Data em breve</p>';
  return `<time class="intro__when" datetime="${escapeHtml(event.start)}"><span class="intro__date">${escapeHtml(w.date)}</span> <span class="intro__time">${escapeHtml(w.time)}</span></time>`;
}

/** Quando/Onde/Traje para o "obrigado" — só as linhas preenchidas; '' se não houver nada. */
function renderDetails(cal, event) {
  const rows = [];
  const w = cal.formatWhen(event);
  if (w) rows.push(['Quando', `<time datetime="${escapeHtml(event.start)}">${escapeHtml(w.date)}, às ${escapeHtml(w.time)}</time>`]);
  if (event.venueName || event.address) {
    rows.push(['Onde', [
      event.venueName ? `<span class="details__venue">${escapeHtml(event.venueName)}</span>` : '',
      event.address ? `<span class="details__address">${escapeHtml(event.address)}</span>` : '',
      event.mapsUrl ? `<a class="details__map" href="${escapeHtml(event.mapsUrl)}" target="_blank" rel="noopener">Ver no mapa</a>` : '',
    ].filter(Boolean).join('')]);
  }
  if (event.dressCode) rows.push(['Traje', escapeHtml(event.dressCode)]);
  return rows.map(([dt, dd]) => `<div class="details__row"><dt>${dt}</dt><dd>${dd}</dd></div>`).join('');
}

function assertSafeOutDir(root, outDir) {
  const abs = path.resolve(outDir);
  const inside = (base) => abs.startsWith(path.resolve(base) + path.sep);
  if (!inside(root) && !inside(os.tmpdir())) {
    throw new Error(`outDir fora do projeto e do tmp: ${abs}`);
  }
  return abs;
}

/**
 * @param {{root?: string, configPath?: string, outDir?: string}} o
 * @returns {Promise<{files: string[], hash: string, outDir: string}>}
 */
export async function build({ root = ROOT, configPath = path.join(root, 'config.json'), outDir = path.join(root, 'dist') } = {}) {
  const out = assertSafeOutDir(root, outDir);
  const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  const problems = validateConfig(cfg);
  if (problems.length) throw new Error(`config inválida (${configPath}):\n- ${problems.join('\n- ')}`);
  const pub = publicConfig(cfg);

  // JS: config + scripts, na ordem do BUNDLE.
  const parts = [`window.MAKSO_CONFIG = ${JSON.stringify(pub)};`];
  for (const f of BUNDLE) {
    const p = path.join(root, f);
    if (existsSync(p)) parts.push(`/* ${f} */\n${readFileSync(p, 'utf8')}`);
  }
  const js = parts.join('\n\n');
  const css = STYLES.filter((f) => existsSync(path.join(root, f))).map((f) => readFileSync(path.join(root, f), 'utf8')).join('\n');
  const hash = hash8(js);
  const appJs = `assets/app.${hash}.js`;
  const stylesCss = `assets/styles.${hash8(css)}.css`;

  const ctx = sharedContext(root);
  const cal = ctx.MaksoCalendar;

  const logo = readFileSync(path.join(root, 'assets/brand/makso-logo.svg'), 'utf8')
    .trim()
    .replace('<svg ', '<svg class="logo" focusable="false" ');
  const replacements = {
    '%%LOGO%%': logo,
    // Segunda cópia (pé da tela 2): só decoração — sem <title>/id duplicado e fora do leitor de tela.
    '%%LOGO_DECOR%%': logo
      .replace(/<title[^>]*>[\s\S]*?<\/title>\s*/, '')
      .replace(/ role="img"/, '')
      .replace(/ aria-labelledby="[^"]*"/, ' aria-hidden="true"'),
    '%%APP_JS%%': appJs,
    '%%CSS%%': stylesCss,
    '%%SITE_URL%%': escapeHtml(pub.siteUrl.replace(/\/$/, '')),
    '%%TITLE%%': escapeHtml(pub.event.title),
    '%%DESCRIPTION%%': escapeHtml(pub.event.description),
    '%%WHEN%%': renderWhen(cal, pub.event),
    '%%DETAILS%%': renderDetails(cal, pub.event),
  };
  let html = readFileSync(path.join(root, 'src/index.html'), 'utf8');
  for (const [k, v] of Object.entries(replacements)) html = html.split(k).join(v);
  if (html.includes('%%')) throw new Error(`placeholder sem valor: ${html.match(/%%\w+%%/)?.[0]}`);

  rmSync(out, { recursive: true, force: true });
  mkdirSync(path.join(out, 'assets'), { recursive: true });
  const files = [];
  const write = (rel, content) => { writeFileSync(path.join(out, rel), content); files.push(rel); };
  const copy = (from, rel) => { copyFileSync(path.join(root, from), path.join(out, rel)); files.push(rel); };

  write('index.html', html);
  write(appJs, js);
  write(stylesCss, css);
  write('event.json', JSON.stringify({ ...pub, version: hash }, null, 2) + '\n');
  write('robots.txt', 'User-agent: *\nDisallow: /\n');
  const ics = cal.buildIcs(pub.event, { uid: cal.eventUid(pub.event) || 'lancamento@makso', now: new Date() });
  if (ics) write('evento.ics', ics);
  copy('assets/icons/favicon.svg', 'favicon.svg');
  copy('assets/icons/apple-touch-icon.png', 'apple-touch-icon.png');
  copy('assets/og.png', 'og.png');

  return { files, hash, outDir: out };
}

/**
 * Pacote do Apps Script: config embutida (reserva) + regras compartilhadas + src.
 * Colar estes arquivos no editor do Apps Script (ver README).
 * @param {{root?: string, configPath?: string, outDir?: string, version: string}} o
 */
export async function buildAppsScript({ root = ROOT, configPath = path.join(root, 'config.json'), outDir = path.join(root, 'apps-script', 'dist'), version }) {
  const out = assertSafeOutDir(root, outDir);
  const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
  const problems = validateConfig(cfg);
  if (problems.length) throw new Error(`config inválida (${configPath}):\n- ${problems.join('\n- ')}`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const files = [];
  const write = (rel, content) => { writeFileSync(path.join(out, rel), content); files.push(rel); };
  write('Config.js', `/* Gerado por scripts/build.mjs — reserva usada quando o site não responde. */\nvar MAKSO_CONFIG = ${JSON.stringify({ ...publicConfig(cfg), version }, null, 2)};\n`);
  const shared = { 'Rules.js': 'shared/rules.js', 'EventState.js': 'shared/event-state.js', 'Calendar.js': 'shared/calendar.js' };
  for (const [name, from] of Object.entries(shared)) write(name, readFileSync(path.join(root, from), 'utf8'));
  for (const f of readdirSync(path.join(root, 'apps-script', 'src')).filter((n) => n.endsWith('.js')).sort()) {
    write(f, readFileSync(path.join(root, 'apps-script', 'src', f), 'utf8'));
  }
  write('appsscript.json', readFileSync(path.join(root, 'apps-script', 'appsscript.json'), 'utf8'));
  return { files, outDir: out };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name) => {
    const i = process.argv.indexOf(name);
    return i > -1 ? process.argv[i + 1] : undefined;
  };
  const configPath = arg('--config') ? path.resolve(arg('--config')) : undefined;
  const outDir = arg('--out') ? path.resolve(arg('--out')) : undefined;
  build({ configPath, outDir })
    .then(async (r) => {
      console.log(`build ok → ${r.outDir} (${r.files.length} arquivos, versão ${r.hash})`);
      const gas = await buildAppsScript({ configPath, version: r.hash });
      console.log(`apps script → ${gas.outDir} (${gas.files.length} arquivos)`);
    })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
