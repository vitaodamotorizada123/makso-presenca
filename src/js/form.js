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
   *   demo: boolean, scenario: string|null, now: () => number, reducedMotion?: boolean,
   *   track?: (name: string, data?: Record<string, boolean>) => void}} o
   */
  function mount(o) {
    var root = o.root;
    if (!root) return;
    /** @param {string} sel */
    var $ = function (sel) { return /** @type {HTMLElement} */ (root.querySelector(sel)); };

    var form = /** @type {HTMLFormElement} */ ($('.rsvp__form'));
    var fields = /** @type {HTMLFieldSetElement} */ ($('.rsvp__fields'));
    var choice = $('.choice');
    var restricao = $('.field--restricao');
    var submitBtn = /** @type {HTMLButtonElement} */ ($('.rsvp__submit'));
    var status = $('.rsvp__status');
    var result = $('.rsvp__result');
    var resultTitle = $('.rsvp__result-title');
    var resultText = $('.rsvp__result-text');
    var calendar = $('.rsvp__calendar');
    var thanks = $('.rsvp__thanks'); // frase, data/endereço e logo (desenho do cliente)
    var info = $('.rsvp__info'); // informações importantes
    var gcal = /** @type {HTMLAnchorElement} */ ($('.rsvp__gcal'));
    var store = MaksoStorage.session();
    var mountedAt = o.now();
    var track = o.track || function () {};
    var started = false;
    function markStarted() {
      if (started) return;
      started = true;
      track('iniciou-formulario');
    }
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
        var showDetails = false;
        if (r) {
          var nome = firstName(r.nome);
          switch (r.kind) {
            case 'confirmado':
              title = 'Sua presença foi confirmada.';
              text = o.demo
                ? 'Em produção, enviaremos os detalhes para ' + r.email + '.'
                : 'Enviamos os detalhes para ' + r.email + '.';
              showCal = !!o.cfg.event.start;
              showDetails = true;
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
        thanks.hidden = !showDetails;
        info.hidden = !showDetails;
        result.classList.toggle('is-confirmed', showDetails);
        if (showCal) gcal.href = MaksoCalendar.googleCalendarUrl(o.cfg.event) || '#';
        return;
      }

      // Campos condicionais.
      var vai = s.presenca !== 'nao';
      restricao.hidden = !vai; // convites individuais: sem acompanhante

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
        presenca: 'sim', // quem abre o formulário está confirmando (sem "vou/não vou")
        nome: String(data.get('nome') || ''),
        email: String(data.get('email') || ''),
        whatsapp: String(data.get('whatsapp') || ''),
        acompanhante: false, // convites individuais (pedido do cliente)
        acompanhanteNome: '',
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
          track('erro-validacao');
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
          // Só o desfecho (e se trouxe acompanhante) — nunca nome, e-mail ou WhatsApp.
          if (res.ok === true) {
            if (res.status === 'confirmado') track('confirmou', { acompanhante: payload.acompanhante === true });
            else track('recusou');
          } else if (res.code === 'ja_respondeu') track('ja-respondeu');
          else if (res.code === 'encerrado') track('encerrado');
          else if (res.code !== 'invalido') track('erro-envio');
          dispatch({ type: 'response', res: res, nome: nome, email: email });
          if (state.result) focusResult();
          else if (Object.keys(state.errors).length) focusFirstInvalid();
        });
    });

    form.addEventListener('change', function (e) {
      var t = /** @type {HTMLInputElement} */ (e.target);
      if (t.name !== 'hp') markStarted();
      if (t.name === 'presenca') dispatch({ type: 'choose', presenca: t.value });
    });

    form.addEventListener('input', function (e) {
      var t = /** @type {HTMLInputElement} */ (e.target);
      if (t.name !== 'hp') markStarted();
      if (t.name && state.errors[t.name]) dispatch({ type: 'edit', field: t.name });
    });

    // Enter num campo "next": vai para o próximo campo visível em vez de enviar
    // (enterkeyhint só muda o rótulo da tecla; o envio implícito continuaria).
    form.addEventListener('keydown', function (e) {
      var t = /** @type {HTMLElement} */ (e.target);
      if (e.key !== 'Enter' || e.isComposing || t.tagName !== 'INPUT' || t.getAttribute('enterkeyhint') !== 'next') return;
      e.preventDefault();
      var order = Array.prototype.slice.call(form.querySelectorAll('input[enterkeyhint], textarea[enterkeyhint]'));
      var next = order.slice(order.indexOf(t) + 1).filter(function (el) {
        return !el.disabled && el.getClientRects().length > 0;
      })[0];
      if (next) next.focus();
    });

    // Teclado virtual: a área visível é [offsetTop, offsetTop + height] (em
    // coordenadas da janela de layout). Só rola, e só o necessário, se o campo
    // focado saiu dela.
    if (window.visualViewport) {
      var vv = window.visualViewport;
      vv.addEventListener('resize', function () {
        var el = document.activeElement;
        if (!el || !form.contains(el)) return;
        var r = el.getBoundingClientRect();
        var top = vv.offsetTop + 16;
        var bottom = vv.offsetTop + vv.height - 16;
        if (r.bottom > bottom) window.scrollBy(0, r.bottom - bottom);
        else if (r.top < top) window.scrollBy(0, r.top - top);
      });
    }

    // O navegador pode restaurar os campos (voltar, aba descartada no Android):
    // o estado parte do que está marcado, nunca do zero.
    function syncFromControls() {
      if (state.phase !== 'editando') return;
      // Lê tudo antes de despachar: cada render escreve o estado nos controles.
      var checked = /** @type {HTMLInputElement|null} */ (form.querySelector('input[name=presenca]:checked'));
      if (checked) dispatch({ type: 'choose', presenca: checked.value });
    }
    window.addEventListener('pageshow', syncFromControls);

    syncFromControls();
    render();
  }

  return { mount: mount };
})();
