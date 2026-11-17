/* maksō — núcleo da confirmação (Apps Script V8).
 * Puro: tudo que fala com o Google chega por `deps` (ver Code.js).
 * Usa os globais MaksoRules e MaksoEventState na hora da chamada. */

/**
 * @param {unknown} rawBody corpo da requisição (texto JSON)
 * @param {{store: any, mailer: any, lock: any, rate: any, now: () => Date, cfg: any, log: any}} deps
 * @returns {{ok: true, status: string} | {ok: false, code: string, campos?: Object}}
 */
function handleSubmission(rawBody, deps) {
  var INVALIDO = { ok: false, code: 'invalido' };
  var ERRO = { ok: false, code: 'erro' };

  // 1. Corpo: precisa ser texto, até 10 KB, JSON de objeto.
  if (typeof rawBody !== 'string' || MaksoRules.utf8Bytes(rawBody) > MaksoRules.LIMITS.bodyBytes) return INVALIDO;
  var raw;
  try { raw = JSON.parse(rawBody); } catch (e) { return INVALIDO; }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return INVALIDO;

  var statusOf = function (presenca) { return presenca === 'nao' ? 'recusado' : 'confirmado'; };

  // 2. Antispam: responde ok sem gravar, para o robô não aprender.
  if ((typeof raw.hp === 'string' && raw.hp !== '') || typeof raw.t !== 'number' || raw.t < 3000) {
    return { ok: true, status: statusOf(raw.presenca) };
  }

  // 3. Validação (as mesmas regras do navegador).
  var v = MaksoRules.validateSubmission(raw);
  if (!v.ok) return { ok: false, code: 'invalido', campos: v.fields };
  var sub = v.value;

  // 4. Prazo.
  var page = MaksoEventState.getRsvpState({ now: deps.now(), cfg: deps.cfg, hasEndpoint: true });
  if (page === 'encerrado' || page === 'passado') return { ok: false, code: 'encerrado' };

  // 5. Limite global de envios.
  try {
    if (!deps.rate.hit()) {
      deps.log.warn('limite de envios atingido', sub.id);
      return ERRO;
    }
  } catch (e) {
    deps.log.error('rate', sub.id, e);
  }

  // 6–9. Sob lock: idempotência, duplicidade e gravação.
  var record;
  var acquired = false;
  try {
    deps.lock.acquire(10000);
    acquired = true;
    var existing = deps.store.findExisting(sub.id, sub.email, sub.whatsapp);
    if (existing.byId) return { ok: true, status: statusOf(existing.byId.presenca) };
    if (existing.byContact) return { ok: false, code: 'ja_respondeu' };

    var emailStatus = 'n.a.';
    if (sub.presenca === 'sim') emailStatus = deps.mailer.remainingQuota() > 0 ? 'enviando' : 'pendente';
    record = Object.assign({}, sub, { createdAt: deps.now(), emailStatus: emailStatus });
    deps.store.append(record);
  } catch (e) {
    deps.log.error('gravação', sub.id, e);
    return ERRO;
  } finally {
    if (acquired) {
      try { deps.lock.release(); } catch (e) { /* lock já expirou */ }
    }
  }

  // 10. E-mail fora do lock (lento). Falha aqui não derruba a confirmação.
  if (record.emailStatus === 'enviando') {
    var final = 'enviado';
    try {
      deps.mailer.send(record, deps.cfg);
    } catch (e) {
      var semCota = false;
      try { semCota = deps.mailer.remainingQuota() <= 0; } catch (e2) { /* ignora */ }
      final = semCota ? 'pendente' : 'falhou';
      if (!semCota) deps.log.error('e-mail', sub.id, e);
    }
    setEmailStatusLocked(deps, sub.id, final);
  }

  return { ok: true, status: statusOf(sub.presenca) };
}

/** Atualiza o status do e-mail com um lock curto (a linha é achada pelo ID). */
function setEmailStatusLocked(deps, id, status) {
  var acquired = false;
  try {
    deps.lock.acquire(5000);
    acquired = true;
    deps.store.setEmailStatus(id, status);
  } catch (e) {
    deps.log.error('status do e-mail', id, e);
  } finally {
    if (acquired) {
      try { deps.lock.release(); } catch (e) { /* ignora */ }
    }
  }
}
