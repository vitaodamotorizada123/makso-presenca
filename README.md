# maksō — confirmação de presença

Página do lançamento da **maksō** (bolsas de luxo feitas à mão). O convidado escaneia o QR do convite, cai nesta página, confirma presença e recebe a confirmação por e-mail. As respostas chegam organizadas numa planilha Google do cliente.

Desenvolvido por **DIMAK Soluções**.

```
Convite (QR) ──▶ site estático no Render ──▶ Apps Script (conta Google do cliente)
                                              ├─ bloqueia resposta duplicada
                                              ├─ grava na planilha "Respostas"
                                              └─ envia e-mail com .ics ──▶ convidado
```

- **Design:** duas telas, no desenho do cliente, com a identidade da marca. Detalhes no spec (`docs/specs/2026-11-17-makso-presenca-design.md`, seções 16 e 16.1).
  - **Tela 1:** frase, botão "Confirme sua presença", data e logo.
  - **Tela 2:** o formulário. Só aparece depois do clique e fica em `#confirmar`, então o "voltar" do celular retorna à tela 1.
  - **Cores:** fundo `#3b2935` (Pantone 6077 C), texto `#e5ddd1` e secundário `#b6a5af`.
  - **Fontes:** IvyOra Text Light e Avenir.
- **Sem dependências:** HTML/CSS/JS puros + Node 22 para o build.

---

## Rodar no computador

```bash
npm run dev            # http://localhost:4173/?demo=1
```

No `localhost` a página entra em **modo demonstração**: simula as respostas e não envia nada. Para ver cada estado:

| URL | O que mostra |
|---|---|
| `/?demo=1` | confirmação normal |
| `/?demo=1&cenario=ja_respondeu` | "Sua resposta já está registrada." |
| `/?demo=1&cenario=erro` | falha de conexão (com "Tentar de novo") |
| `/?demo=1&cenario=invalido` | e-mail recusado pelo servidor |
| `/?demo=1&cenario=encerrado` | confirmações encerradas |
| `/?demo=1&cenario=passado` | evento já aconteceu |

O `?demo=1` também funciona no site publicado, com o selo "Demonstração — nada é enviado". Sem ele, o site real nunca simula nada.

## Testes

```bash
npm test               # regras, agenda, build, Apps Script (com dublês do Google), QR
npm run typecheck      # tipos via JSDoc (tsc)
npm run test:e2e       # navegador real (Chrome + Playwright): layout mobile, logo, formulário
```

---

## Publicar no Render (uma vez)

1. Render → **New → Blueprint** → escolha o repositório `makso-presenca`. O Render lê o `render.yaml`:
   - static site `makso`;
   - build `node scripts/build.mjs`;
   - pasta `dist`;
   - headers de segurança.
2. Depois do primeiro deploy, confira a URL do serviço (ex.: `https://makso.onrender.com`).
   - Se o Render tiver acrescentado um sufixo ao nome, corrija o `siteUrl` em `config.json` e faça commit.
3. **Nunca apague nem renomeie o serviço no Render.** Os convites impressos apontam para essa URL para sempre.

Cada commit na `main` publica o site de novo, sozinho.

## Preencher os dados do evento

Edite `config.json` e faça commit na `main`:

```json
"rsvpDeadline": null,
"event": {
  "title": "Lançamento maksō",
  "start": "2026-12-12T20:00:00-03:00",
  "end": "2026-12-12T23:00:00-03:00",
  "venueName": "Nome do lugar",
  "address": "Rua, número — bairro, cidade",
  "mapsUrl": "https://maps.app.goo.gl/…",
  "dressCode": "Esporte fino",
  "description": "Você está convidado para o lançamento da maksō."
}
```

- **Onde cada dado aparece:**
  - A data aparece na tela 1 como `10.12.2026` / `19h30`.
  - Local, endereço, mapa e traje só aparecem no "obrigado" de quem confirmou e no e-mail. Linhas vazias não aparecem.
- **Datas:** sempre com `-03:00`.
- **Prazo:** `rsvpDeadline: null` fecha as confirmações 3 dias antes do início. Para outra data, informe-a no mesmo formato.
- **O build confere tudo:** se algo estiver errado, o deploy falha com a lista do que corrigir.
- **Script do Google:** ele lê esses dados do próprio site (`/event.json`, com cache de 10 min). Não precisa colar nada de novo.

## Fontes da marca (Adobe Fonts)

O guia da marca usa **IvyOra Text Light**, uma fonte paga. No site ela só pode entrar com licença, e o caminho mais simples é o Adobe Fonts, incluído no Creative Cloud. Enquanto não houver kit, o site usa a **Cormorant Garamond**, gratuita e parecida.

1. Em fonts.adobe.com, com a conta Creative Cloud da marca, adicione **IvyOra Text**, peso Light (300), a um **Web Project**.
2. Em "Domains", coloque `makso.onrender.com`.
3. Copie o **ID do projeto**: são as letras e números de `https://use.typekit.net/<ID>.css`.
4. Cole o ID em `config.json` → `"adobeFontsKitId": "<ID>"` e faça commit na `main`.

A **Avenir** já vem instalada no iPhone e no Mac, então lá aparece a original. Nos outros aparelhos entra a **Nunito Sans**.

## Ligar as confirmações (Apps Script)

**Já ligado (18/11/2026):**
- **Conta:** makso.atelie@gmail.com.
- **Projeto:** "maksō — confirmações".
- **Planilha:** "maksō — Confirmações", no Drive dessa conta.


Enquanto `appsScriptUrl` estiver vazio, o site mostra "Confirmações abrem em breve.". Para ligar:

