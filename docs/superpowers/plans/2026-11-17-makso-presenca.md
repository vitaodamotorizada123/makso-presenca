# maksō — Página de presença: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** Página estática, feita primeiro para celular, com a logo maksō num vidro líquido. O convidado confirma presença por um formulário que grava numa planilha Google via Apps Script, com e-mail e agenda.

**Arquitetura:**
- HTML/CSS/JS puros, sem framework. Um build em Node sem dependências gera `dist/` (Render, static site) e `apps-script/dist/`.
- As regras ficam em `shared/` como scripts clássicos com namespace global (`MaksoRules`, `MaksoEventState`, `MaksoCalendar`), iguais no navegador, no Apps Script V8 e nos testes em Node.
- No Apps Script, o núcleo puro (`handleSubmission`, dependências injetadas) fica separado dos adaptadores Google.

**Stack:**
- Node 22 (`node --test`, `node:http`, `node:vm`, `node:crypto`) e WebGL 1.
- Apps Script V8 + Google Sheets.
- Playwright 1.63 global (`/opt/npm-tools/node_modules/playwright`) + `/usr/bin/google-chrome`.
- `tsc` global para checar JSDoc; `rsvg-convert`; `qrcodegen.py` (Nayuki, MIT) vendorizado.

**Spec:** `docs/specs/2026-11-17-makso-presenca-design.md`. Leia as seções 5–9 antes de qualquer tarefa de interface.
**Auditorias incorporadas:** `reviews/audit-as-backend-eng.md`, `reviews/audit-as-frontend-eng.md`. Os códigos `[B-C1]`, `[F-R3]` etc. ligam cada decisão ao achado.

## Restrições globais

- **Dependências**: zero dependências npm (nem em dev). Playwright e `tsc` vêm do caminho global via `createRequire('/opt/npm-tools/node_modules/')`.
- **Navegadores**: iOS Safari 15.4+, Chrome Android 100+, desktop atual. Nada além de ES2020 no navegador. Sem `inert` (Safari < 15.5) `[F-R1]`.
- **Idioma e fuso**: pt-BR. Fuso `America/Sao_Paulo` com **offset fixo −03:00** (sem horário de verão desde 2019). Data formatada à mão, sem `Intl`.
- **Cores**:
  - marca/texto/ações `#1b0001`;
  - fundos `#ffffff`, `#f5f5f7`; hero `#000000`→`#272729`;
  - secundário `#7a7a7a` (claro) / `#cccccc` (escuro);
  - hairline `#e0e0e0`; erro `#c4001a`.
- **Raios e espaçamento**: pill `9999px`, campos `11px`, cards `18px`. Base 8px; seções 80px (48px até 734px).
- **Fonte**: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, "Helvetica Neue", Arial, sans-serif` (sem `system-ui`). A folha da Inter (`wght@400;600`, `latin-ext`, `display=swap`) é **injetada por JS só fora de plataformas Apple**, nunca como `<link>` bloqueante `[F-C4]`.
- **Texto**: corpo e inputs 17px / 1.47 / `-0.374px`. Títulos peso 600 com tracking negativo. `text-size-adjust: 100%` `[F-R11]`.
- **Movimento**:
  - transições só em propriedades explícitas, 150–250ms, `cubic-bezier(0.23, 1, 0.32, 1)`;
  - `:active { transform: scale(0.97) }`;
  - hover só em `@media (hover: hover) and (pointer: fine)`;
  - toda animação respeita `prefers-reduced-motion`.
- **Mobile primeiro**: todas as regras da seção 8.1 do spec. Sem rolagem horizontal em 360/375/390/414/430, 844×390 e 1440. O hero usa `min-height: 100svh` (fallback `100vh`) `[F-R8]`.
- **Contrato HTTP** exatamente como a seção 7 do spec.
- **Modo demo** só com `?demo=1` ou em `localhost`/`127.0.0.1`. Sem endpoint e sem demo → `em_breve`.
- **HTML**: nenhum atributo `style=` nem `on*=`, nenhum `<script>` inline; a CSP proíbe `[F-C1]`. Os headers vêm de `scripts/headers.mjs` e valem também no dev e nos testes.
- **Indexação e rodapé**: `noindex` (meta + `robots.txt` + header). Rodapé `Desenvolvido por DIMAK Soluções` → `https://dimaksolucoes.com.br` (`target="_blank" rel="noopener"`).
- **Textos**: os da seção 6 do spec e os deste plano são literais.
- **Commits** terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` e `Claude-Session: https://claude.ai/code/session_01AT1uLj5nbHYmjPSXDHG2AX`.

## Foco de revisão

1. **Toque duplo / reenvio em conexão ruim** → uma linha só. O `id` persiste até um resultado definitivo (com `safeStorage`), o redutor ignora `submit` durante o `enviando` e o servidor é idempotente. Testes nas Tasks 5 e 6.
2. **WhatsApp em formatos variados, e a planilha devolvendo número** → a mesma chave de duplicidade. Testes nas Tasks 1 e 7 `[B-C1]`.
3. **E-mail com maiúsculas/espaços** → normalizado antes de comparar e gravar. Testes nas Tasks 1 e 6.
4. **Texto livre com emoji, acento, quebra de linha ou `=` no início** → intacto (só com o prefixo `'`), sem quebrar o `.ics` nem o e-mail. Testes nas Tasks 1, 2 e 7.
5. **Navegador interno (Instagram/WhatsApp) e iPhone pequeno com teclado aberto** → `sessionStorage` bloqueado não impede confirmar; o campo focado continua visível. Testes na Task 5.

---

## Estrutura de arquivos

```
config.json                 fonte única: siteUrl, appsScriptUrl, rsvpDeadline, event{…}
package.json                scripts: test, test:e2e, typecheck, build, dev
jsconfig.json, types/globals.d.ts   checkJs para shared/ e src/js/
render.yaml                 GERADO por scripts/render-yaml.mjs a partir de headers.mjs
shared/rules.js             validação, normalização, sanitização, mensagens
shared/event-state.js       prazo e estado da página
shared/calendar.js          formatWhen, googleCalendarUrl, buildIcs
src/index.html              template (%%…%%), conteúdo do evento renderizado no build
src/styles/{tokens,base,hero,sections,form}.css
src/js/storage.js           MaksoStorage.safe (sessionStorage à prova de bloqueio)
src/js/api.js               submit, parseResponse, detectDemo, makeId
src/js/form-state.js        redutor puro do formulário
src/js/form.js              render(state) + eventos do DOM
src/js/glass.js             hero WebGL + fallback
src/js/main.js              fontes, estado da página, montagem
apps-script/src/{Submission,SheetStore,Mail,EmailTemplate,RemoteConfig,Code}.js
apps-script/appsscript.json
scripts/{build,dev-server,headers,render-yaml,shots}.mjs
scripts/qr.py, scripts/vendor/qrcodegen.py
tests/*.test.mjs, tests/e2e/*.test.mjs, tests/fixtures/, tests/helpers/
assets/brand/makso-logo.svg (existe), assets/og.png, assets/icons/
```

