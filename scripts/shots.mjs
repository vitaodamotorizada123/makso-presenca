// Capturas de tela em vários tamanhos, servindo o build com os headers de produção.
// Uso: node scripts/shots.mjs [--config full|empty] [--query "?demo=1"] [--out .screenshots/x] [--full]
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { startBrowser, closeBrowser, VIEWPORTS } from '../tests/helpers/browser.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const config = arg('--config', 'full');
const query = arg('--query', '');
const outDir = path.resolve(arg('--out', '.screenshots/default'));
const fullPage = process.argv.includes('--full');
const wait = Number(arg('--wait', '900'));
mkdirSync(outDir, { recursive: true });

for (const viewport of VIEWPORTS) {
  const desktop = viewport.width >= 1024;
  const { page, close } = await startBrowser({ viewport, isMobile: !desktop, hasTouch: !desktop, config, query, deviceScaleFactor: desktop ? 1 : 2 });
  await page.waitForTimeout(wait);
  const file = path.join(outDir, `${viewport.width}x${viewport.height}.png`);
  await page.screenshot({ path: file, fullPage });
  if (page.__problems.length) console.warn(file, page.__problems);
  console.log(file);
  await close();
}
await closeBrowser();
