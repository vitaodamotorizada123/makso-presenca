/* maksō — config do evento lida do site (event.json), com cache de 10 min.
 * Assim, mudar data/local/prazo no config.json e publicar o site basta:
 * o script não precisa ser colado de novo. Sem site, usa o MAKSO_CONFIG embutido. */

var CONFIG_CACHE_KEY = 'makso-config';

function isValidConfig_(c) {
  if (!c || typeof c !== 'object' || !c.event || typeof c.event !== 'object') return false;
  var okDate = function (v) { return v === null || v === undefined || (typeof v === 'string' && !isNaN(Date.parse(v))); };
  return okDate(c.rsvpDeadline) && okDate(c.event.start) && okDate(c.event.end) && typeof c.event.title === 'string';
}

/** @param {{fetch: function(string): {code: number, text: string}, cache: any, fallback: any, log?: any}} o */
function loadConfig(o) {
  try {
    var cached = o.cache.get(CONFIG_CACHE_KEY);
    if (cached) {
      var c = JSON.parse(cached);
      if (isValidConfig_(c)) return c;
    }
  } catch (e) { /* cache corrompido: busca de novo */ }
  try {
    var r = o.fetch(String(o.fallback.siteUrl).replace(/\/$/, '') + '/event.json');
    if (r.code === 200) {
      var fresh = JSON.parse(r.text);
      if (isValidConfig_(fresh)) {
        o.cache.put(CONFIG_CACHE_KEY, JSON.stringify(fresh), 600);
        return fresh;
      }
    }
  } catch (e) {
    if (o.log) o.log.warn('event.json indisponível, usando a config embutida', e);
  }
  return o.fallback;
}