Padrão dos arquivos compartilhados e de `src/js` (serve no navegador, no Apps Script e no `require`):

```js
var MaksoRules = (function () { /* … */ return { /* api */ }; })();
if (typeof module !== 'undefined') module.exports = MaksoRules;
```

Nenhum código de topo referencia um global de outro arquivo. Tudo é resolvido na hora da chamada `[B-R11]`.

---

### Task 1: Regras compartilhadas + base do projeto

**Arquivos:**
- Criar: `package.json`, `.gitignore` (`dist/ .dev/ .screenshots/ apps-script/dist/ node_modules/`), `config.json`, `jsconfig.json`, `types/globals.d.ts`, `shared/rules.js`, `tests/helpers/load-shared.mjs`
- Teste: `tests/rules.test.mjs`

**Interfaces:**
- Produz `MaksoRules`:
  - `LIMITS = {nome:[2,80], email:[3,120], acompanhanteNome:[2,80], restricao:[0,300], observacao:[0,500], bodyBytes:10240}`;
  - `MESSAGES`;
  - `normalizeEmail(s): string`;
  - `normalizeWhatsapp(s): string` (`''` se inválido);
  - `validateSubmission(raw): {ok:true, value: Submission} | {ok:false, fields: Record<string,string>}`;
  - `sanitizeCell(v): string`;
  - `isUuid(s): boolean`;
  - `utf8Bytes(s): number` `[B-R12]`.
- `Submission = {id, presenca:'sim'|'nao', nome, email, whatsapp, acompanhante:boolean, acompanhanteNome, restricao, observacao}`, com strings aparadas e `email`/`whatsapp` normalizados.
- `MESSAGES`:
  - `presenca:'Escolha se você vai.'`
  - `nome:'Informe seu nome.'`
  - `email:'Informe um e-mail válido.'`
  - `whatsapp:'Informe um WhatsApp com DDD.'`
  - `acompanhanteNome:'Informe o nome do acompanhante.'`
  - `tooLong:(max)=>'Texto muito longo (máx. '+max+').'`
  - `id:'invalido'`
- `loadShared(name)` em `tests/helpers/load-shared.mjs`.
- `config.json`:
  - `{siteUrl:"https://makso.onrender.com", appsScriptUrl:"", rsvpDeadline:null, event:{title:"Lançamento maksō", start:null, end:null, venueName:"", address:"", mapsUrl:"", dressCode:"", description:"Você está convidado para o lançamento da maksō."}}`;
  - mais `"_todo"`, com o que falta.
- Scripts do `package.json`:
  - `test` = `node --test tests/*.test.mjs`
  - `test:e2e` = `node --test --test-concurrency=1 tests/e2e/*.test.mjs`
  - `typecheck` = `node /opt/npm-tools/node_modules/typescript/bin/tsc -p jsconfig.json`
  - `build` = `node scripts/build.mjs`
  - `dev` = `node scripts/dev-server.mjs`
- `jsconfig.json`: `checkJs`, `noEmit`, `strict`, `lib: ["ES2020","DOM"]`, `include: ["shared","src/js","types"]`. Os typedefs JSDoc de `Submission`, `ServerResponse` e `RsvpState` ficam em `types/globals.d.ts`, junto com a declaração dos namespaces globais `[F-N1]`.

- [ ] **Passo 1: Escrever os testes que falham**
  - `normalizeEmail('  Mariana@Gmail.COM ') === 'mariana@gmail.com'`.
  - `normalizeWhatsapp`:
    - `'(31) 99876-5432'` → `'5531998765432'`
    - `'+55 31 99876-5432'` → `'5531998765432'`
    - `'31 3222-1100'` → `'553132221100'`
    - `'5531998765432'` → igual
    - `5531998765432` (número) → `'5531998765432'`
    - `'99876-5432'` → `''`
    - `'123'` → `''`
  - `validateSubmission`:
    - `sim` com `acompanhante:true, acompanhanteNome:' João '` → ok e `'João'`;
    - `presenca:'talvez'` → `'Escolha se você vai.'`;
    - sem `nome` → `'Informe seu nome.'`;
    - `email:'mariana@'` → `'Informe um e-mail válido.'`;
    - `whatsapp:'123'` → `'Informe um WhatsApp com DDD.'`;
    - `acompanhante:true` sem nome → `'Informe o nome do acompanhante.'`;
    - `observacao` com 501 caracteres → `'Texto muito longo (máx. 500).'`;
    - `acompanhante:'yes'` → `false`;
    - `nao` com acompanhante/restrição → limpos (`false`, `''`, `''`);
    - `id:'abc'` → `fields.id === 'invalido'`;
    - `'Zoë Ândrade 💼'` mantido.
  - `sanitizeCell`:
    - `'=HYPERLINK("x")'` → `"'=HYPERLINK(\"x\")"`;
    - `'+55'`, `'-1'`, `'@a'`, `'\tx'`, `'\rx'` ganham `'`;
    - `'Maria'` e `''` não mudam.
  - `utf8Bytes('ō💼') === 6`.
- [ ] **Passo 2:** `npm test` → FALHA.
- [ ] **Passo 3: Implementar `shared/rules.js`.**
  - E-mail: `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` depois de normalizar.
  - WhatsApp: aceita string ou número (`String(v)`), mantém só dígitos; 10–11 dígitos → prefixo `55`; 12–13 começando com `55` → mantém; o resto vira `''`.
  - Comprimentos contam code points (`[...s].length`).
- [ ] **Passo 4:** `npm test` e `npm run typecheck` → PASSAM.
- [ ] **Passo 5: Commit** `feat: regras compartilhadas de validação e normalização`.

### Task 2: Estado do evento e agenda

**Arquivos:**
- Criar: `shared/event-state.js`, `shared/calendar.js`
- Teste: `tests/event-state.test.mjs`, `tests/calendar.test.mjs`

**Interfaces:**
- Produz `MaksoEventState`:
  - `OFFSET_MINUTES = -180`;
  - `toLocalParts(d: Date): {y,m,d,hh,mm,weekday}`;
  - `resolveDeadline(cfg): Date|null` (`rsvpDeadline`, senão `start − 3 dias`, senão `null`);
  - `eventEnd(cfg): Date|null` (`end`, senão `start + 4h`);
  - `getRsvpState({now, cfg, hasEndpoint}): 'aberto'|'em_breve'|'encerrado'|'passado'`, com prioridade `passado` > `encerrado` > `em_breve` > `aberto`.
- Produz `MaksoCalendar`:
  - `formatWhen(event): {date, time}|null`;
  - `googleCalendarUrl(event): string|null`;
  - `buildIcs(event, {uid, now}): string|null`.

