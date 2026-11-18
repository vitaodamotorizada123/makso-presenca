# maksō — Página de confirmação de presença (design)

Data: 2026-11-17 · Cliente: maksō · Desenvolvido por: DIMAK Soluções · Status: **aprovado pelo Victor em 2026-11-17**

---

## 1. Intenção

A maksō é uma marca de bolsas de luxo feitas à mão e vai fazer um evento de lançamento. Cada convidado recebe em casa um convite físico com **um QR code igual para todos**. Ao escanear, a pessoa cai numa página com cara de Apple, confirma (ou recusa) presença e recebe a confirmação. O cliente quer ter a lista de presença organizada sem esforço.

O site é **temporário**: existe só para a lista de presença. A marca ainda não tem identidade visual completa, mas **já tem logo**: o letreiro "MAKSŌ" em serifa, com o A e o K entrelaçados e mácron no Ō, enviado pelo Victor em 2026-11-17 (`assets/brand/makso-logo.svg`). A página mostra essa logo dentro de um efeito de vidro líquido no estilo da Apple. O resto da interface usa a tipografia da Apple.

**A página é feita primeiro para celular.** Quase todo mundo chega escaneando o QR com o telefone; o desktop é secundário (ver seção 8.1).

## 2. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
- Quem escaneia o QR confirma presença em menos de 1 minuto, no celular.
- Cada resposta vira uma linha numa planilha Google do cliente, com um resumo de quantas pessoas vêm.
- Quem confirma recebe uma tela de obrigado, um e-mail com os detalhes e um botão para salvar na agenda.
- A resposta é definitiva: a mesma pessoa não consegue responder de novo.
- Rodapé com "Desenvolvido por DIMAK Soluções".

**Não-objetivos (fora desta fase)**
- Lista prévia de convidados, QR individual e check-in na porta.
- Consentimento para marketing (LGPD de novidades): o cliente não quer.
- Inglês, painel administrativo e avisos a cada confirmação.
- Identidade visual completa e fotos de produto. Da marca, existe só a logo.

**Anti-objetivos (seria um fracasso mesmo funcionando)**
- A página parecer um formulário genérico do Google ou um "template de evento".
- Mostrar "obrigado" sem a resposta ter sido salva de verdade.
- A primeira impressão no iPhone ser pior do que no Chrome.
- A página demorar para abrir no 4G depois de escanear o QR.

## 3. Restrições

- **A API oficial do Google Forms não envia respostas**, só lê. Por isso não usamos o Forms.
- **Apps Script numa conta Gmail comum envia e-mail para no máximo 100 destinatários por dia.**
- **SF Pro não pode ser embutida no site** (licença da Apple). Nos aparelhos Apple ela aparece pela fonte do sistema; nos outros usamos Inter.
- **Vidro líquido com refração de verdade via CSS** (`backdrop-filter: url(#svg)`) só funciona em Chromium. Safari/iOS e Firefox mostram só o vidro fosco.
- **O QR é impresso uma vez**, então o endereço para onde ele aponta não pode mudar. Ele precisa ser um domínio do cliente, renovado enquanto houver convites circulando.
- **Tudo fica numa conta Google separada, do cliente**: planilha, script e remetente do e-mail.
- **Hospedagem no Render como site estático**, que não "dorme" como os web services grátis.

## 4. Abordagens consideradas

| | Como funciona | Por que sim | Por que não |
|---|---|---|---|
| A | Nosso formulário envia, por trás, para um Google Forms | É o mais próximo do pedido original; zero servidor | Não confirma se salvou; não bloqueia duplicidade; o e-mail exigiria um script de qualquer jeito; atalho não oficial |
| **B ✅** | Nosso formulário → Google Apps Script (web app) → Google Sheets + e-mail | Grátis; tudo na conta do cliente; "obrigado" só depois de salvar; bloqueia duplicidade; a planilha já é a lista | Limite de 100 e-mails/dia (resolvido com fila); cada envio leva 1–3 s |
| C | API própria + Postgres + serviço de e-mail | Controle total; base reaproveitável | Muito mais para manter num site temporário; servidor grátis do Render dorme (30–60 s) ou custa US$ 7/mês |

