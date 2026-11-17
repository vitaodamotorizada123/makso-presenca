/* maksō — envio de e-mail e fila de pendentes (claim-then-send). */

function createMailer() {
  return {
    remainingQuota: function () { return MailApp.getRemainingDailyQuota(); },
    send: function (record, cfg) {
      var m = renderEmail(record, cfg);
      var opts = { to: record.email, subject: m.subject, htmlBody: m.html, body: m.text, name: 'maksō' };
      var uid = MaksoCalendar.eventUid(cfg.event);
      var ics = uid ? MaksoCalendar.buildIcs(cfg.event, { uid: uid, now: new Date() }) : null;
      if (ics) opts.attachments = [Utilities.newBlob(ics, 'text/calendar', 'convite-makso.ics')];
      MailApp.sendEmail(opts);
    },
  };
}

/** Gatilho de hora em hora. Nunca segura o lock enquanto envia. */
function processPendingEmails() {
  var deps = getDeps_();
  var claimed = [];
  deps.lock.acquire(10000);
  try {
    deps.store.releaseStale(15, deps.now());
    claimed = deps.store.claimPending(deps.mailer.remainingQuota(), deps.now());
  } finally {
    deps.lock.release();
  }
  if (!claimed.length) return;

  var results = claimed.map(function (r) {
    try {
      deps.mailer.send(r, deps.cfg);
      return [r.id, 'enviado'];
    } catch (e) {
      var semCota = false;
      try { semCota = deps.mailer.remainingQuota() <= 0; } catch (e2) { /* ignora */ }
      if (!semCota) deps.log.error('e-mail (fila)', r.id, e);
      return [r.id, semCota ? 'pendente' : 'falhou'];
    }
  });

  deps.lock.acquire(10000);
  try {
    results.forEach(function (x) { deps.store.setEmailStatus(x[0], x[1]); });
  } finally {
    deps.lock.release();
  }
}
