import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Roda um script clássico no escopo global, como o navegador e o Apps Script
 * fazem (todos os scripts dividem o mesmo escopo global), e devolve o global.
 */
function runScript(file, globalName) {
  vm.runInThisContext(readFileSync(file, 'utf8'), { filename: file });
  return globalThis[globalName];
}

const SHARED = { rules: 'MaksoRules', 'event-state': 'MaksoEventState', calendar: 'MaksoCalendar' };

/** @param {'rules'|'event-state'|'calendar'} name */
export function loadShared(name) {
  return runScript(path.join(root, 'shared', `${name}.js`), SHARED[name]);
}

/** Carrega um script de src/js que define o global `globalName`. */
export function loadSrc(name, globalName) {
  return runScript(path.join(root, 'src', 'js', `${name}.js`), globalName);
}

export { root, runScript };