**Escolhida: B** (decisão do Victor). É o único caminho que entrega resposta definitiva, e-mail e lista organizada sem custo e sem servidor para manter.

## 5. Experiência do convidado

```
Convite físico ──QR──▶ makso.com.br (site estático no Render)
                              │
                              ▼  preenche e toca "Confirmar"
                       Apps Script (conta do cliente)
                         ├─ valida, bloqueia duplicidade
                         ├─ grava na planilha "Respostas"
                         ├─ envia e-mail com .ics (se "Vou")
                         └─ responde à página ──▶ tela de obrigado
```

### Esboço da página (celular)

```
┌──────────────────────────────────┐
│ ░░ fundo quase-preto, luz em  ░░ │  HERO (≈ 1 tela)
│ ░░ tons de couro se movendo   ░░ │
│      ╭────────────────────╮      │
│      │      M A K S Ō     │      │  ← logo (SVG branco) na
│      ╰────────────────────╯      │    cápsula de vidro líquido
│   Você está convidado para o     │
│   lançamento.                    │
│   12 dez · 20h · Belo Horizonte  │
│      ( Confirmar presença )      │  pill branca → rola até o form
├──────────────────────────────────┤
│  Quando   sex, 12 de dezembro    │  DETALHES (parchment #f5f5f7)
│  Onde     Nome do lugar  ›mapa   │
│  Traje    (se houver)            │
├──────────────────────────────────┤
│  Confirme sua presença           │  FORMULÁRIO (branco)
│  [ Vou ] [ Não vou ]             │
│  Nome  ______________________    │
│  E-mail ______________________   │
│  WhatsApp (31) 9____-____        │
│  ○ Vou levar acompanhante        │
│  Restrição alimentar _________   │
│  Observação __________________   │
│      ( Confirmar presença )      │  pill preta
│  Usaremos seus dados apenas para │
│  organizar este evento.          │
├──────────────────────────────────┤
│  Desenvolvido por DIMAK Soluções │  RODAPÉ (parchment)
└──────────────────────────────────┘
```

Na tela de obrigado, o formulário é substituído no mesmo lugar por:

```
✓ Presença confirmada, Mariana.
Enviamos os detalhes para mariana@…
( Google Agenda )  ( Apple / Outlook )
```

## 6. Formulário

### Campos

| Campo | Obrigatório | Quando aparece | Regras |
|---|---|---|---|
| Presença | sim | sempre | `sim` / `nao` (dois chips grandes: "Vou" / "Não vou") |
| Nome | sim | sempre | 2–80 caracteres |
| E-mail | sim | sempre | formato válido, até 120 caracteres |
| WhatsApp | sim | sempre | DDD + número (BR), 10–11 dígitos; aceita +55 |
| Acompanhante | não | só "Vou" | interruptor; no máximo 1 |
| Nome do acompanhante | sim, se acompanhante | só com acompanhante ligado | 2–80 caracteres |
| Restrição alimentar | não | só "Vou" | até 300 caracteres |
| Observação | não | sempre | até 500 caracteres |

Os campos usam `autocomplete` (`name`, `email`, `tel`) para o celular preencher sozinho. Também usam `type`/`inputmode` corretos, fonte de 17px (evita zoom no iOS), `<label>` associado e erros mostrados junto do campo (`aria-invalid` + `aria-describedby`).

### Estados da página

| Estado | O que a pessoa vê |
|---|---|
| Aberto | formulário |
| Enviando | botão desabilitado com "Enviando…"; o envio dura no máximo 15 s |
| Confirmado | "Presença confirmada, {nome}" + botões de agenda + aviso do e-mail. O foco vai para o título |
| Recusado | "Obrigado por avisar, {nome}. Sentiremos sua falta." Sem e-mail e sem agenda |
| Já respondeu | "Sua resposta já está registrada." (mesmo e-mail ou mesmo WhatsApp) |
| Erro de rede/servidor | mensagem junto ao botão, dados mantidos, "Tentar de novo" |
| Inválido (servidor) | erros nos campos que o servidor apontar |
| Confirmações encerradas | formulário trocado por aviso (após o prazo) |
| Evento passado | "O lançamento aconteceu em {data}. Obrigado." |

## 7. Backend (Apps Script + Google Sheets)

