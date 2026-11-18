# maksō — duas telas e identidade da marca: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** reorganizar o site no desenho do cliente, com a tela 1 (frase, botão, data 10.12.2026 · 19h30, logo) e a tela 2 (formulário, que só aparece depois do clique), e aplicar a paleta e as fontes do guia da marca.

**Arquitetura:**
- A página continua estática, gerada por `scripts/build.mjs`.
- As duas telas são duas `<section>` no mesmo HTML. A tela 2 começa com `hidden`.
- Um módulo novo, `src/js/screens.js` (`MaksoScreens`), troca as telas com `history.pushState('#confirmar')` e `popstate`.
- Cores e fontes vivem nos tokens CSS. A fonte da marca (IvyOra) entra por um kit do Adobe Fonts opcional em `config.json`. Sem o kit, usa substitutas livres do Google Fonts.

**Stack:** HTML, CSS e JS puros (scripts clássicos com namespace global), Node 22 (`node --test`), Playwright + Chrome no e2e, `tsc` via JSDoc.

**Spec:** `docs/specs/2026-11-17-makso-presenca-design.md`, seções 16 e 16.1. As seções 8 e 14 continuam valendo onde a 16 não diz outra coisa.

## Restrições globais

- **Dependências e scripts:**
  - nenhuma dependência npm nova;
  - scripts clássicos com `var MaksoX = (function(){…})()`, sem `module.exports`, tipados por JSDoc (`npm run typecheck` limpo);
  - nada de `style=`, `on*=` ou `<script>` inline (`tests/build.test.mjs` já confere);
  - CSP sem `unsafe-inline`.
- **Cores exatas:** fundo `#3b2935`, texto `#e5ddd1`, secundário `#b6a5af`, decorativo `#6b5664`, erro `#ff8f99`. Botão principal: fundo `#e5ddd1`, texto `#3b2935`. `theme-color` `#3B2935`.
- **Fontes exatas:**
  - serifada: `"ivyora-text", "Cormorant Garamond", Georgia, serif`;
  - sem serifa: `"Avenir Next", Avenir, "Nunito Sans", system-ui, sans-serif`;
  - Light (300) só com 20 px ou mais; campos e texto corrido em 16 px ou mais, com peso 400.
- **Textos exatos:**
  - frase: "Algumas coisas precisam ser vistas de perto e você foi escolhida para conhecer em primeira mão.";
  - botão da tela 1: "Confirme sua presença";
  - títulos da tela 2: "Dados para contato" e "Sobre a noite";
  - botão de envio: "Confirmar presença";
  - link de volta: "‹ Voltar";
  - rótulo do campo `whatsapp`: "Telefone".
- **Backend intocado:** nomes dos campos (`presenca`, `nome`, `email`, `whatsapp`, `acompanhante`, `acompanhanteNome`, `restricao`, `observacao`, `hp`), validação, Apps Script e e-mail.
- **Toque e movimento:**
  - alvos com 44 px ou mais (botões com 48 px ou mais);
  - `prefers-reduced-motion` desliga flutuação e transições;
  - sem rolagem horizontal nos `VIEWPORTS`.
- **Commits:** terminam com
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01AT1uLj5nbHYmjPSXDHG2AX
  ```

## Foco da revisão

1. **"Voltar" do navegador depois de confirmar:** volta para a tela 1. Ao clicar de novo no botão, a tela 2 mostra o "obrigado", não um formulário vazio.
2. **Link aberto com `/#confirmar` quando as confirmações estão "em breve" ou "encerradas":** abre direto a tela 2 com a mensagem certa, sem erro de console.
3. **Dados digitados, voltar à tela 1, avançar de novo:** os campos continuam preenchidos.
4. **Página restaurada do bfcache ou recarregada com `#confirmar`:** a tela visível bate com o hash.
5. **JavaScript falhou:** o botão "Confirme sua presença" (link `#confirmar`) ainda mostra a tela 2, por CSS `:target`.

---

### Task 1: paleta da marca

**Arquivos:**
- Alterar: `src/styles/tokens.css`, `src/styles/form.css:130` (`#ffffff` fixo), `src/index.html:9`, `scripts/make-icons.mjs:13-14` e a cor da logo no OG.
- Regenerar: `assets/icons/favicon.svg`, `assets/icons/apple-touch-icon.png`, `assets/og.png` (`node scripts/make-icons.mjs`).
- Testes: `tests/e2e/hero.test.mjs`, `tests/build.test.mjs:21`.

