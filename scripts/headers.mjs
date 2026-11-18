// Fonte única dos headers HTTP. Usada pelo render.yaml (gerado), pelo
// servidor local e pelos testes e2e — a CSP de produção vale em todo lugar.

export const CSP = [
  "default-src 'self'",
  "script-src 'self' https://cloud.umami.is",
  "style-src 'self' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  "img-src 'self' data:",
  // Umami Cloud: o script vem de cloud.umami.is e envia as visitas para gateway.umami.is/api/send.
  'connect-src https://script.google.com https://script.googleusercontent.com https://gateway.umami.is',
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

/** Regras na ordem em que o Render as aplica: path exato ou prefixo com /*. */
export const HEADERS = [
  {
    path: '/*',
    headers: {
      'Content-Security-Policy': CSP,
      'X-Robots-Tag': 'noindex',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Content-Type-Options': 'nosniff',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },
  },
  { path: '/', headers: { 'Cache-Control': 'no-cache' } },
  { path: '/index.html', headers: { 'Cache-Control': 'no-cache' } },
  { path: '/event.json', headers: { 'Cache-Control': 'no-cache' } },
  { path: '/evento.ics', headers: { 'Cache-Control': 'no-cache' } },
  { path: '/assets/*', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
];

/** @param {string} pattern @param {string} pathname */
function matches(pattern, pathname) {
  if (pattern.endsWith('/*')) return pathname.startsWith(pattern.slice(0, -1));
  return pattern === pathname;
}

/** @param {string} pathname @returns {Record<string, string>} */
export function headersFor(pathname) {
  const out = {};
  for (const rule of HEADERS) if (matches(rule.path, pathname)) Object.assign(out, rule.headers);
  return out;
}