### Contrato

Requisição `POST {APPS_SCRIPT_URL}` com `Content-Type: text/plain` (evita a verificação prévia de CORS; o Apps Script responde com `Access-Control-Allow-Origin: *` depois do redirect). O corpo é este JSON:

```json
{
  "id": "uuid gerado no navegador",
  "presenca": "sim | nao",
  "nome": "", "email": "", "whatsapp": "",
  "acompanhante": false, "acompanhanteNome": "",
  "restricao": "", "observacao": "",
  "hp": "",            // honeypot: precisa vir vazio
  "t": 12345           // ms entre abrir a página e enviar
}
```

Respostas (sempre HTTP 200 com JSON):

```json
{ "ok": true,  "status": "confirmado" | "recusado" }
{ "ok": false, "code": "ja_respondeu" }
{ "ok": false, "code": "invalido", "campos": { "email": "mensagem" } }
{ "ok": false, "code": "encerrado" }
{ "ok": false, "code": "erro" }
```

### Regras do servidor

1. **Lock**: `LockService.getScriptLock().waitLock(10000)` em volta de ler, checar e gravar, para dois envios simultâneos não passarem pela checagem de duplicidade.
2. **Idempotência**: se o `id` já existe, devolve o status original (`ok: true`). Isso cobre quem perdeu a conexão e reenviou.
3. **Duplicidade**: e-mail normalizado (minúsculas, sem espaços) **ou** WhatsApp normalizado (só dígitos, com 55) já existentes com outro `id` → `ja_respondeu`.
4. **Validação** repete as regras do formulário. O servidor não confia na página.
5. **Antispam**: `hp` preenchido ou `t < 3000` → responde `ok` sem gravar, para o robô não aprender.
6. **Injeção de fórmula na planilha**: todo texto que começa com `= + - @`, tab ou CR ganha um `'` na frente.
7. **Prazo**: depois de `rsvpAte`, responde `encerrado`.
8. **E-mail** (só para "Vou"):
   - envia com `MailApp`, nome do remetente "maksō", HTML simples no padrão da página e anexo `.ics`;
   - antes de enviar, checa `MailApp.getRemainingDailyQuota()`;
   - sem cota, grava `email_status = pendente`, e um gatilho de hora em hora envia os pendentes quando a cota volta;
   - falha no e-mail **não** derruba a confirmação (a linha já foi salva).
9. **Fuso**: `America/Sao_Paulo` no projeto do script e na planilha.
10. **Erros**: nunca devolve stack trace. Registra com `console.error` (fica no log de execuções do Apps Script).

### Planilha

- **Respostas**: `Data/hora · Presença · Nome · E-mail · WhatsApp · Acompanhante · Nome do acompanhante · Restrição alimentar · Observação · E-mail (enviado/pendente/n.a.) · ID`
- **Resumo** (fórmulas): confirmados · acompanhantes · **total de pessoas** · não vão · e-mails pendentes.
- A planilha é compartilhada com o Victor.

## 8. Visual

Base: `design-md/apple/DESIGN.md` (voltagent/awesome-design-md). Mantemos:
- tipografia SF Pro Display/Text com tracking negativo nos títulos e corpo de 17px / 1.47;
- seções em blocos de borda a borda, alternando escuro e claro (a troca de cor é o divisor);
- pills como forma de ação e `scale` no toque;
- hairlines `#e0e0e0`;
- nada de sombras em cards ou botões.

### Desvios conscientes do DESIGN.md

- **Sem o azul da Apple; a cor de ação é a cor da logo.** A logo vem num quase-preto avermelhado (`#1b0001`, cor de couro escuro), que vira a cor da marca. Ela substitui o `#1d1d1f` da Apple como cor do texto principal e das ações no claro: pill `#1b0001` com texto branco. No escuro, a pill é branca com texto `#1b0001`. O foco do teclado usa anel de 2px com offset, na cor do texto.
- **Logo em serifa + interface em SF Pro.** A logo é o único elemento em serifa; títulos, textos e campos seguem a tipografia da Apple. Esse contraste é comum em marcas de luxo e deixa a logo como protagonista.
- **Um campo de luz no fundo do hero.** A Apple proíbe degradê decorativo porque a atmosfera vem da fotografia; como não temos fotos, a luz em movimento cumpre esse papel. Ela também é o que dá ao vidro algo para refratar.

