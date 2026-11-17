import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** @param {'rules'|'event-state'|'calendar'} name */
export function loadShared(name) {
  return require(path.join(root, 'shared', `${name}.js`));
}

/** Carrega um arquivo de src/js (scripts clássicos com module.exports opcional). */
export function loadSrc(name) {
  return require(path.join(root, 'src', 'js', `${name}.js`));
}

export { root };