1. Rode `npm run build`. Os arquivos ficam em `apps-script/dist/`.
2. Na **conta Google do cliente**, abra [script.google.com](https://script.google.com) e crie um **Novo projeto** chamado "maksō — confirmações".
3. Em ⚙️ **Configurações do projeto**, marque "Mostrar o arquivo de manifesto `appsscript.json`".
4. Cole o conteúdo de `apps-script/Codigo.gs` no `Code.gs`. É o script inteiro num arquivo só; ao mudar o script, regenere esse arquivo com o comando `cat` do histórico do git.
5. Selecione a função **`setup`** e clique em **Executar**.
   - Autorize: planilha, envio de e-mail, gatilhos e acesso ao site.
   - O log mostra o link da planilha **"maksō — Confirmações"**.
   - Compartilhe essa planilha com quem precisa ver as respostas.
6. **Implantar → Nova implantação → Tipo: App da Web**:
   - Executar como: **eu**;
   - Quem pode acessar: **Qualquer pessoa**.
   - Copie a URL (`https://script.google.com/macros/s/…/exec`).
7. Cole essa URL em `appsScriptUrl` no `config.json` e faça commit. O site passa a aceitar confirmações.

**Importante:** para atualizar o script depois, use **Implantar → Gerenciar implantações → ✏️ Editar → Versão: Nova versão**. Nunca crie uma "Nova implantação": a URL muda e o site para de funcionar.

## Ler as respostas

- **Aba `Respostas`:** uma linha por pessoa, com data/hora, presença, nome, e-mail, WhatsApp, acompanhante, restrição, observação e status do e-mail.
  - Pode ordenar e filtrar à vontade.
  - Pode inserir colunas suas: o script acha as colunas pelo nome do cabeçalho.
  - **Não renomeie os cabeçalhos.**
- **Aba `Resumo`:** confirmados, acompanhantes, **total de pessoas**, quem não vai, e-mails pendentes e com falha.

## Limite de e-mails

Uma conta Gmail comum envia até **100 e-mails por dia** pelo script.

- **Fila:** se passar disso, a confirmação vale normalmente e o e-mail entra como `pendente`. Um gatilho de hora em hora envia os pendentes quando a cota volta.
- **E-mail que falha:** um endereço que o Google recusa fica como `falhou` e não é reenviado.
- **Proteção contra robôs:** o site tem um limite de 60 confirmações a cada 10 minutos.

## QR code do convite

Depois que o site estiver no ar com a URL definitiva:

```bash
python3 -I scripts/qr.py "https://makso.onrender.com/?utm_source=convite" assets/qr
```

O `?utm_source=convite` faz o Umami separar quem chegou pelo convite impresso de quem recebeu o link por WhatsApp ou outro lugar. O site ignora esse trecho; ele serve só para a contagem.

- **Arquivos:**
  - `qr-makso.svg`: vetor, o arquivo para a gráfica;
  - `qr-makso.png`: 2400×2400.
- **Durabilidade:** o QR é estático e não depende de nenhum serviço de QR. Funciona enquanto o serviço no Render existir.
- **Na impressão:**
  - mínimo de **2,5 cm** de lado;
  - preto sobre fundo claro;
  - sem cortar a margem branca em volta.
  - Teste uma prova impressa com iPhone e Android antes da tiragem.

## Visitas (Umami)

O painel fica em **cloud.umami.is** (entrar com o GitHub `vitaodamotorizada123`, plano Hobby grátis, dados nos EUA). Ele mostra:

- **Visitas:** quantas pessoas abriram o site e quando, inclusive em tempo real.
- **Aparelho:** celular, tablet ou computador; sistema (iOS, Android, Windows…) e navegador; tamanho de tela.
- **Origem:** país, estado e cidade aproximados; de onde a pessoa veio (o `convite` do QR, links de WhatsApp, Instagram…).
- **Funil do formulário** (aba Events):
  - `clicou-confirmar-topo`;
  - `iniciou-formulario`;
  - `erro-validacao`;
  - `confirmou` (com `acompanhante: true/false`);
  - `recusou`, `ja-respondeu`, `encerrado`, `erro-envio`.

O que **não** aparece, de propósito: nome, e-mail, WhatsApp, IP ou qualquer coisa que identifique a pessoa. O Umami não usa cookies. Quem confirmou, com nome, fica na planilha.

- **Configuração:** o ID do site fica em `config.json` → `umamiWebsiteId`. Deixe vazio para desligar a contagem.
- **Quando não conta:** no modo demonstração (`?demo=1`) e no computador local, para os testes não sujarem os números.
- **Limite do plano grátis:** 100 mil eventos por mês e 6 meses de histórico, muito acima do que um lançamento usa.

## Lista de verificação depois de ligar o Apps Script

- [ ] Confirmar com um WhatsApp real: na planilha, o número aparece inteiro (não `5,53E+12`).
- [ ] Escrever `=1+1` na observação: aparece como texto, não como 2.
- [ ] O e-mail chega com o anexo `convite-makso.ics`, e o botão do Google Agenda funciona.
- [ ] Confirmar de novo com o mesmo e-mail: "Sua resposta já está registrada."
- [ ] Abrir a URL do Apps Script no navegador: aparece `{"ok":true,"service":"makso-rsvp",…}`.
- [ ] Escanear o QR impresso.

---

## Estrutura

```
config.json            dados do evento e URLs (fonte única)
shared/                regras usadas pelo site e pelo Apps Script
src/                   página (HTML, CSS, JS)
apps-script/src/       backend no Google (planilha, e-mail, fila)
scripts/               build, servidor local, headers, QR, ícones
tests/                 testes unitários e de navegador
docs/                  design aprovado e plano de implementação
reviews/               auditorias de backend e frontend
```