### 8.1 Mobile primeiro (requisito do Victor)

O desenho e o código partem do celular em pé; telas maiores são melhorias progressivas (`min-width`).

| Ponto | Regra |
|---|---|
| Larguras-alvo | 360, 375, 390, 414 e 430px em pé; celular deitado; tablet; desktop. Nenhuma pode ter rolagem horizontal |
| Altura do hero | `100svh` (fallback `100vh`), para a barra do Safari/Chrome não fazer o hero "pular" ao rolar |
| Áreas seguras | `viewport-fit=cover` + `env(safe-area-inset-*)` no hero, no rodapé e nas laterais (notch / Dynamic Island / barra de gestos) |
| Barra de status | `<meta name="theme-color" content="#000000">` |
| Coluna | Uma coluna até 734px. Formulário com largura total menos 20px de margem por lado e máx. 560px centralizado no desktop |
| Escolha "Vou / Não vou" | Dois chips lado a lado, 50/50, com 52px de altura |
| Teclado virtual | `enterkeyhint="next"` nos campos e `"send"` no último; o campo focado entra na tela (`scrollIntoView({block: "center"})`); nada fixo que o teclado cubra |
| Toque | Alvos ≥ 44px (botões principais 52px), `touch-action: manipulation`, sem dependência de hover, `-webkit-tap-highlight-color: transparent` com estado de toque próprio |
| Títulos | 34px no celular → 48px no desktop (hero); o tamanho da logo é definido pela largura, não pelo texto |
| Depois do envio | O resultado (obrigado / erro) é rolado para o centro da tela, com foco no título |
| Peso | ≤ 120 KB transferidos antes de interagir (sem a fonte Inter). Logo inline (~4 KB); JS sem framework; WebGL só depois do primeiro paint |
| 4G | Primeira renderização útil (logo + convite + botão) em < 2 s numa conexão 4G simulada |

### Hero e vidro líquido

- Um `<canvas>` WebGL de tela cheia desenha o fundo: 3–4 manchas de luz suaves em tons de couro que conversam com o `#1b0001` da logo (vinho/bordô, conhaque e um toque de champanhe) sobre quase-preto, movendo-se devagar (ciclos de 20–30 s).
- O mesmo shader desenha a **cápsula de vidro**. Dentro dela, o fundo é amostrado com deslocamento de lente (refração maior perto da borda), um leve aumento e brilho, um realce especular fino na borda superior e uma sombra interna sutil.
  - Como o fundo é nosso (procedural), a refração funciona **igual no iPhone, Android e desktop**, coisa que o CSS não consegue.
- A **logo** fica por cima do canvas, como SVG inline branco (`fill="currentColor"`) dentro do `<h1>`, nítida em qualquer tela. O `<title>` "maksō" serve ao leitor de tela.
  - A logo tem proporção ≈ 3,9 : 1. No celular, ocupa ~70% da largura da tela (máx. 520px no desktop), e a cápsula a envolve com folga.
  - A posição e o tamanho da cápsula vêm do `getBoundingClientRect()` do `<h1>` a cada resize.
- **Desempenho**:
  - DPR limitado a 1.5;
  - pausa quando o hero sai da tela (IntersectionObserver) ou a aba some (`visibilitychange`);
  - começa depois do primeiro paint.
- **`prefers-reduced-motion`**: desenha um quadro parado.
- **Plano B** (sem WebGL ou contexto perdido): fundo com gradientes CSS estáticos e cápsula com `backdrop-filter: blur(20px) saturate(180%)` mais realces `inset`.
- **Entrada**: a cápsula aparece com opacidade + `scale(0.96→1)` em 600 ms ease-out, uma vez por sessão (`sessionStorage`).

### Tokens

| Uso | Valor |
|---|---|
| Texto e ações (cor da marca, da logo) | `#1b0001` |
| Fundo claro / parchment | `#ffffff` / `#f5f5f7` |
| Hero | `#000000` → `#272729` |
| Texto secundário | `#7a7a7a` (no escuro: `#cccccc`) |
| Hairline | `#e0e0e0` |
| Erro | vermelho com contraste AA sobre branco |
| Raios | pill `9999px`, campos `11px`, cards `18px` |
| Espaçamento | base 8px; seções 80px (48px no celular) |