- [ ] **Passo 1: Escrever os testes que falham**
  - `resolveDeadline({rsvpDeadline:null, event:{start:'2026-12-12T20:00:00-03:00'}})` = instante de `'2026-12-09T20:00:00-03:00'`; um `rsvpDeadline` explícito prevalece; sem `start` → `null`.
  - `getRsvpState`:
    - antes do prazo, com endpoint → `aberto`;
    - sem endpoint → `em_breve`;
    - depois do prazo → `encerrado`;
    - depois do `end` → `passado`;
    - sem `end`, em `start + 5h` → `passado`;
    - sem datas, com endpoint → `aberto`.
  - `formatWhen`:
    - `{start:'2026-12-12T20:00:00-03:00'}` → `{date:'sábado, 12 de dezembro', time:'20h'}`;
    - `…T20:30…` → `'20h30'`;
    - `start:null` → `null`.
  - `googleCalendarUrl` (20h–23h, −03:00):
    - começa com `'https://calendar.google.com/calendar/render?action=TEMPLATE'`;
    - contém `'dates=20261212T230000Z%2F20261213T020000Z'` e `'ctz=America%2FSao_Paulo'`;
    - `start:null` → `null`.
  - `buildIcs`:
    - começa com `'BEGIN:VCALENDAR\r\n'` e termina com `'END:VCALENDAR\r\n'`;
    - contém `'DTSTART:20261212T230000Z\r\n'`, `'UID:abc@makso'` e `'METHOD:PUBLISH'`;
    - `'Rua X, 10; BH'` → `'Rua X\\, 10\\; BH'`;
    - `\n` na descrição → `'\\n'`;
    - toda linha física ≤ 75 bytes;
    - desdobrar um `title` de 200 × `'ō💼'` devolve o original, sem `U+FFFD`.
- [ ] **Passo 2:** `npm test` → FALHA.
- [ ] **Passo 3: Implementar.**
  - Dias da semana: `domingo, segunda, terça, quarta, quinta, sexta, sábado` (a forma curta, sem "-feira").
  - Meses: `janeiro … dezembro`.
  - Dobra do ICS: até 75 bytes UTF-8 sem partir um caractere (iterar por code point); continuação com um espaço.
  - `PRODID:-//DIMAK Solucoes//makso//PT`.
  - `DESCRIPTION` = descrição + local + `mapsUrl` + traje.
- [ ] **Passo 4:** `npm test` e `npm run typecheck` → PASSAM.
- [ ] **Passo 5: Commit** `feat: estado do evento, formatação de data e agenda (.ics/Google)`.

### Task 3: Build, headers, servidor local e página estática mobile-first

**Arquivos:**
- Criar:
  - `scripts/build.mjs`, `scripts/headers.mjs`, `scripts/render-yaml.mjs`, `render.yaml` (gerado), `scripts/dev-server.mjs`, `scripts/shots.mjs`;
  - `src/index.html`, `src/styles/*.css`;
  - `assets/icons/{favicon.svg,apple-touch-icon.png}`, `assets/og.png`;
  - `tests/fixtures/config.full.json` (evento completo, sábado 12/12/2026 20h–23h), `tests/fixtures/config.empty.json` (igual ao `config.json`);
  - `tests/helpers/browser.mjs`.
- Teste: `tests/build.test.mjs`, `tests/headers.test.mjs`, `tests/e2e/layout.test.mjs`

**Interfaces:**
- Consome: Tasks 1–2.
- Produz:
  - **`build({root, configPath, outDir}): Promise<{files, hash}>`**
    - Aceita `outDir` só dentro de `root` ou de `os.tmpdir()`, e limpa só essa pasta `[B-R9]`.
    - Saída:
      - `index.html`;
      - `app.<hash>.js` (na ordem: `window.MAKSO_CONFIG = {siteUrl, appsScriptUrl, rsvpDeadline, event}` + `shared/rules.js`, `shared/event-state.js`, `shared/calendar.js`, `src/js/storage.js`, `src/js/api.js`, `src/js/form-state.js`, `src/js/form.js`, `src/js/glass.js`, `src/js/main.js`; arquivos que ainda não existem são pulados) `[F-R10]`;
      - `styles.<hash>.css`;
      - `event.json` (o mesmo subconjunto + `version: hash`) `[B-C4]`;
      - `evento.ics` (só se houver `start`);
      - `robots.txt` (`User-agent: *\nDisallow: /\n`);
      - `favicon.svg`, `apple-touch-icon.png`, `og.png`.
  - **`validateConfig(cfg): string[]`**:
    - `siteUrl` https;
    - `appsScriptUrl` vazio ou `^https://script\.google\.com/macros/s/[\w-]+/exec$`;
    - datas ISO com offset;
    - `end > start`;
    - `rsvpDeadline ≤ start`.
  - **Conteúdo do evento renderizado no build** `[F-R2]`:
    - `p.hero__when` = `{date} · {time}` (ou `Data em breve`);
    - `section.details > dl`: Quando / Onde (com link para `mapsUrl`) / Traje, com `Em breve` nos vazios;
    - `<time datetime>`.
  - **`scripts/headers.mjs`**:
    - `HEADERS: {path: string, headers: Record<string,string>}[]`;
    - `headersFor(pathname): Record<string,string>`;
    - valores exatos:
      - `/*`:
        - `X-Robots-Tag: noindex`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`;
        - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src https://script.google.com https://script.googleusercontent.com; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`;
      - `/index.html` e `/`: `Cache-Control: no-cache`;
      - `/*.js` e `/*.css`: `Cache-Control: public, max-age=31536000, immutable`.
  - **`scripts/render-yaml.mjs`**: escreve o `render.yaml` a partir de `HEADERS`:
    - `services: - type: web, name: makso, runtime: static, buildCommand: node scripts/build.mjs, staticPublishPath: dist`;
    - `headers`;
    - `routes` sem rewrite.
  - **`startBrowser({viewport, isMobile, hasTouch, reducedMotion, config, query, initScript})`** em `tests/helpers/browser.mjs`:
    - faz o build num tmp e serve via `page.route('https://makso.test/**')` com `headersFor()` (**CSP real nos testes**) `[F-C1]`;
    - aborta `fonts.googleapis.com`/`fonts.gstatic.com`;
    - registra `console.error` e `securitypolicyviolation` em `page.__problems`;
    - Chrome com `--use-angle=swiftshader --enable-unsafe-swiftshader`.
  - **`dev-server.mjs`**: `node:http`, porta `PORT||4173`, build em `.dev/`, `headersFor()` em cada resposta, `.ics` → `text/calendar; charset=utf-8`.
  - **`scripts/shots.mjs <url> <outDir>`**: 360×640, 390×844, 430×932, 844×390, 1440×900.
  - **Contrato de DOM**:
    - `section.hero[data-glass][data-motion]` contendo `canvas.hero__glass[aria-hidden=true]` (`position:absolute; inset:0`), `h1.hero__logo` (SVG inline), `p.hero__invite`, `p.hero__when`, `a.hero__cta[href="#confirmar"]`;
    - `section.details`;
    - `section#confirmar.rsvp` com:
      - `h2` `Confirme sua presença`;
      - `form.rsvp__form[novalidate]` contendo `fieldset.rsvp__fields` com:
        - `fieldset.choice` + `legend` `Você vai?` + 2 × `label.chip > input[type=radio][name=presenca][value=sim|nao]` (textos `Vou` / `Não vou`) `[F-R9]`;
        - campos `nome`, `email`, `whatsapp`;
        - `div.companion` com `label.switch > input[type=checkbox][role=switch][name=acompanhante]` (`Vou levar acompanhante`) + `acompanhanteNome[hidden]`;
        - `restricao` (textarea curta), `observacao`;
        - `input[name=hp]` escondido via classe CSS, `tabindex=-1 autocomplete=off aria-hidden=true`;
        - `button[type=submit]` `Confirmar presença`;
      - `p.rsvp__status[role=status][aria-live=polite]`;
      - `p.rsvp__privacy` `Usaremos seus dados apenas para organizar este evento.`;
      - `div.rsvp__result[hidden]` com `h3[tabindex=-1]`;
    - `footer.site-footer`;
    - `p.demo-badge[hidden]`.
  - **Atributos dos inputs**:

    | Campo | Atributos |
    |---|---|
    | nome | `autocomplete=name enterkeyhint=next` |
    | email | `type=email autocomplete=email inputmode=email enterkeyhint=next` |
    | whatsapp | `type=tel autocomplete=tel-national inputmode=tel enterkeyhint=next` |
    | observacao | `enterkeyhint=send` |

    Erro de cada campo: `p.field__error[id=err-<campo>]`.