**Interfaces:** produz os tokens `--bg #3b2935`, `--text #e5ddd1`, `--text-muted #b6a5af`, `--line rgb(229 221 209 / 0.14)`, `--field-bg rgb(229 221 209 / 0.05)`, `--field-line #b6a5af`, `--accent #e5ddd1`, `--on-accent #3b2935`, `--error #ff8f99` e `--deco #6b5664`. As tarefas seguintes usam só os tokens.

- [ ] **Passo 1: testes que falham.**
  - Em `hero.test.mjs`: `BG = 'rgb(59, 41, 53)'`, `themeColor === '#3B2935'`, e a cor da logo vale `rgb(229, 221, 209)`.
  - No teste "seções de baixo", o fundo aceita `rgb(59, 41, 53)` e o texto continua claro.
  - Em `build.test.mjs`: `html.includes('name="theme-color" content="#3B2935"')`.
- [ ] **Passo 2:** `node --test tests/build.test.mjs` e `npm run test:e2e`. Esperado: FALHA nas cores.
- [ ] **Passo 3: implementar.**
  - Trocar os tokens (comentário do cabeçalho: "paleta do guia maksō, Pantone 6077 C").
  - `form.css:130` passa a usar `var(--accent)`.
  - `theme-color` `#3B2935`.
  - `make-icons.mjs` com `BG = '#3B2935'`, `FG = '#E5DDD1'` e a logo do OG em `FG`. Rodar o script.
- [ ] **Passo 4:** a mesma dupla de comandos. Esperado: PASSA.
- [ ] **Passo 5:** commit com a mensagem "feat: paleta da marca maksō (#3b2935, #e5ddd1, #b6a5af)".

### Task 2: fontes da marca e kit do Adobe Fonts

**Arquivos:**
- Alterar:
  - `src/styles/tokens.css`: `--font-serif`, `--font-sans` e `--font` = `var(--font-sans)`;
  - `src/styles/base.css`: o corpo usa `--font-sans` com peso 400;
  - `src/js/main.js`: `loadFonts`;
  - `scripts/build.mjs`: `validateConfig`, `publicConfig`;
  - `scripts/headers.mjs` e `render.yaml` regenerado;
  - `types/globals.d.ts`: `MaksoConfig.adobeFontsKitId`;
  - `config.json`: `adobeFontsKitId: ""` e linha no `_todo`.
- Criar: `tests/fixtures/config.fonts.json`, cópia de `config.full.json` com `"adobeFontsKitId": "abc1def"`.
- Testes: `tests/build.test.mjs`, `tests/headers.test.mjs`, `tests/e2e/form.test.mjs:135` (o teste da Inter é substituído).

**Interfaces:**
- **`config.adobeFontsKitId`:** `''` ou `/^[a-z0-9]{5,12}$/`. Vai na config pública.
- **CSP:**
  - `style-src 'self' https://fonts.googleapis.com https://use.typekit.net https://p.typekit.net`;
  - `font-src https://fonts.gstatic.com https://use.typekit.net`.
- **Folha do Google Fonts** (`<link rel=stylesheet>` injetado), `display=swap`:
  - Apple sem kit: só `family=Cormorant+Garamond:wght@300;400`;
  - fora da Apple sem kit: `family=Cormorant+Garamond:wght@300;400&family=Nunito+Sans:wght@300;400`;
  - com kit: link `https://use.typekit.net/<id>.css`, e o Google só com Nunito Sans fora da Apple (nada na Apple).

- [ ] **Passo 1: testes que falham.**
  - `build.test.mjs`, teste "adobeFontsKitId: vazio ou id do kit, e vai para a config pública":
    - `validateConfig({...ok, adobeFontsKitId: 'ABC!'})` acusa `adobeFontsKitId`;
    - `'abc1def'` passa;
    - o bundle de `config.fonts.json` contém `"adobeFontsKitId":"abc1def"`.
  - `headers.test.mjs`: a CSP inclui as duas linhas de `style-src` e `font-src` acima.
  - `form.test.mjs`, teste "fontes: Cormorant sempre, Nunito Sans só fora da Apple, IvyOra pelo kit":
    - iPhone sem kit: um único link do Google, `href` contém `Cormorant+Garamond` e não contém `Nunito`;
    - Linux sem kit: contém os dois;
    - Linux com `config: 'fonts'`: existe `link[href="https://use.typekit.net/abc1def.css"]` e o link do Google não contém `Cormorant`;
    - `--font-serif` calculado começa com `"ivyora-text"`.