**Fonte**: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, "Helvetica Neue", Arial, sans-serif`. O `system-ui` genérico fica de fora, para o Android usar Inter e não Roboto. Inter vem do Google Fonts com subset `latin-ext` (tem o "ō") e `display=swap`.

### Movimento e interação (regras do emil)

- Transições sempre em propriedades específicas (nunca `transition: all`): 150–250 ms com `cubic-bezier(0.23, 1, 0.32, 1)`.
- Toque em botão: `scale(0.97)`.
- Hover só em `@media (hover: hover) and (pointer: fine)`.
- Sem animação ao rolar, sem parallax e sem animar `height`. Os campos que aparecem (acompanhante) entram com opacidade + translate.
- Alvos de toque ≥ 44px, `touch-action: manipulation`, `text-wrap: balance` nos títulos e nenhum salto de layout ao trocar de estado (a área do formulário mantém a altura mínima durante a troca para a tela de obrigado).
- Status anunciado em região `aria-live="polite"`.

## 9. Hospedagem, domínio e QR

- **Site**: Render, static site, a partir de um repositório GitHub. Um script Node sem dependências (`scripts/build.mjs`) gera `dist/` a partir de `config.json` e produz:
  - o `config.js` da página;
  - o `evento.ics`;
  - o `Config.gs` do Apps Script.
- **Fonte única da verdade**: `config.json`, com dados do evento, prazo, URL do Apps Script e domínio.
- **QR**: SVG + PNG de alta resolução, estático, apontando para a URL pública do Render (`https://{serviço}.onrender.com/`). Decisão do Victor: sem domínio próprio. **Para o QR nunca morrer, o static site no Render nunca pode ser apagado nem renomeado.** Um domínio próprio pode ser adicionado depois, mas a URL `onrender.com` continua respondendo. O QR final só é gerado depois do primeiro deploy, com o nome do serviço já fixado.
- **Depois do evento**: a página mostra o estado "evento passado". Mais tarde, o domínio pode apontar para o próximo site da marca, e os convites continuam funcionando.
- **SEO**: `noindex` (evento privado, não deve aparecer no Google). Tags Open Graph com imagem simples (a logo em branco sobre fundo escuro) para o caso de alguém mandar o link no WhatsApp.
- **Logo**: vem do PDF do Illustrator (`makso-alta.pdf`). Convertida para SVG vetorial, com corte justo e `fill="currentColor"`, em `assets/brand/makso-logo.svg`. Ícones (favicon e apple-touch-icon) usam o Ō da logo.
- **Apps Script**: implantado como web app ("Executar como: eu", "Acesso: qualquer pessoa") na conta do cliente. O README traz o passo a passo; `clasp` é opcional.

## 10. Testes e verificação

- `node --test` (Node 22, sem dependências) cobre as funções puras compartilhadas entre página e script:
  - validação, normalização de e-mail e WhatsApp;
  - proteção contra fórmula, duplicidade e idempotência;
  - estados por data (aberto/encerrado/passado);
  - URL do Google Agenda e conteúdo do `.ics`.
- A lógica do `doPost` é testada em Node com dublês de `SpreadsheetApp`, `LockService` e `MailApp`.
- Verificação visual automatizada no navegador (Chromium headless), com capturas de tela em 360, 390 e 430px em pé, 844×390 deitado e 1440px, checando que não há rolagem horizontal.
- Verificação manual depois do deploy:
  - iPhone Safari (principal), Android Chrome e desktop;
  - envio duplicado e envio com a rede caindo;
  - e-mail chegando com `.ics`;
  - planilha e resumo corretos;
  - leitura do QR impresso em tamanho real.

## 11. Decisões que tomei (confira)