- [ ] **Passo 1: Escrever os testes que falham**
  - `tests/build.test.mjs`:
    - `index.html` contém `<title id="makso-title">maksō</title>`, `name="robots" content="noindex"`, `name="theme-color" content="#000000"`, `viewport-fit=cover`, `lang="pt-BR"`;
    - nenhum `%%`; **nenhum ` style=` nem ` on[a-z]+=` e nenhum `<script>` sem `src`**;
    - os `app.<hash>.js` e `styles.<hash>.css` referenciados existem;
    - o `app.js` começa com `window.MAKSO_CONFIG`;
    - com `config.full.json`, o HTML contém `sábado, 12 de dezembro · 20h`, e `evento.ics` e `event.json` existem;
    - com `config.empty.json`, contém `Data em breve` e não há `evento.ics`;
    - `validateConfig` acusa `siteUrl` `http://x` e `appsScriptUrl` `https://evil.com/exec`;
    - `build` com `outDir:'/etc/x'` lança erro.
  - `tests/headers.test.mjs`:
    - o `render.yaml` versionado é igual à saída de `render-yaml.mjs`;
    - `headersFor('/app.ab12cd34.js')['Cache-Control']` contém `immutable`;
    - `headersFor('/')['Cache-Control'] === 'no-cache'`.
  - `tests/e2e/layout.test.mjs` (`config.full.json`):
    - em cada viewport de `shots.mjs`, `scrollWidth <= innerWidth`;
    - inputs com `font-size` ≥ 16px;
    - `button, a.hero__cta, label.chip` com altura ≥ 44px;
    - o rodapé contém `Desenvolvido por DIMAK Soluções`;
    - `.hero` com altura ≥ `innerHeight` − 1 em 390×844 e 844×390;
    - `page.__problems` vazio (sem erros e sem violação de CSP).
- [ ] **Passo 2:** `npm test && npm run test:e2e` → FALHA.
- [ ] **Passo 3: Implementar o build, os headers, o `render-yaml`, o dev-server e o helper.**
  - Hash = 8 primeiros hex do sha256 do conteúdo.
  - Logo inline: o `svg` recebe `class="logo" focusable="false"`.
  - Placeholders: `%%LOGO%% %%APP_JS%% %%CSS%% %%SITE_URL%% %%TITLE%% %%DESCRIPTION%% %%WHEN%% %%DETAILS%%`.
  - Meta OG:
    - `og:title` = `Lançamento maksō`;
    - `og:description` = `event.description`;
    - `og:image` = `${siteUrl}/og.png`;
    - `og:type` = `website`.
- [ ] **Passo 4: Implementar o HTML e o CSS** seguindo a seção 8.1 do spec e as restrições globais.
  - O hero tem um fundo CSS de reserva: gradientes radiais `#3a0a0e`, `#5a2a12` e `#c9a27a33` sobre `#000`.
  - Cápsula CSS de reserva (`.hero__logo::before`): `backdrop-filter: blur(20px) saturate(180%)`, `background: rgb(255 255 255 / 6%)`, `box-shadow: inset 0 1px 0 rgb(255 255 255 / 35%), inset 0 -1px 0 rgb(255 255 255 / 8%)`, raio pill. O `[data-glass="webgl"]` desliga essa cápsula.
  - Logo com largura `min(70vw, 520px)`, cor branca.
  - Ícones e OG com `rsvg-convert`:
    - `favicon.svg`: o Ō recortado da logo, `#1b0001` sobre `#f5f5f7`;
    - `apple-touch-icon.png`: 180×180;
    - `og.png`: 1200×630, logo branca a 60% sobre `#000`.
- [ ] **Passo 5:** `npm test && npm run test:e2e` → PASSAM. Rodar `node scripts/shots.mjs` e olhar cada captura (Read em cada PNG); corrigir desalinhamentos antes do commit.
- [ ] **Passo 6: Commit** `feat: build, headers, servidor local e página estática mobile-first`.

### Task 4: Hero com vidro líquido (WebGL) — **checkpoint com o Victor**

**Arquivos:**
- Criar: `src/js/storage.js`, `src/js/glass.js`, `src/js/main.js` (versão mínima: monta o glass; a Task 5 completa)
- Modificar: `src/styles/hero.css`
- Teste: `tests/storage.test.mjs`, `tests/e2e/glass.test.mjs`

**Interfaces:**
- Consome: o DOM da Task 3.
- Produz:
  - `MaksoStorage.safe(storage): {get(k), set(k,v), remove(k)}`: try/catch com reserva em `Map`, para quando o navegador interno do Instagram/WhatsApp bloqueia o `sessionStorage` `[F-C2]`;
  - `MaksoGlass.mount({hero, canvas, target, reducedMotion, intro: boolean}): {destroy(): void}`:
    - define `hero.dataset.glass = 'webgl'|'css'` e `hero.dataset.motion = 'live'|'static'`;
    - expõe `canvas.__maksoRect` (o último `u_rect`, para teste);
  - `main.js` (mínimo): `intro = !reduced && !MaksoStorage.safe(sessionStorage).get('makso-intro')`, grava a chave e monta o glass.

Algoritmo (fragment shader, WebGL 1, `mediump`), coordenadas em px **relativas ao hero**:

