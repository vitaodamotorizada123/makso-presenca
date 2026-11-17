// Gera o render.yaml a partir de headers.mjs: `node scripts/render-yaml.mjs > render.yaml`
import { HEADERS } from './headers.mjs';
import { fileURLToPath } from 'node:url';

export function renderYaml() {
  const lines = [
    '# Gerado por scripts/render-yaml.mjs a partir de scripts/headers.mjs — não editar à mão.',
    '# IMPORTANTE: o QR dos convites aponta para a URL deste serviço. Nunca apague nem renomeie o serviço.',
    'services:',
    '  - type: web',
    '    name: makso',
    '    runtime: static',
    '    buildCommand: node scripts/build.mjs',
    '    staticPublishPath: dist',
    '    pullRequestPreviewsEnabled: false',
    '    envVars:',
    '      - key: NODE_VERSION',
    '        value: "22"',
    '    headers:',
  ];
  for (const rule of HEADERS) {
    for (const [name, value] of Object.entries(rule.headers)) {
      lines.push(`      - path: ${JSON.stringify(rule.path)}`);
      lines.push(`        name: ${JSON.stringify(name)}`);
      lines.push(`        value: ${JSON.stringify(value)}`);
    }
  }
  return lines.join('\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.stdout.write(renderYaml());