1. Campo **Nome** adicionado: sem lista prévia e com QR igual para todos, é o que identifica a pessoa.
2. Quem marca **"Não vou"** responde nome, e-mail, WhatsApp e observação; não recebe e-mail nem botão de agenda.
3. **No máximo 1 acompanhante**, com nome obrigatório.
4. Duplicidade = **mesmo e-mail ou mesmo WhatsApp**.
5. **Prazo de confirmação** configurável; padrão de 3 dias antes do evento.
6. Sem o azul da Apple: a **cor de ação é a cor da logo** (`#1b0001`), com **luz em tons de couro/vinho** atrás do vidro.
7. **Vidro líquido em WebGL**, para a refração aparecer também no iPhone; vidro fosco como plano B.
8. Página **só em português** e **fora do Google** (`noindex`).
9. Respostas na **planilha com aba Resumo**; sem aviso a cada confirmação.
10. Aviso curto de uso dos dados abaixo do botão (LGPD exige informar a finalidade, mesmo sem marketing).
11. **SF Pro** nos aparelhos Apple, **Inter** nos demais.

## 12. Respostas do cliente (2026-11-17)

1. **Domínio**: nenhum. Fica a URL genérica `*.onrender.com`.
2. **Dados do evento**: ainda não existem. O `config.json` usa valores provisórios marcados com `TODO`, e a página mostra "Em breve" no lugar dos campos vazios.
3. **Conta Google / e-mail**: vem depois. Primeiro o site fica pronto. O código do Apps Script é entregue completo e testado, mas não é implantado agora.
   - **Modo demonstração** só com `?demo=1` na URL (ou em `localhost`). Nele, a página simula as respostas do servidor (`?demo=1&cenario=ja_respondeu|erro|encerrado|passado`) e mostra um selo discreto "Demonstração — nada é enviado".
     - Nunca liga sozinho, para nenhum convidado receber um "obrigado" falso (anti-objetivo da seção 2).
   - Sem `appsScriptUrl` e sem `?demo`, o formulário aparece desabilitado com o aviso "Confirmações abrem em breve", e nada é enviado.
4. **Código**: no GitHub do Victor. **Site**: numa conta Render separada.

## 13. Deixado para quem constrói

- Textos finais da página e do e-mail (rascunhos no tom da marca, para o cliente revisar).
- Cores exatas das manchas de luz, intensidade da refração e tamanho do nome, dentro dos tokens acima. O hero é mostrado ao Victor como primeiro ponto de checagem antes do resto.
- Máscara do WhatsApp, favicon e imagem Open Graph.
- Estrutura de pastas e nomes de arquivos.

## 14. Revisão de 2026-11-18 (pedido do Victor)

Substitui o que as seções 8 e 8.1 dizem sobre o hero e as cores.

- **Sem cápsula (pílula) e sem vidro líquido.** O WebGL saiu: não há mais `canvas`, `glass.js` nem fundo animado.
- **Logo flutuando.** Animação CSS: sobe e desce `10px` (`14px` no desktop, `6px` no celular deitado) em 6 s, `ease-in-out`, infinita. Uma sombra elíptica suave no "chão" encolhe quando a logo sobe. Com `prefers-reduced-motion`, a logo fica parada. A entrada (uma vez por sessão) continua.
- **Fundo do site inteiro em `#24151F`** (tema escuro):
  - texto `#ffffff` e secundário `#b3a6ae` (contraste 7,5:1);
  - linhas `rgb(255 255 255 / 12%)`;
  - campos com fundo `rgb(255 255 255 / 6%)` e contorno `rgb(255 255 255 / 35%)` (3,2:1);
  - ações em pílula branca com texto `#24151F`;
  - erro `#ff6b78` (6,3:1);
  - `theme-color` e `color-scheme: dark`.
- **Ícones e OG** em `#24151F` com a logo/Ō em branco.

## 15. Contagem de visitas (2026-11-18, pedido do Victor)

- **O pedido:** saber quem acessa o site. O Victor pediu primeiro um "grabify"; recomendei não usar porque registra IP e engana o visitante. Ele escolheu a opção A: **Umami Cloud**, sem cookies e sem dado pessoal, no plano Hobby grátis, com conta entrando pelo GitHub dele e dados nos EUA.
- **Como entra no site:**
  - `src/js/analytics.js` injeta `https://cloud.umami.is/script.js` com `data-website-id` e `data-domains=<host do siteUrl>`;
  - não carrega com `umamiWebsiteId` vazio, no modo demo ou fora do domínio.