- [ ] **Passo 2:** `npm test` e `npm run test:e2e`. Esperado: FALHA nos três.
- [ ] **Passo 3: implementar.** `loadFonts({ kitId, apple })` em `main.js`, injetando `preconnect` + `stylesheet`. A plataforma Apple é detectada por `/Mac|iPhone|iPad|iPod/.test(navigator.platform)`, como hoje. Depois, tokens, base, build, headers e `node scripts/render-yaml.mjs > render.yaml`.
- [ ] **Passo 4:** `npm test`, `npm run typecheck` e `npm run test:e2e`. Esperado: PASSA.
- [ ] **Passo 5:** commit com a mensagem "feat: fontes da marca (IvyOra via Adobe Fonts, Cormorant/Avenir/Nunito Sans)".

### Task 3: data curta (10.12.2026 · 19h30), data e endereço do evento

**Arquivos:**
- Alterar: `shared/calendar.js` (nova `formatShort`), `scripts/build.mjs` (`renderWhen` gera HTML), `config.json` (`event.start: "2026-12-10T19:30:00-03:00"`, `event.address: "Rua San Marino, 588 – Vila Castela, Nova Lima – MG"`, `event.mapsUrl: "https://www.google.com/maps/search/?api=1&query=Rua%20San%20Marino%2C%20588%2C%20Vila%20Castela%2C%20Nova%20Lima%20-%20MG"`, tirar do `_todo` as linhas de data e local), `types/globals.d.ts`.
- Testes: `tests/calendar.test.mjs`, `tests/build.test.mjs:46-60`.

**Interfaces:**
- **`MaksoCalendar.formatShort(event) → {date: string, time: string} | null`:**
  - `date` = `DD.MM.AAAA`, `time` = `19h` ou `19h30`;
  - calculado com `MaksoEventState.toLocalParts` (fixo em −03:00).
- **`%%WHEN%%` vira HTML** (deixa de ser texto escapado):
  - com data: `<time class="intro__when" datetime="<event.start escapado>"><span class="intro__date">DD.MM.AAAA</span><span class="intro__time">19h</span></time>`;
  - sem data: `<p class="intro__when intro__when--soon">Data em breve</p>`.

- [ ] **Passo 1: testes que falham.**
  - `calendar.test.mjs`:
    - `formatShort({start:'2026-12-10T19:00:00-03:00'})` → `{date:'10.12.2026', time:'19h'}`;
    - `formatShort({start:'2026-12-10T19:30:00-03:00'}).time === '19h30'`;
    - `formatShort({start:null}) === null`.
  - `build.test.mjs`, evento completo (fixture de 2037-12-12 às 20h):
    - o HTML contém `<span class="intro__date">12.12.2037</span>` e `<span class="intro__time">20h</span>`;
    - o evento sem data contém `Data em breve`.
- [ ] **Passo 2:** `npm test`. Esperado: FALHA (`formatShort is not a function`).
- [ ] **Passo 3:** implementar `formatShort` e `renderWhen`, e acertar `config.json`.
- [ ] **Passo 4:** `npm test` e `npm run typecheck`. Esperado: PASSA.
- [ ] **Passo 5:** commit com a mensagem "feat: data curta 10.12.2026 · 19h30, data e endereço do lançamento".

### Task 4: duas telas e navegação

**Arquivos:**
- Criar: `src/js/screens.js` (`MaksoScreens`) e `src/styles/screens.css`, este último no lugar de `hero.css`, que sai.
- Alterar:
  - `src/index.html`: estrutura nova;
  - `src/js/main.js`: remove o bloco hero/CTA, monta `MaksoScreens` e mantém a entrada uma vez por sessão em `.intro`;
  - `scripts/build.mjs`: `BUNDLE` ganha `src/js/screens.js` antes de `main.js`; `STYLES` troca `hero.css` por `screens.css`; nova substituição `%%LOGO_DECOR%%` (a logo sem `<title>`, sem `aria-labelledby` e com `aria-hidden="true"`);
  - `types/globals.d.ts`.
- Testes:
  - criar `tests/e2e/screens.test.mjs`;
  - reescrever `tests/e2e/hero.test.mjs` para a tela 1;
  - ajustar:
    - `tests/e2e/layout.test.mjs`: `.intro` no lugar de `.hero`; alvos `a.intro__cta`, `a.rsvp__back`;
    - `tests/e2e/form.test.mjs`: todo `startBrowser` abre com `#confirmar` anexado ao `query`;
    - `tests/e2e/analytics.test.mjs`: clicar `.intro__cta`.

**Estrutura** (dentro de `<main>`; o `<footer>` continua como está):