```
bg(p)  = base #050203 + Σ_i cor_i · exp(-|p - c_i(t)|² / r_i²)        (4 manchas, Lissajous lento 20–30 s;
         vinho #5a0f1a, bordô #3a0610, conhaque #7a3e1a, champanhe #c9a27a a 35%)
         + (hash(p) - 0.5) / 255                                         (dither anti-faixas)
k      = easeOutQuint(u_intro)                                           (0→1 em 600 ms; 1 se já vista)
rect   = u_rect escalado por mix(0.96, 1.0, k) em torno do centro        (cápsula e logo se movem juntas [F-C3])
sdf    = caixa arredondada (pill: raio = h/2) em torno de rect (folga 0.35h vertical, 0.22h horizontal)
inside = (1 - smoothstep(-1px, 1px, sdf)) · k
edge   = 1 - smoothstep(0, 0.22·h, -sdf)
n      = normalize(gradiente da sdf por diferenças finitas)
p'     = p - n · edge² · 0.35 · h ;  p' = centro + (p' - centro) · 0.94
glass  = média de bg em p' e p' ± 4px (x e y) · 1.10 + 0.035
rim    = pow(max(dot(n, normalize(vec2(-0.6, 0.8))), 0), 4) · (1 - smoothstep(0, 1.6px, -sdf)) · 0.75
shadow = escurece 18% numa faixa de 0.25h abaixo da cápsula (fora dela)
cor    = mix(bg · shadow, glass + rim, inside)
```

- **Medição** `[F-C3]`: `u_rect` = caixa de layout do `target` relativa ao `hero` (somando `offsetLeft/offsetTop` até o `hero`, mais `offsetWidth/offsetHeight`). Nunca `getBoundingClientRect()`.
- **Tamanho do canvas** `[F-R6]`: CSS `inset:0`; buffer = tamanho do hero × `min(devicePixelRatio, 1.5)`. `ResizeObserver` **no hero**, realocando só se a diferença for ≥ 1px.
- **Loop** `[F-R5]`:
  - `requestAnimationFrame` limitado a 30 fps, iniciado depois do `load`;
  - nos primeiros 60 quadros, se a média passar de 24 ms, vira quadro parado (`motion='static'`);
  - pausa com `IntersectionObserver` (hero fora da tela) e `visibilitychange`;
  - `reducedMotion` → 1 quadro com `t=0`, `motion='static'`.
- **Contexto** `[F-R4]`:
  - `getContext` nulo → `glass='css'`;
  - `webglcontextlost` → `preventDefault()` + `glass='css'`;
  - `webglcontextrestored` → recria e volta para `webgl`.
- **Troca de fundo**: o canvas entra com `opacity` 0→1 em 400 ms ease-out.
- **Intro**: com `intro:true`, a logo anima `opacity` + `scale(.96→1)` em 600 ms `cubic-bezier(0.23,1,0.32,1)` (classe CSS), e o `u_intro` vai de 0 a 1 na mesma curva e duração. Com `intro:false`, `u_intro = 1` desde o início.

- [ ] **Passo 1: Escrever os testes que falham**
  - `tests/storage.test.mjs`: com um storage que lança em `setItem`/`getItem`, `set` e `get` não lançam e `get` devolve o valor salvo.
  - `tests/e2e/glass.test.mjs`:
  - em 390×844, depois de 600 ms: `data-glass="webgl"` e `data-motion="live"`; `canvas.width === Math.round(heroWidth * Math.min(dpr, 1.5))`;
  - com `initScript` que anula `getContext` → `css`;
  - com `reducedMotion:'reduce'` → `static`;
  - depois de `setViewportSize(844×390)`, o canvas acompanha;
  - **rolar 300 px e redimensionar → `canvas.__maksoRect` é igual à caixa de layout da logo relativa ao hero**;
  - durante a intro (100 ms depois do load), `canvas.__maksoRect.w` é igual à largura de layout da logo (sem o `scale`);
  - perda e restauração forçadas com `WEBGL_lose_context` → `css` e depois `webgl`;
  - `page.__problems` vazio.
- [ ] **Passo 2:** `npm run test:e2e` → FALHA.
- [ ] **Passo 3: Implementar `storage.js`, `glass.js` e o `main.js` mínimo.**
- [ ] **Passo 4:** `npm run test:e2e` → PASSA. Capturar o hero em 390×844 e 1440×900 e olhar: logo nítida, cápsula refratando na borda, sem faixas e sem costura dura.
- [ ] **Passo 5: Commit** `feat: hero com vidro líquido em WebGL e fallback CSS`.
- [ ] **Passo 6: CHECKPOINT.** Enviar as capturas ao Victor e esperar o OK visual antes da Task 5. Ajustes aqui = só cores e intensidades dentro do algoritmo.

### Task 5: Formulário, envio e estados

**Arquivos:**
- Criar: `src/js/api.js`, `src/js/form-state.js`, `src/js/form.js`, `src/js/main.js`
- Modificar: `src/styles/form.css`
- Teste: `tests/api.test.mjs`, `tests/form-state.test.mjs`, `tests/e2e/form.test.mjs`

**Interfaces:**
- Consome: `MaksoRules`, `MaksoEventState.getRsvpState`, `MaksoCalendar.{formatWhen, googleCalendarUrl}`, `MaksoStorage.safe`, `MaksoGlass.mount`, o `main.js` mínimo e o DOM das Tasks 3–4.
- Produz `MaksoApi`:
  - `detectDemo({hostname, search}): {demo, scenario: 'ja_respondeu'|'erro'|'invalido'|'encerrado'|'passado'|null}`;
  - `makeId(cryptoObj = globalThis.crypto): string` (UUID v4; `randomUUID` ou `getRandomValues`);
  - `parseResponse(json): ServerResponse`: aceita só as formas da seção 7 do spec; o resto vira `{ok:false, code:'erro'}` `[F-R7]`;
  - `submit(payload, {endpoint, demo, scenario, fetchImpl=fetch, timeoutMs=15000}): Promise<ServerResponse>`:
    - `POST`, `Content-Type: text/plain;charset=utf-8`, `redirect:'follow'`;
    - falha de rede, timeout, status fora de 2xx ou corpo não-JSON → `erro`;
    - em demo: espera 900 ms, responde conforme o cenário (sem cenário: `confirmado`/`recusado` pela `presenca`; `invalido` → `{campos:{email:'Informe um e-mail válido.'}}`) e incrementa `globalThis.__maksoSubmitCount`.
- Produz `MaksoFormState` (puro) `[F-C2]`:
  - `initialState(page: RsvpState) → State`;
  - `reduce(state, event) → State`;
  - `State = {page, phase:'editando'|'enviando'|'concluido', presenca:null|'sim'|'nao', companion:boolean, errors:Record<string,string>, status:null|'erro'|'em_breve', result:null|{kind:'confirmado'|'recusado'|'ja_respondeu'|'encerrado', nome, email}}`.
  - Eventos:
    - `{type:'choose', presenca}` (`nao` desliga `companion`);
    - `{type:'toggleCompanion', on}`;
    - `{type:'invalid', fields}`;
    - `{type:'submit'}` (ignorado fora do `editando` ou com `page ≠ aberto`);
    - `{type:'response', res, nome, email}`.
  - `switch` exaustivo sobre `res.code`/`res.status` com `default` → `status:'erro'`. `invalido` com chave fora dos campos do formulário → `status:'erro'` `[B-R7]`.
