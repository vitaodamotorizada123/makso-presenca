/* maksō — formulário: liga o DOM ao redutor (form-state.js) e desenha o estado. */
// @ts-check
var MaksoForm = (function () {
  'use strict';

  var ID_KEY = 'makso-rsvp-id';
  var COPY = {
    submit: 'Confirmar presença',
    sending: 'Enviando…',
    retry: 'Tentar de novo',
    erro: 'Não conseguimos enviar agora. Verifique sua conexão e tente de novo.',
    emBreve: 'Confirmações abrem em breve.',
    encerrado: 'As confirmações foram encerradas.',
  };

  /** @param {string} nome */
  function firstName(nome) {
    return String(nome || '').trim().split(/\s+/)[0] || '';
  }

  /**
   * @param {{root: HTMLElement, cfg: MaksoConfig, page: RsvpState, api: typeof MaksoApi,
   *   demo: boolean, scenario: string|null, now: () => number, reducedMotion?: boolean}} o
   */
  function mount(o) {
    var root = o.root;
    if (!root) return;
    /** @param {string} sel */
    var $ = function (sel) { return /** @type {HTMLElement} */ (root.querySelector(sel)); };

    var form = /** @type {HTMLFormElement} */ ($('.rsvp__form'));
    var fields = /** @type {HTMLFieldSetElement} */ ($('.rsvp__fields'));
    var choice = $('.choice');
    var companion = $('.companion');
    var companionName = $('.companion__name');
    var companionSwitch = /** @type {HTMLInputElement} */ ($('input[name=acompanhante]'));
    var restricao = $('.field--restricao');
    var submitBtn = /** @type {HTMLButtonElement} */ ($('.rsvp__submit'));
    var status = $('.rsvp__status');
    var result = $('.rsvp__result');
    var resultTitle = $('.rsvp__result-title');
    var resultText = $('.rsvp__result-text');
    var calendar = $('.rsvp__calendar');
    var gcal = /** @type {HTMLAnchorElement} */ ($('.rsvp__gcal'));
    var store = MaksoStorage.session();
    var mountedAt = o.now();
    var reduced = !!o.reducedMotion;

    var state = MaksoFormState.initialState(o.page);

    /** @param {string} name */
    function control(name) {
      return /** @type {HTMLInputElement|null} */ (form.elements.namedItem(name) instanceof RadioNodeList
        ? form.querySelector('input[name="' + name + '"]')
        : form.elements.namedItem(name));
    }

    function render() {
      var s = state;

      // Página inteira trocada por uma mensagem (evento passado / encerrado).
      var pageMessage = null;
      if (s.page === 'passado') {
        var when = MaksoCalendar.formatWhen(o.cfg.event);
        pageMessage = when ? 'O lançamento aconteceu em ' + when.date + '. Obrigado.' : 'O lançamento já aconteceu. Obrigado.';
      } else if (s.page === 'encerrado') {
        pageMessage = COPY.encerrado;
      }

      var r = s.result;
      var done = !!r || !!pageMessage;
      form.hidden = done;
      result.hidden = !done;
      root.classList.toggle('is-done', done);

      if (done) {
        var title = pageMessage || '';
        var text = '';
        var showCal = false;
        if (r) {
          var nome = firstName(r.nome);
          switch (r.kind) {
            case 'confirmado':
              title = 'Presença confirmada, ' + nome + '.';
              text = o.demo
                ? 'Em produção, enviaremos os detalhes para ' + r.email + '.'
                : 'Enviamos os detalhes para ' + r.email + '.';
              showCal = !!o.cfg.event.start;
              break;
            case 'recusado':
              title = 'Obrigado por avisar, ' + nome + '. Sentiremos sua falta.';
              break;
            case 'ja_respondeu':
              title = 'Sua resposta já está registrada.';
              break;
            case 'encerrado':
              title = COPY.encerrado;
              break;
          }
        }
        if (resultTitle.textContent !== title) resultTitle.textContent = title;
        if (resultText.textContent !== text) resultText.textContent = text;
        resultText.hidden = !text;
        calendar.hidden = !showCal;
        if (showCal) gcal.href = MaksoCalendar.googleCalendarUrl(o.cfg.event) || '#';
        return;
      }

      // Campos condicionais.
      var vai = s.presenca !== 'nao';
      companion.hidden = !vai;
      restricao.hidden = !vai;
      var showName = vai && s.companion;
      if (companionName.hidden === showName) {
        companionName.hidden = !showName;
        if (showName && !reduced) {
          companionName.classList.remove('is-entering');
          void companionName.offsetWidth; // reinicia a animação
          companionName.classList.add('is-entering');
        }
      }
      companionSwitch.checked = s.companion;

      // Erros junto de cada campo.
      MaksoFormState.FIELDS.forEach(function (f) {
        var msg = s.errors[f] || '';
        var err = root.querySelector('#err-' + f);
        if (err && err.textContent !== msg) err.textContent = msg;
        var target = f === 'presenca' ? choice : control(f);
        if (target) {
          if (msg) target.setAttribute('aria-invalid', 'true');
          else target.removeAttribute('aria-invalid');
        }
      });

      // Botão, fieldset e mensagem de status.
      fields.disabled = s.page !== 'aberto';
      var sending = s.phase === 'enviando';
      submitBtn.disabled = sending || s.page !== 'aberto';
      var label = sending ? COPY.sending : s.status === 'erro' ? COPY.retry : COPY.submit;
      if (submitBtn.textContent !== label) submitBtn.textContent = label;

      var msgText = s.status === 'erro' ? COPY.erro : s.status === 'em_breve' ? COPY.emBreve : '';
      if (status.textContent !== msgText) status.textContent = msgText;
      status.classList.toggle('is-error', s.status === 'erro');
      status.classList.toggle('is-info', s.status === 'em_breve');
    }

    /** @param {any} ev */
    function dispatch(ev) {
      state = MaksoFormState.reduce(state, ev);
      render();
    }

    function focusFirstInvalid() {
      for (var i = 0; i < MaksoFormState.FIELDS.length; i++) {
        var f = MaksoFormState.FIELDS[i];
        if (state.errors[f]) {
          var el = control(f);
          if (el) {
            el.focus();
            el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
          }
          return;
        }
      }
    }

    function focusResult() {
      resultTitle.focus({ preventScroll: true });
      resultTitle.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    }

    function collect() {
      var data = new FormData(form);
      return {
        presenca: String(data.get('presenca') || ''),
        nome: String(data.get('nome') || ''),
        email: String(data.get('email') || ''),
        whatsapp: String(data.get('whatsapp') || ''),
        acompanhante: companionSwitch.checked && state.presenca !== 'nao',
        acompanhanteNome: String(data.get('acompanhanteNome') || ''),
        restricao: String(data.get('restricao') || ''),
        observacao: String(data.get('observacao') || ''),
      };
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (state.phase !== 'editando' || state.page !== 'aberto') return;

      var id = store.get(ID_KEY) || o.api.makeId();
      /** @type {Record<string, unknown>} */
      var payload = Object.assign({ id: id }, collect());
      var v = MaksoRules.validateSubmission(payload);
      if (!v.ok) {
        /** @type {Record<string, string>} */
        var errs = {};
        var bad = v.fields;
        Object.keys(bad).forEach(function (k) { if (k !== 'id') errs[k] = bad[k]; });
        if (Object.keys(errs).length) {
          dispatch({ type: 'invalid', fields: errs });
          focusFirstInvalid();
          return;
        }
        id = o.api.makeId(); // id corrompido: gera outro
        payload.id = id;
      } else {
        payload = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (Object.assign({}, v.value)));
      }

      store.set(ID_KEY, id);
      var hp = /** @type {HTMLInputElement|null} */ (form.elements.namedItem('hp'));
      payload.hp = hp ? hp.value : '';
      payload.t = Math.round(o.now() - mountedAt);
      var nome = String(payload.nome || '');
      var email = MaksoRules.normalizeEmail(payload.email);

      dispatch({ type: 'submit' });

      /** @type {ServerResponse} */
      var res = o.api.ERRO;
      Promise.resolve()
        .then(function () {
          return o.api.submit(payload, { endpoint: o.cfg.appsScriptUrl, demo: o.demo, scenario: o.scenario });
        })
        .then(function (r) { res = r; }, function () { res = o.api.ERRO; })
        .then(function () {
          // finally: o envio sempre termina num estado definido.
          var definitive = res.ok === true || (!res.ok && (res.code === 'ja_respondeu' || res.code === 'encerrado'));
          if (definitive) store.remove(ID_KEY);
          dispatch({ type: 'response', res: res, nome: nome, email: email });
          if (state.result) focusResult();
          else if (Object.keys(state.errors).length) focusFirstInvalid();
        });
    });

    form.addEventListener('change', function (e) {
      var t = /** @type {HTMLInputElement} */ (e.target);
      if (t.name === 'presenca') dispatch({ type: 'choose', presenca: t.value });
      else if (t.name === 'acompanhante') dispatch({ type: 'toggleCompanion', on: t.checked });
    });

    form.addEventListener('input', function (e) {
      var t = /** @type {HTMLInputElement} */ (e.target);
      if (t.name && state.errors[t.name]) dispatch({ type: 'edit', field: t.name });
    });

    // Teclado virtual: só rola se o campo focado ficou atrás do teclado.
    if (window.visualViewport) {
      var vv = window.visualViewport;
      vv.addEventListener('resize', function () {
        var el = document.activeElement;
        if (!el || !form.contains(el)) return;
        if (el.getBoundingClientRect().bottom > vv.height - 16) el.scrollIntoView({ block: 'center' });
      });
    }

    render();
  }

  return { mount: mount };
})();
