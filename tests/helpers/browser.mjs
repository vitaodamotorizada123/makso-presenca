// Navegador de teste: Chrome real (Playwright global) servindo o build em
// https://makso.test com os MESMOS headers de produção (CSP incluída).
import { createRequire } from 'node:module';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from '../../scripts/build.mjs';
import { serveFile } from '../../scripts/static-files.mjs';
import { root } from './load-shared.mjs';

const { chromium } = createRequire('/opt/npm-tools/node_modules/')('playwright');

export const ORIGIN = 'https://makso.test';
let browserPromise;
const builds = new Map();

function getBrowser() {
  browserPromise ??= chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  return browserPromise;
}

/** @param {string} config nome do fixture (full|empty) */
export async function buildFor(config) {
  if (!builds.has(config)) {
    const outDir = mkdtempSync(path.join(os.tmpdir(), `makso-e2e-${config}-`));
    builds.set(config, build({ root, configPath: path.join(root, 'tests', 'fixtures', `config.${config}.json`), outDir }).then(() => outDir));
  }
  return builds.get(config);
}

export async function startBrowser({
  viewport = { width: 390, height: 844 }, isMobile = true, hasTouch = true,
  reducedMotion = 'no-preference', config = 'full', query = '', initScript, deviceScaleFactor = 2,
} = {}) {
  const outDir = await buildFor(config);
  const browser = await getBrowser();
  const context = await browser.newContext({ viewport, isMobile, hasTouch, reducedMotion, deviceScaleFactor });
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (r) => r.abort());
  await context.route(`${ORIGIN}/**`, async (route) => {
    const res = serveFile(outDir, new URL(route.request().url()).pathname);
    await route.fulfill({ status: res.status, headers: res.headers, body: res.body });
  });
  const page = await context.newPage();
  page.__problems = [];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/fonts\.(googleapis|gstatic)\.com/.test(m.location().url || '')) return;
    page.__problems.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => page.__problems.push(`pageerror: ${e.message}`));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => console.error(`CSP: ${e.violatedDirective} ${e.blockedURI}`));
  });
  if (initScript) await page.addInitScript(initScript);
  await page.goto(`${ORIGIN}/${query}`);
  return { page, context, close: () => context.close() };
}

export async function closeBrowser() {
  if (browserPromise) await (await browserPromise).close();
  browserPromise = undefined;
}

export const VIEWPORTS = [
  { width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 },
  { width: 844, height: 390 }, { width: 1440, height: 900 },
];