```html
<section class="screen intro" id="inicio" aria-labelledby="intro-title">
  <h1 id="intro-title" class="visually-hidden">%%TITLE%%</h1>
  <div class="intro__content">
    <p class="intro__lede">Algumas coisas precisam ser vistas de perto e você foi escolhida para conhecer em primeira mão.</p>
    <a class="button button--primary intro__cta" href="#confirmar">Confirme sua presença</a>
    %%WHEN%%
  </div>
  <div class="screen__logo">%%LOGO%%</div>
</section>
<section class="screen rsvp" id="confirmar" aria-labelledby="rsvp-title" hidden>
  <a class="rsvp__back" href="#inicio">‹ Voltar</a>
  <h2 id="rsvp-title" class="rsvp__title" tabindex="-1">Dados para contato</h2>
  … (formulário e resultado de hoje, sem mudar os campos)
  <div class="screen__logo screen__logo--small">%%LOGO_DECOR%%</div>
</section>
```

**Interfaces:** `MaksoScreens.mount(o)` retorna `{ show(n, opts), current() }`.
- **Parâmetros de `o`:** `{ intro: HTMLElement, rsvp: HTMLElement, cta: HTMLAnchorElement, back: HTMLAnchorElement, title: HTMLElement, reducedMotion: boolean, onOpen?: () => void }`.
- **`show(n: 1|2, opts?: {push?: boolean})`:**
  - alterna `hidden` entre as duas seções;
  - na tela que entra, aplica `.is-entering` (opacidade e `translateY(12px)` em 280 ms, `var(--ease-out)`, nenhuma com movimento reduzido);
  - `scrollTo(0, 0)`;
  - foca `title` (tela 2) ou `cta` (tela 1) com `{preventScroll: true}`;
  - com `push`, chama `history.pushState({makso: 2}, '', '#confirmar')`.
- **Clique no CTA:** `preventDefault`, chama `onOpen()` (que dispara `track('clicou-confirmar-topo')`) e `show(2, {push: true})`.
- **Clique no Voltar:**
  - se `history.state && history.state.makso === 2`, chama `history.back()`;
  - senão, `show(1)` + `history.replaceState(null, '', location.pathname + location.search)`.
- **`popstate` e `pageshow`:** `show(location.hash === '#confirmar' ? 2 : 1)`.
- **Montagem:** se `location.hash === '#confirmar'`, chama `show(2)`.
- **CSS sem JS:** `#confirmar:target { display: block !important; }`.

- [ ] **Passo 1: testes que falham.** `tests/e2e/screens.test.mjs`, com `query: '?demo=1'` onde for preciso enviar:
  - "o formulário só aparece depois do clique em Confirme sua presença": a tela 2 `hidden`, o `form` sem retângulos visíveis e o `.intro__lede` com o texto exato. Depois de `click('.intro__cta')`: a tela 1 `hidden`, `location.hash === '#confirmar'`, `document.activeElement.id === 'rsvp-title'`, e o título diz "Dados para contato".
  - "voltar do navegador retorna à tela 1 e mantém o que foi digitado": `fill nome`, `page.goBack()`, a tela 1 visível; `click cta` e o valor de `nome` continua igual.
  - "link ‹ Voltar volta à tela 1": `click('.rsvp__back')` e a tela 1 visível, hash vazio.
  - "abrir com #confirmar mostra a tela 2 direto": `query: '#confirmar'` e a tela 2 visível.
  - "#confirmar com confirmações em breve mostra a mensagem, sem erro": `config: 'full'` sem demo, `query: '#confirmar'`, o `.rsvp__status` contém "em breve" e `page.__problems` vazio.
  - "depois de confirmar, voltar e abrir de novo mostra o obrigado": `fill` + `submit` (demo), `goBack`, `click cta`, e `.rsvp__result` visível.
  - "sem JavaScript, o botão ainda abre a tela 2 (CSS :target)": contexto com `javaScriptEnabled: false` (adicionar a opção `javaScriptEnabled` em `startBrowser`); `click('.intro__cta')` e o `#confirmar` com retângulos visíveis.
  - "com movimento reduzido, troca sem transição": `reducedMotion: 'reduce'` e `getComputedStyle(rsvp).transitionDuration` ou `animationName` em `0s`/`none` depois do clique.
  
  Em `hero.test.mjs`, a tela 1:
  - `.intro` tem altura igual ou maior que `innerHeight`;
  - a logo (`.screen__logo .logo`) fica abaixo do `.intro__when` e flutua (`makso-float`, `infinite`);
  - com movimento reduzido, fica parada;
  - não há canvas.