- Produz `MaksoForm.mount({root, cfg, page, api, demo, scenario, now})`:
  - liga os eventos do DOM ao `reduce`;
  - **uma `render(state, prev)` idempotente** escreve no DOM só o que mudou;
  - o envio fica em `try/finally`: sempre termina num `response`;
  - `id` = `MaksoStorage.safe(sessionStorage).get('makso-rsvp-id') || makeId()`, gravado antes do envio e removido em resultado definitivo;
  - `t = now() − montagem`.
- **Renderização por estado**:

  | Estado | Renderização |
  |---|---|
  | `presenca:'nao'` | `div.companion` e `restricao` com `hidden` |
  | `companion` | `acompanhanteNome` visível; entra com `opacity` + `translateY(-4px→0)` em 200 ms, sem animar altura |
  | `errors` | `aria-invalid` + `aria-describedby=err-<campo>` + texto; foco no 1º inválido depois de `invalid` |
  | `enviando` | botão `disabled` com `Enviando…` |
  | `status:'erro'` | `.rsvp__status` = `Não conseguimos enviar agora. Verifique sua conexão e tente de novo.`; botão `Tentar de novo`; dados mantidos |
  | `confirmado` | `.rsvp__result` (formulário `hidden`); o `h3` com `Presença confirmada, {primeiro nome}.` |
  | `recusado` | `Obrigado por avisar, {primeiro nome}. Sentiremos sua falta.` |
  | `ja_respondeu` | `Sua resposta já está registrada.` |
  | `encerrado` (resposta ou página) | `As confirmações foram encerradas.` |
  | `page:'em_breve'` | `fieldset.rsvp__fields` com `disabled` + `.rsvp__status` = `Confirmações abrem em breve.` |
  | `page:'passado'` | a seção `rsvp` vira `O lançamento aconteceu em {date}. Obrigado.` (sem data: `O lançamento já aconteceu. Obrigado.`) |

  - No `confirmado`, abaixo do título:
    - `Enviamos os detalhes para {email}.` (em demo: `Em produção, enviaremos os detalhes para {email}.`);
    - com `event.start`, os botões `Google Agenda` (`googleCalendarUrl`) e `Apple / Outlook` (`/evento.ics`).
  - Ao concluir, foco no `h3` com `scrollIntoView({block:'center'})`.
- **Teclado virtual** `[F-R3]`: em `visualViewport` `resize`, se o campo focado tiver a base > `visualViewport.height − 16`, `scrollIntoView({block:'center'})`.
- **`main.js`**:
  1. injeta a folha da Inter só fora de plataformas Apple (`/Mac|iPhone|iPad|iPod/.test(navigator.platform)` ou iPadOS por `maxTouchPoints > 1 && /Mac/`) `[F-C4]`;
  2. calcula `page` (`hasEndpoint = !!appsScriptUrl || demo`; os cenários `encerrado`/`passado` forçam o estado);
  3. monta `glass` e `form`;
  4. mostra `demo-badge` `Demonstração — nada é enviado`;
  5. a CTA faz `scrollIntoView({behavior: reduced ? 'auto' : 'smooth'})`.

- [ ] **Passo 1: Escrever os testes que falham**
  - `tests/api.test.mjs`:
    - `submit` com `fetch` falso: `method`, header `text/plain;charset=utf-8`, `body === JSON.stringify(payload)`;
    - `fetch` rejeitado, timeout de 50 ms, status 500 e corpo `'<html>'` → `erro`;
    - `parseResponse({ok:true, status:'x'})` → `erro`; `parseResponse({ok:false, code:'ja_respondeu'})` → mantido;
    - `detectDemo`:
      - `makso.onrender.com` sem query → `false`;
      - `?demo=1&cenario=erro` → `{demo:true, scenario:'erro'}`;
      - `localhost` → `true`;
      - `cenario=xyz` → `null`;
    - `makeId({getRandomValues})` sem `randomUUID` → `isUuid`.
  - `tests/form-state.test.mjs`:
    - `submit` durante `enviando` não muda o estado;
    - `submit` com `page:'em_breve'` é ignorado;
    - `response` com `{ok:true, status:'confirmado'}` → `result.kind === 'confirmado'`, `phase:'concluido'`;
    - `{ok:false, code:'zzz'}` → `status:'erro'`, `phase:'editando'`;
    - `invalido` com `campos:{id:'invalido'}` → `status:'erro'`;
    - `invalido` com `campos:{email:'…'}` → `errors.email`;
    - `choose nao` → `companion:false`.
  - `tests/e2e/form.test.mjs` (`config.full`, `?demo=1`, 390×844, `isMobile`, `hasTouch`, servido em `https://makso.test`):
    - Vou + acompanhante "Ana" → `Presença confirmada, Mariana.`; `Google Agenda` com `href` começando por `https://calendar.google.com`; `Apple / Outlook` com `href` `/evento.ics`; foco no `h3`;
    - Não vou → `div.companion` e `restricao` ocultos; `Obrigado por avisar, Mariana. Sentiremos sua falta.`;
    - envio vazio → 4 erros (`presenca`, `nome`, `email`, `whatsapp`), foco no 1º inválido;
    - `cenario=ja_respondeu` → `Sua resposta já está registrada.`;
    - `cenario=erro` → mensagem de erro, campos preservados, `id` idêntico entre duas tentativas;
    - **toque duplo**: dois cliques rápidos → `__maksoSubmitCount === 1`;
    - **`sessionStorage` bloqueado** (`initScript` que faz `setItem` lançar) → confirmação concluída;
    - sem `?demo` e com `config.empty` → `Confirmações abrem em breve.` e `fieldset` `disabled`;
    - `cenario=passado` → `O lançamento aconteceu em sábado, 12 de dezembro. Obrigado.`;
    - com `initScript` definindo `navigator.platform='iPhone'` → nenhum `link[href*="fonts.googleapis"]`; no Linux → existe 1;
    - em 360×640 e 844×390: foco em `observacao` → a caixa do campo fica dentro de `innerHeight`;
    - `page.__problems` vazio em todos.
- [ ] **Passo 2:** `npm test && npm run test:e2e` → FALHA.
- [ ] **Passo 3: Implementar `api.js`, `form-state.js`, `form.js` e `main.js`**, com as interfaces e os textos acima.
- [ ] **Passo 4:** `npm test && npm run typecheck && npm run test:e2e` → PASSAM. Capturas (`shots.mjs`) de `?demo=1` nos estados sucesso, erro e `em_breve`; olhar cada uma.
- [ ] **Passo 5: Commit** `feat: formulário de presença com máquina de estados, modo demonstração e agenda`.

### Task 6: Apps Script — núcleo da confirmação

**Arquivos:**
- Criar: `apps-script/src/Submission.js`
- Teste: `tests/submission.test.mjs`