- **CSP:**
  - `script-src` libera `https://cloud.umami.is`;
  - `connect-src` libera `https://gateway.umami.is` (para onde o script do Umami Cloud envia `/api/send`).
- **Eventos do funil (sem dado pessoal):**
  - `clicou-confirmar-topo`, `iniciou-formulario`, `erro-validacao`;
  - `confirmou` com `{acompanhante}`;
  - `recusou`, `ja-respondeu`, `encerrado`;
  - `erro-envio`, exceto quando a resposta é `invalido`.
- **Origem:** o QR do convite aponta para `https://makso.onrender.com/?utm_source=convite` (versão 4, ECC Q), para separar o convite impresso dos links compartilhados.
- **Privacidade:** a nota do formulário diz "Medimos as visitas de forma anônima, sem cookies."

## 16. Duas telas, no desenho do cliente (2026-11-18)

Substitui o que as seções 8 e 14 dizem sobre a ordem da página (hero, detalhes, formulário). Cores, fonte e backend continuam iguais.

**Intenção.** O cliente mandou dois rascunhos (feitos como story) e quer o site "mais ou menos desse jeito". Pedido do Victor: "a pessoa só vê o formulário depois de clicar em confirme sua presença". O convite deve parecer exclusivo e direto.

**Objetivos.**
- **Tela 1:** frase, botão, data e logo, como no rascunho.
- **Tela 2:** "Dados para contato" e o formulário, que só aparece depois do clique.
- **Campos:** todos continuam (escolha do Victor).

**Fora do escopo.**
- Sem mudança na planilha, no Apps Script, no e-mail ou nas regras de validação.
- Sem páginas novas.

**Antiobjetivos.**
- O formulário aparecer antes do clique (nem rolando a página).
- O "voltar" do celular sair do site em vez de voltar à tela 1.
- Perder dados já digitados ao voltar para a tela 1.

**Abordagens consideradas.**
- **Escolhida: troca de tela na mesma página.** É a única em que o formulário fica realmente escondido antes do clique.
- Uma página com as duas telas empilhadas e o botão rolando até a 2: o formulário ficaria visível ao rolar.
- Duas páginas (`/` e `/confirmar`): mais lento, sem ganho.

**Tela 1** (`100svh`, conteúdo centralizado, logo no pé):
- Texto, igual ao rascunho: "Algumas coisas precisam ser vistas de perto e você foi escolhida para conhecer em primeira mão." O "escolhida" é do cliente e fica como está.
- Botão-pílula branco com o texto "Confirme sua presença". No visual vai em caixa alta, com espaçamento entre letras.
- Data e hora em duas linhas, com números tabulares: `10.12.2026` e `19h30`. Os minutos aparecem só quando existem (`19h30`). Saem de `event.start`, fixo em −03:00.
- Logo maksō pequena no pé, com a flutuação da seção 14 numa amplitude menor. Fica parada com `prefers-reduced-motion`.
- Título acessível: um `h1` "Lançamento maksō", só para leitores de tela.

**Tela 2** (`#confirmar`):
- Título "Dados para contato".
- Ordem dos campos: Nome, E-mail, Telefone, Você vai? (Vou / Não vou), acompanhante, restrição alimentar, observação.
- "Telefone" é só o rótulo novo do campo que era "WhatsApp". O nome interno, a validação e a coluna da planilha continuam `whatsapp`.
- Botão "Confirmar presença", nota de privacidade e logo pequena no pé.
- A tela de "obrigado" continua dentro da tela 2, com os botões de agenda. A lista de detalhes (local, traje) sai da página e passa a aparecer no "obrigado", só se houver algum detalhe preenchido.

**Navegação.**
- **Clique no botão:**
  - `history.pushState` com `#confirmar`;
  - a tela 1 some e a tela 2 aparece com transição de opacidade e `translateY(12px)` em 280 ms, `ease-out` (sem transição com movimento reduzido);
  - a página vai para o topo e o foco vai para "Dados para contato".
- **"Voltar" do navegador** (`popstate` sem hash): volta à tela 1, e o que foi digitado fica.
- **Link aberto já com `#confirmar`:** abre direto na tela 2.
- **Sem JavaScript:** a tela 2 continua escondida até o clique. O botão é um link `#confirmar`, e a CSS `:target` mostra a tela.
- **Umami:**
  - o evento `clicou-confirmar-topo` continua no botão;
  - o Umami registra `/#confirmar` como visualização, o que vira mais um passo do funil.

