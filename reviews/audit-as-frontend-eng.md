# Auditoria de Frontend: maksō — página de presença

**Perspectiva**: Engenharia de frontend. A lente original é React/TS/Zustand; aqui ela foi adaptada para JS puro (sem framework): os mesmos critérios de estado, renderização, tipos, limpeza e peso do bundle, aplicados a módulos com namespace, DOM direto e WebGL.
**Data**: 2026-11-17
**Plano**: `docs/superpowers/plans/2026-11-17-makso-presenca.md`

## Resumo do plano

A página é estática e não usa framework. O build concatena `shared/` + `src/js/` num único bundle. O `main.js` monta o hero WebGL (`glass.js`) e o formulário (`form.js`), que envia via `api.js` para o Apps Script, com modo demonstração e 9 estados de tela.

## Arquivos revisados

| Arquivo | Papel | Risco |
|---|---|---|
| `src/js/form.js` | Estado do formulário, validação, resultados | **Alto** (muitos estados) |
| `src/js/glass.js` | Loop WebGL, medição da logo, intro | **Alto** (medição, iOS) |
| `src/js/api.js` | `fetch`, timeout, modo demo, `makeId` | Médio |
| `src/js/main.js` | Bootstrap, textos de data | Médio (salto de layout) |
| `src/index.html` + CSS | Estrutura, tokens, fontes | Médio (fonte bloqueante, CSP) |
| `render.yaml` (CSP) | Política de segurança | **Alto** (quebra só em produção) |

## Veredito: APROVAR COM MUDANÇAS

## Problemas críticos (corrigir antes de construir)

| # | Problema | Arquivo(s) | Por que quebra | Correção |
|---|---|---|---|---|
| C1 | **A CSP só existe no Render.** Dev-server e testes e2e rodam sem os headers de `render.yaml`. Qualquer `style="…"` no HTML (bloqueado por `style-src` sem `'unsafe-inline'`), host esquecido no `connect-src` ou script inline passa em todos os testes e quebra só em produção, depois que o QR já está impresso. | `render.yaml`, `dev-server.mjs`, `tests/helpers/browser.mjs` | Falha silenciosa em produção | Headers num único módulo `scripts/headers.mjs` (`HEADERS` por rota), usado pelo `dev-server`, pelo helper de e2e (`route.fulfill({headers})`) e por um teste que confere que o `render.yaml` tem exatamente os mesmos valores. O e2e escuta `securitypolicyviolation` e falha se houver qualquer violação. Nenhum atributo `style=` nem `on*=` no HTML (teste no build) |
| C2 | **Estado do formulário espalhado em mutações de DOM.** São 9 estados + campos condicionais + "enviando". Com `if`s soltos aparecem combinações impossíveis: mensagem de erro que fica depois do sucesso, botão preso em "Enviando…" se algo lançar exceção (ex.: `sessionStorage` bloqueado no navegador interno do Instagram/WhatsApp lança `SecurityError` antes do `fetch`). | `form.js` | Convidado não consegue confirmar | Máquina de estados: `reduce(state, event) → state` pura em `src/js/form-state.js`, testável em Node, com `switch` exaustivo sobre os códigos do servidor (`default` → `erro`). Uma única `render(state)` idempotente aplica tudo no DOM. O envio fica num `try/finally` que sempre leva a um estado final. Todo acesso a `sessionStorage` passa por `safeStorage` (try/catch, com reserva em memória) |
| C3 | **Medição da cápsula errada.** `getBoundingClientRect()` devolve coordenadas da *viewport* (mudam com a rolagem) e já com `transform` aplicado (durante a intro, `scale(.96)` encolhe a medida). Se houver resize com a página rolada, ou se a medida acontecer na intro, a cápsula fica deslocada ou menor que a logo. | `glass.js` | Vidro desalinhado da logo, o efeito principal da página | Medir com a caixa de layout relativa ao hero (`offsetLeft/Top/Width/Height` acumulados até `.hero`), que ignora `transform` e rolagem. A intro anima a cápsula **no shader** (uniform `u_intro` 0→1, mesma curva e mesmos 600 ms da logo), para logo e vidro se moverem juntos |
| C4 | **Fonte bloqueando a renderização.** O `<link rel=stylesheet>` do Google Fonts no `<head>` bloqueia a primeira pintura (mais DNS + TLS de dois domínios no 4G), inclusive no iPhone, que nem usa Inter. Isso contraria a meta de < 2 s do spec 8.1. O truque `media="print" onload` é bloqueado pela CSP (`on*` inline). | `index.html`, `main.js` | Primeira pintura atrasada no celular | Sem `<link>` no HTML. Um trecho no início do bundle injeta a folha do Google Fonts só fora de plataformas Apple (`!/Mac\|iPhone\|iPad\|iPod/.test(navigator.platform)` e `!('ontouchend' in document && /Mac/.test(...))`). `preconnect` para `fonts.gstatic.com` também só nesse caso |

## Recomendações