**Interfaces:**
- Consome: `MaksoRules`, `MaksoEventState` (globais; no teste, injetados em `globalThis`).
- Produz `handleSubmission(rawBody: unknown, deps): ServerResponse`:
  - `deps = {store, mailer, lock, rate, now, cfg, log}`, onde:
    - `store = {findExisting(id, email, whatsapp) → {byId: Record|null, byContact: Record|null}, append(record), setEmailStatus(id, status)}` `[B-R8]`;
    - `mailer = {remainingQuota() → number, send(record, cfg)}`;
    - `lock = {acquire(ms), release()}`;
    - `rate = {hit() → boolean}` (`false` = acima do limite) `[B-R3]`;
    - `log = {error(...), warn(...)}`.
  - `Record = Submission & {createdAt: Date, emailStatus: 'enviando'|'enviado'|'pendente'|'falhou'|'n.a.'}`.
  - **Ordem**:
    1. `rawBody` não-string, `utf8Bytes > LIMITS.bodyBytes` ou JSON inválido → `invalido` `[B-R6, B-R12]`;
    2. `hp` preenchido ou `t < 3000` → `ok` com o status da `presenca`, **sem gravar**;
    3. `validateSubmission` falha → `invalido` + `campos`;
    4. `getRsvpState({now, cfg, hasEndpoint:true})` ∈ {`encerrado`, `passado`} → `encerrado`;
    5. `rate.hit() === false` → `log.warn` + `erro`;
    6. `lock.acquire(10000)`;
    7. `findExisting`: `byId` → o status dele; `byContact` → `ja_respondeu`;
    8. `emailStatus`:
       - `nao` → `n.a.`;
       - `sim` com `remainingQuota() > 0` → `enviando`;
       - `sim` sem cota → `pendente` `[B-C2]`;
    9. `append`; `release` num `finally`;
    10. se `enviando`, envia fora do lock:
        - sucesso → `setEmailStatus(id, 'enviado')`;
        - exceção com `remainingQuota() === 0` → `pendente`;
        - outra exceção → `falhou` + `log.error(id, err)` `[B-R10]`;
        - cada `setEmailStatus` toma o lock por 5 s;
    11. devolve `ok`.
  - Qualquer exceção não prevista → `log.error` + `erro`, com o lock sempre solto.

- [ ] **Passo 1: Escrever os testes que falham** (store e mailer em memória):
  - `sim` válido → `{ok:true, status:'confirmado'}`, 1 registro, `send` chamado, status final `enviado`;
  - `nao` → `recusado`, sem `send`, status `n.a.`;
  - mesmo `id` duas vezes → a segunda devolve `confirmado` e continua com 1 registro;
  - outro `id` com `' MARIANA@gmail.com'` já gravado como `mariana@gmail.com` → `ja_respondeu`;
  - WhatsApp em outro formato → `ja_respondeu`;
  - `hp:'x'` e `t:500` → `ok` com 0 registros;
  - `'{'`, `undefined` e 20 KB → `invalido`;
  - e-mail inválido → `{ok:false, code:'invalido', campos:{email:'Informe um e-mail válido.'}}`;
  - depois do prazo → `encerrado`;
  - `rate.hit()` falso → `erro` e `log.warn`;
  - cota 0 → `pendente`, sem `send`;
  - `send` lança com cota > 0 → `falhou`, `ok`, `log.error` 1×;
  - `send` lança e a cota vira 0 → `pendente`;
  - `append` lança → `erro` e `release` chamado;
  - `acquire` lança → `erro`.
- [ ] **Passo 2:** `npm test` → FALHA.
- [ ] **Passo 3: Implementar `Submission.js`** (função global + `module.exports` opcional).
- [ ] **Passo 4:** `npm test` → PASSA.
- [ ] **Passo 5: Commit** `feat(apps-script): núcleo da confirmação com idempotência e bloqueio de duplicidade`.

### Task 7: Apps Script — planilha, e-mail, config remota e implantação

**Arquivos:**
- Criar: `apps-script/src/{SheetStore,Mail,EmailTemplate,RemoteConfig,Code}.js`, `apps-script/appsscript.json`
- Modificar: `scripts/build.mjs` (escreve `apps-script/dist/`)
- Teste: `tests/apps-script.test.mjs`

**Interfaces:**
- Consome: `handleSubmission`, `MaksoCalendar`, `MaksoRules`.
- Produz:
  - **`COLUMNS`**: `['Data/hora','Presença','Nome','E-mail','WhatsApp','Acompanhante','Nome do acompanhante','Restrição alimentar','Observação','E-mail (status)','E-mail atualizado em','ID']`.
  - **`createSheetStore(sheet)`**:
    - mapeia cabeçalho → índice a cada operação, então inserir colunas não quebra `[B-R2]`;
    - `findExisting` lê `getValues()` uma vez e compara `String(id)`, `normalizeEmail(String(v))` e `normalizeWhatsapp(String(v))`, removendo um `'` inicial `[B-C1]`;
    - `append`:
      - textos passam por `sanitizeCell`; WhatsApp e ID com prefixo `'`;
      - `Presença` = `Vou`/`Não vou`, `Acompanhante` = `Sim`/`Não`;
    - `setEmailStatus` acha a linha **pelo ID** e grava o status + `E-mail atualizado em`;
    - `claimPending(max) → Record[]` (`pendente` → `enviando`);
    - `releaseStale(minutes)` (`enviando` antigos → `pendente`).
  - **`createMailer()`**:
    - `remainingQuota` = `MailApp.getRemainingDailyQuota()`;
    - `send` = `MailApp.sendEmail({to, subject, htmlBody, body, name:'maksō', attachments})`;
    - anexo `convite-makso.ics` (`text/calendar`) só com `event.start`.
  - **`renderEmail(record, cfg): {subject, html, text}`**:
    - assunto `Presença confirmada — lançamento maksō`;
    - tabela de 560px, estilos inline (permitidos em e-mail), letreiro `MAKSŌ` em texto serifado com espaçamento;
    - data e local, ou `Data e local serão enviados em breve.`;
    - link do Google Agenda; rodapé `Desenvolvido por DIMAK Soluções`;
    - todo dado passa por `escapeHtml`.
  - **`loadConfig({fetch, cache, fallback}): cfg`** `[B-C4]`:
    - `UrlFetchApp.fetch(siteUrl + '/event.json', {muteHttpExceptions:true})`;
    - cache de 600 s em `CacheService.getScriptCache()`;
    - valida com `validateConfig` (cópia mínima) e, se falhar, usa o `MAKSO_CONFIG` embutido.
  - **`doPost(e)`**: `ContentService` JSON de `handleSubmission(e && e.postData && e.postData.contents, deps)`.
  - **`doGet()`**: `{ok:true, service:'makso-rsvp', version}` `[B-N1]`.
  - **`rate`**: `CacheService` com o contador `rate:<janela de 10 min>`, limite 60 `[B-R3]`.
  - **`setup()`**:
    - cria a planilha `maksō — Confirmações` e `setSpreadsheetTimeZone('America/Sao_Paulo')` `[B-R5]`;
    - aba `Respostas`: cabeçalho congelado, `setNumberFormat('@')` nas colunas WhatsApp e ID `[B-C1]`;
    - aba `Resumo` com `setFormula` em sintaxe US (vírgulas):

      | A | B |
      |---|---|
      | `Confirmados` | `=COUNTIF(Respostas!B:B,"Vou")` |
      | `Acompanhantes` | `=COUNTIFS(Respostas!B:B,"Vou",Respostas!F:F,"Sim")` |
      | `Total de pessoas` | `=B1+B2` |
      | `Não vão` | `=COUNTIF(Respostas!B:B,"Não vou")` |
      | `E-mails pendentes` | `=COUNTIF(Respostas!J:J,"pendente")` |
      | `E-mails com falha` | `=COUNTIF(Respostas!J:J,"falhou")` |

    - grava `SHEET_ID` nas propriedades do script;
    - cria o gatilho horário de `processPendingEmails` sem duplicar.
  - **`processPendingEmails()`**, *claim-then-send* `[B-C3]`:
    1. com lock: `releaseStale(15)` e depois `claimPending(remainingQuota())`;
    2. solta o lock;
    3. envia;
    4. com lock: grava `enviado`/`pendente`/`falhou`.
  - **`appsscript.json`**:
    - `timeZone: "America/Sao_Paulo"`, `runtimeVersion: "V8"`;
    - `webapp: {executeAs: "USER_DEPLOYING", access: "ANYONE_ANONYMOUS"}`;
    - `oauthScopes`: `spreadsheets`, `script.send_mail`, `script.scriptapp`, `script.external_request` `[B-R4]`.
  - **O build gera `apps-script/dist/`** com:
    - `Config.js` (`var MAKSO_CONFIG = {…}`, a reserva);
    - `Rules.js`, `EventState.js`, `Calendar.js` (cópias de `shared/`);
    - os arquivos de `src/`;
    - `appsscript.json`.