**Dados do evento** (Victor, 13h16):
- `event.start = 2026-12-10T19:30:00-03:00`.
- Término padrão: +4 h, ou seja, 23h30.
- Prazo padrão das confirmações: 3 dias antes, 07/12 às 19h30.
- Endereço: "Rua San Marino, 588 – Vila Castela, Nova Lima – MG". O Victor deu o endereço; a cidade foi conferida pelo CEP 34007-076.
- O endereço não aparece nas telas 1 e 2. Ele está no convite impresso, no e-mail de confirmação, no "obrigado" (logo depois de confirmar), no `.ics` e no link "Ver no mapa".

**Fica com quem constrói.** Medidas, espaçamentos e tamanhos de fonte, seguindo os tokens da seção 14 e as regras de toque e acessibilidade de sempre.

### 16.1 Identidade da marca (guia "fontes e cores maksō", 2026-11-18)

O Victor pediu: "use essa fonte e os detalhes de design". Isto substitui as cores e a fonte da seção 14.

**Paleta e contraste** (contra o fundo `#3b2935`):

| Uso | Cor | Contraste |
|---|---|---|
| Fundo (Pantone 6077 C) | `#3b2935` | — |
| Texto principal, logo e botão-pílula (texto `#3b2935` sobre `#e5ddd1`) | `#e5ddd1` | 10:1 |
| Texto secundário, rótulos e contorno dos campos | `#b6a5af` | 5,8:1 |
| Só decoração (linhas finas, sombra da logo); nunca texto nem contorno de campo | `#6b5664` | 2,0:1 |
| Erro (fora da paleta; necessário) | `#ff8f99` | 6,2:1 |

- O `#24151F` sai. `theme-color` passa a `#3b2935`.
- Ícones e imagem de compartilhamento passam a usar o fundo `#3b2935` com a logo em `#e5ddd1`.

**Tipografia.**
- **Serifada da marca:** IvyOra Text Light, nos textos de destaque: a frase da tela 1, "Dados para contato", a data e os títulos do "obrigado".
  - Só existe com licença: Adobe Fonts (Web Project, incluído no Creative Cloud) ou licença web da Ivy Foundry.
  - O site já fica preparado: `config.json` ganha `adobeFontsKitId`; com ele preenchido, carrega `https://use.typekit.net/<id>.css`.
  - A CSP libera `use.typekit.net` (style) e `use.typekit.net` + `p.typekit.net` (font).
  - Sem o kit, usa a substituta livre **Cormorant Garamond 300** (Google Fonts, OFL). A pilha é `"ivyora-text", "Cormorant Garamond", Georgia, serif`.
- **Complementar:** Avenir Light, em rótulos, campos, botões, nota de privacidade e rodapé.
  - Já vem instalada no iPhone e no Mac, então lá é usada a original.
  - Nos outros sistemas entra **Nunito Sans** (Google Fonts, OFL), que substitui a Inter.
  - A pilha é `"Avenir Next", Avenir, "Nunito Sans", system-ui, sans-serif`.
- **Peso e tamanho:**
  - texto corrido e campos em 16 px ou mais, com peso 400 (Avenir Book) para ler bem no fundo escuro;
  - Light só a partir de 20 px.
- **Atesse Std** (assinatura "sofia maksud."): fora desta versão. Não está no rascunho e não há licença web.

**Botões.**
- **Principal:** pílula `#e5ddd1` com texto `#3b2935`, em caixa alta, Avenir com espaçamento de letra `0,12em`, altura de 48 px ou mais.
- **Secundário** (agenda): contorno `#b6a5af`.

**Tela 2.**
- Os campos ficam em dois grupos com o mesmo estilo:
  - "Dados para contato": Nome, E-mail e Telefone;
  - "Sobre a noite": Você vai?, acompanhante, restrição e observação.
- Um link discreto "‹ Voltar" no topo, com área de toque de 44 px ou mais, leva à tela 1 pelo mesmo caminho do "voltar" do navegador.