| # | Problema | Arquivo(s) | Por quê | Correção |
|---|---|---|---|---|
| R1 | `inert` só existe a partir do Safari 15.5; o alvo é 15.4 | `form.js`, `index.html` | O formulário "desabilitado" continuaria utilizável | `em_breve` → `<fieldset disabled>` (nativo e universal). Blocos ocultos com `hidden`, que já tira do tab |
| R2 | Data e detalhes preenchidos por JS | `main.js`, `build.mjs` | Salto de layout quando o texto aparece e página vazia se o JS falhar | O build já conhece o `config.json`, então renderiza no HTML `hero__when`, a lista de detalhes e o `<time datetime>`. O JS só cuida do que depende de "agora" (estado) |
| R3 | `focusin` + `scrollIntoView` depois de 300 ms | `form.js` | No iOS isso briga com a rolagem nativa até o campo e o conteúdo dá pulos | Usar `visualViewport` `resize`: só rolar se o campo focado estiver abaixo de `visualViewport.height − 16px` |
| R4 | Contexto WebGL perdido | `glass.js` | O iOS derruba contextos de abas em segundo plano; com o plano, o vidro some até recarregar | `webglcontextlost` → `preventDefault()` e passa para o CSS; `webglcontextrestored` → recria o programa e volta para `webgl` |
| R5 | Loop a 60 fps contínuo no celular | `glass.js` | Bateria e aquecimento, sem ganho visual (movimento de 20–30 s) | Desenhar a 30 fps. Medir os primeiros 60 quadros: se a média passar de 24 ms, fica em quadro parado (`motion='static'`) |
| R6 | Canvas redimensionado pela janela | `glass.js` | No iOS a barra de endereço some ao rolar, dispara `resize` e realocaria o buffer durante a rolagem (piscadas) | Canvas `position:absolute; inset:0` dentro do hero e `ResizeObserver` **no hero** (`min-height: 100svh` não muda com a barra). Só realocar se a diferença for ≥ 1 px |
| R7 | Resposta do servidor sem checagem de forma | `api.js` | Um JSON inesperado (ex.: proxy, página de erro em JSON) viraria estado indefinido | `parseResponse(json)`: aceita só as formas do contrato; qualquer outra coisa vira `{ok:false, code:'erro'}` |
| R8 | `.hero` exatamente igual a `innerHeight` | `layout.test`, CSS | No celular deitado (844×390), logo + convite + botão não cabem em 390 px | `min-height: 100svh`; o teste pede `≥ innerHeight` |
| R9 | Semântica dos controles | `index.html` | Chips e interruptor feitos só com CSS perdem teclado e leitor de tela | `fieldset` + `legend` ("Você vai?") com `input type=radio name=presenca` dentro de `label.chip`; interruptor = `input type=checkbox role=switch` |
| R10 | Uma requisição só para a config | `build.mjs` | `config.<hash>.js` separado custa uma ida e volta no 4G | Config no topo do `app.<hash>.js` (é de build, então o hash muda junto) |
| R11 | Ajuste de texto no iOS deitado | `base.css` | O Safari aumenta fontes em paisagem | `-webkit-text-size-adjust: 100%; text-size-adjust: 100%` |

## Melhorias opcionais

| # | Sugestão | Motivo |
|---|---|---|
| N1 | `// @ts-check` + typedefs JSDoc (`Submission`, `Response`, `RsvpState`) em `shared/types.js` e `npm run typecheck` com o `tsc` global (`/opt/npm-tools/node_modules/typescript`), `--noEmit --checkJs` | Tipos de ponta a ponta sem build de TS. Pega nomes de campo divergentes entre cliente e servidor |
| N2 | `-webkit-font-smoothing: antialiased` só no hero escuro | O texto claro em fundo escuro fica mais fino, como na Apple |

## Análise do caminho de renderização

1. **HTML + CSS** (sem fonte bloqueante, C4): o hero aparece com o fundo CSS de reserva, a logo SVG inline e o convite **já com a data** (R2). É a primeira pintura útil e não depende de JS. LCP = logo/convite.
2. **`app.js` (defer)**: o `main` calcula o estado por `now`. Ele só mexe no DOM do formulário se o estado não for `aberto` (`em_breve`/`encerrado`/`passado`), uma escrita única, sem salto, porque a área do `rsvp` reserva altura mínima.
3. **Depois do `load`**: o `glass` cria o contexto WebGL e troca o fundo CSS pelo canvas. A troca é um *crossfade* de opacidade de 400 ms, sem layout. A medição da logo (C3) acontece uma vez e de novo apenas no `ResizeObserver`.
4. **Interação**: cada evento do formulário passa por `reduce` → `render`, que escreve só o que mudou (compara com o estado anterior). Nada lê layout dentro do loop do WebGL, e não há leituras/escritas intercaladas (sem *layout thrash*).
5. **Loop WebGL**: a 30 fps (R5). Pausa fora da tela (`IntersectionObserver`) e em aba oculta. Só desenha; não toca no DOM.

Sem C3 e R6, o passo 3 vira o ponto fraco: medidas na hora errada (intro/rolagem) e realocação de buffer durante a rolagem no iOS.

## Tipos

Não há TypeScript; a segurança de tipos vem de três camadas:

1. **`MaksoRules.validateSubmission`**, a mesma no cliente e no servidor, que normaliza tudo.
2. **`parseResponse`** (R7), que só aceita o contrato.
3. **`switch` exaustivo** com `default` em `reduce` (C2).

A lacuna é a divergência de nomes de campo entre HTML (`name=`), cliente e servidor. N1 fecha isso com `checkJs`, e o e2e de fluxo completo em demo também pega.

## Detalhes do veredito

- Arquitetura dos módulos: **APROVADO** (separação `shared` / `api` / `form` / `glass` / `main` adequada)
- Estado: **RESSALVAS** (C2)
- Tipos: **RESSALVAS** (R7, N1)
- Desempenho de renderização: **RESSALVAS** (C3, C4, R2, R5, R6)
- Peso do bundle: **APROVADO** (sem framework, um bundle, logo inline ~4 KB; R10)