- [ ] **Passo 1: Escrever os testes que falham** (os arquivos de `apps-script/dist/*.js` carregados num `node:vm` com fakes de `SpreadsheetApp`, `LockService`, `MailApp`, `ContentService`, `PropertiesService`, `ScriptApp`, `CacheService`, `UrlFetchApp`, `Utilities`, `Session`; **o fake da planilha converte strings só de dígitos em `number`**, como o Sheets):
  - `setup()`:
    - cria as duas abas, cabeçalho = `COLUMNS`, `Resumo!B3 = '=B1+B2'`;
    - fuso definido, formato `@` nas colunas E e L;
    - rodar duas vezes não duplica o gatilho;
  - `doPost` válido:
    - JSON `{ok:true, status:'confirmado'}`;
    - linha com `Presença === 'Vou'`;
    - observação `=1+1` gravada como `'=1+1`;
    - `sendEmail` com `name:'maksō'` e anexo `convite-makso.ics`;
  - duplicidade: com o WhatsApp devolvido como `number` pelo fake, outra confirmação com o mesmo WhatsApp → `ja_respondeu`;
  - uma coluna inserida antes de `Nome` → o próximo `append` grava cada valor sob o cabeçalho certo;
  - `doPost({})` → `invalido`;
  - `renderEmail` com nome `<b>&` → aparece escapado e não há `<script` cru;
  - cota 0 → `pendente`; cota 5 + `processPendingEmails()` → `enviado`; linha `enviando` de 20 min atrás → volta para a fila e sai como `enviado`;
  - `loadConfig`:
    - `event.json` com prazo novo → prevalece;
    - `UrlFetchApp` lançando → usa o `MAKSO_CONFIG`;
    - segunda chamada → usa o cache, sem fetch;
  - carregar os arquivos em ordem invertida → `doGet` funciona `[B-R11]`;
  - `doGet` → `{ok:true, service:'makso-rsvp', version}`.
- [ ] **Passo 2:** `npm test` → FALHA.
- [ ] **Passo 3: Implementar os adaptadores, o template, a config remota e o build.**
- [ ] **Passo 4:** `npm test` → PASSA.
- [ ] **Passo 5: Commit** `feat(apps-script): planilha, e-mail com .ics, config remota e implantação`.

### Task 8: QR, guia de publicação e verificação final

**Arquivos:**
- Criar: `scripts/vendor/qrcodegen.py` (do `nayuki/QR-Code-generator`, `python/qrcodegen.py`, mantendo o cabeçalho MIT), `scripts/qr.py`, `README.md`
- Teste: `tests/qr.test.mjs`

**Interfaces:**
- Produz:
  - **`python3 -I scripts/qr.py <url> <outDir>`**:
    - gera `qr-makso.svg` (ECC `Q`, zona de silêncio de 4 módulos, `#000000` sobre `#ffffff`, `shape-rendering="crispEdges"`);
    - gera `qr-makso.png` 2400×2400 via `rsvg-convert`;
    - recusa URL não-https.
  - **`README.md`** (pt-BR), passo a passo:
    1. GitHub do Victor;
    2. Render: Blueprint do `render.yaml`, nome do serviço fixo, **nunca apagar nem renomear**;
    3. Apps Script, quando a conta do cliente existir:
       - `npm run build`;
       - criar o projeto e colar `apps-script/dist`;
       - `setup()`, autorizar, compartilhar a planilha;
       - *Implantar → Nova implantação → App da Web* uma única vez;
       - **depois, sempre *Gerenciar implantações → Editar → Nova versão*, para a URL não mudar** `[B-R1]`;
       - colar a URL em `config.json` e fazer commit;
    4. preencher os dados do evento em `config.json` e fazer commit: o site e o e-mail atualizam sozinhos (`event.json`) `[B-C4]`;
    5. gerar o QR com a URL final e testá-lo no papel;
    6. como ler a planilha e o `Resumo`;
    7. o limite de 100 e-mails/dia e a fila;
    8. lista de verificação pós-implantação:
       - confirmar com um WhatsApp real e conferir a célula como texto;
       - observação `=1+1` aparece como texto;
       - e-mail chega com `.ics`;
       - repetir a confirmação → `ja_respondeu`;
       - `doGet` mostra a versão.

- [ ] **Passo 1: Escrever o teste que falha** (`tests/qr.test.mjs`):
  - `qr.py https://makso.onrender.com <tmp>` → SVG com `viewBox` e `crispEdges`;
  - `qr.py http://x` → código ≠ 0;
  - se `python3 -c "import cv2"` funcionar, decodificar o PNG com `cv2.QRCodeDetector` e comparar com a URL; senão, `skip` com mensagem.
- [ ] **Passo 2:** `npm test` → FALHA.
- [ ] **Passo 3: Vendorizar o `qrcodegen.py`** (`git clone --depth 1` numa pasta temporária vazia, copiar só esse arquivo) e implementar `qr.py` e `README.md`.
- [ ] **Passo 4:** `npm test && npm run typecheck && npm run test:e2e` → PASSAM. Build com `config.json`; capturas de todos os estados (`?demo=1` e os cenários) em 390×844; olhar cada uma.
- [ ] **Passo 5: Commit** `feat: QR, guia de publicação e verificação final`.
- [ ] **Passo 6:** Avisar o Victor que o QR final só é gerado depois do primeiro deploy, com a URL do serviço fixada.