- [ ] **Passo 2:** `npm run test:e2e`. Esperado: FALHA nos testes novos.
- [ ] **Passo 3: implementar.**
  - Markup, `screens.js`, `screens.css` (tela 1: `min-height: 100svh`, grid de três linhas `1fr auto 1fr` com o conteúdo no meio e a logo no pé; frase em `--font-serif` 300, `clamp(26px, 7vw, 40px)`, até `20ch` de largura; `.intro__when` com `font-variant-numeric: tabular-nums`, data e hora em linhas separadas, `--text-muted`; logo com `--logo-w: min(40vw, 200px)` e `--float: 6px`; `.screen__logo--small` com `min(28vw, 140px)`).
  - Mudanças em `main.js` e `build.mjs`, e remoção de `hero.css`.
- [ ] **Passo 4:** `npm test`, `npm run typecheck` e `npm run test:e2e`. Esperado: tudo PASSA.
- [ ] **Passo 5:** commit com a mensagem "feat: duas telas — formulário só depois de Confirme sua presença".

### Task 5: tela 2 em grupos, "Telefone" e detalhes no "obrigado"

**Arquivos:**
- Alterar:
  - `src/index.html`: dois `fieldset.group`, com `legend.group__title` "Dados para contato" (o título `h2` da tela já diz isso; a legenda do primeiro grupo fica `visually-hidden`) e "Sobre a noite". Ordem: nome, email, whatsapp (rótulo "Telefone") | presenca, acompanhante, restricao, observacao. A seção `.details` sai da página, e o `%%DETAILS%%` entra num `<dl class="rsvp__details" hidden>` dentro de `.rsvp__result`, depois do texto;
  - `scripts/build.mjs`: `renderDetails` omite linhas vazias, sem "Em breve", e devolve `''` quando não há nada;
  - `src/js/form.js`: mostra `.rsvp__details` só em `confirmado` quando ele tem filhos; a ordem de `focusFirstInvalid` segue a ordem dos campos (`MaksoFormState.FIELDS`);
  - `src/js/form-state.js`: `FIELDS` na ordem nova, se a ordem do primeiro erro depender disso;
  - `src/styles/sections.css` (estilos de `.rsvp__details`) e `src/styles/form.css` (grupos).
- Testes: `tests/e2e/form.test.mjs` e `tests/build.test.mjs`.

**Interfaces:**
- **Consome** `MaksoScreens` (Tarefa 4).
- **`renderDetails(cal, event)`:** devolve as linhas `Quando` (com `formatWhen` por extenso), `Onde` (se houver local ou endereço) e `Traje` (se houver), ou `''`.

- [ ] **Passo 1: testes que falham.**
  - `form.test.mjs`:
    - "tela 2: Dados para contato (Nome, E-mail, Telefone) antes de Sobre a noite": a ordem DOM dos `name` é `['nome','email','whatsapp','presenca','presenca','acompanhante','acompanhanteNome','restricao','observacao']`, e o rótulo de `#f-whatsapp` é "Telefone";
    - "envio vazio foca o primeiro inválido": o foco cai em `input[name=nome]`; o teste existente muda de expectativa;
    - "obrigado mostra quando/onde": no fixture full com local, depois de confirmar, `.rsvp__details` está visível e contém o nome do local; em "não vou", fica escondido.
  - `build.test.mjs`: o fixture `empty` não tem `class="details"` nem "Em breve" dentro do `dl`.
- [ ] **Passo 2:** `npm test` e `npm run test:e2e`. Esperado: FALHA nos novos.
- [ ] **Passo 3:** implementar.
- [ ] **Passo 4:** `npm test`, `npm run typecheck` e `npm run test:e2e`. Esperado: PASSA.
- [ ] **Passo 5:** commit com a mensagem "feat: tela 2 em grupos, rótulo Telefone e detalhes no obrigado".

### Task 6: documentação, revisão final e publicação

**Arquivos:** `README.md` (seções "Preencher os dados do evento", fontes e Adobe Fonts, design).

- [ ] **Passo 1:** o README explica as duas telas, a paleta e como ligar o kit do Adobe Fonts (`adobeFontsKitId`: no Web Project do Adobe Fonts, adicionar IvyOra Text Light e copiar o ID do kit).
- [ ] **Passo 2:** `npm test`, `npm run typecheck` e `npm run test:e2e`. Esperado: tudo PASSA.
- [ ] **Passo 3:** revisão final da branch inteira por um revisor novo, seguindo `executing-plans`.
- [ ] **Passo 4:** merge na `main` e push. Conferir no ar, no Chrome:
  - a tela 1;
  - o clique leva à tela 2;
  - o voltar retorna;
  - nenhuma violação de CSP;
  - o Umami registra `/` e `/#confirmar`.
