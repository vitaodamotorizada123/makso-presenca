# Auditoria de Backend: maksō — página de presença

**Perspectiva**: Engenharia de backend. A lente original é Rust/Tauri; aqui ela foi adaptada para Google Apps Script + Sheets, o contrato HTTP navegador ↔ script e o build em Node.
**Data**: 2026-11-17
**Plano**: `docs/superpowers/plans/2026-11-17-makso-presenca.md`

## Resumo do plano

O backend é um web app do Apps Script, que funciona como um endpoint anônimo. Ele valida a confirmação, bloqueia duplicidade sob `LockService`, grava no Google Sheets e envia e-mail com `.ics` via `MailApp`, com uma fila horária para quando a cota acaba. Além disso, um build em Node gera o site estático e o pacote do Apps Script a partir de `config.json`.

## Arquivos revisados

| Arquivo | Papel no backend | Risco |
|---|---|---|
| `apps-script/src/Submission.js` | Núcleo: validação, idempotência, duplicidade, lock | Alto |
| `apps-script/src/SheetStore.js` | Leitura/escrita na planilha | **Alto** (tipos do Sheets) |
| `apps-script/src/Mail.js` + `processPendingEmails` | E-mail e fila | **Alto** (corrida, lock) |
| `apps-script/src/Code.js` | `doPost`/`doGet`/`setup` | Médio |
| `shared/rules.js` | Validação compartilhada | Médio |
| `scripts/build.mjs` | Gera `dist/` e `apps-script/dist/` | Médio (config duplicada, escrita em disco) |

## Veredito: APROVAR COM MUDANÇAS

## Problemas críticos (corrigir antes de construir)

| # | Problema | Arquivo(s) | Falha | Correção |
|---|---|---|---|---|
| C1 | **O Sheets converte o WhatsApp em número.** `setValue('5531998765432')` vira o número 5531998765432 (exibido como `5,53E+12`). A leitura volta `number` e a comparação de duplicidade entre texto e número falha: a mesma pessoa confirma duas vezes. | `SheetStore.js` | Duplicidade não detectada; planilha ilegível | Em `setup()`, aplicar `setNumberFormat('@')` às colunas WhatsApp e ID. Na escrita, prefixar `'`. Na leitura, comparar sempre `normalizeWhatsapp(String(v))` e `normalizeEmail(String(v))`, removendo um `'` inicial se houver. Teste: o fake do Sheets devolve número na coluna WhatsApp e a duplicidade continua detectada |
| C2 | **E-mail em dobro.** O `doPost` grava a linha como `pendente` e só depois envia. Se o gatilho horário rodar nesse intervalo, ele também vê `pendente` e envia. | `Submission.js`, `Mail.js` | Convidado recebe 2 e-mails e a cota cai em dobro | Estado intermediário `enviando`. O `doPost` grava `enviando` quando há cota (senão `pendente`), envia fora do lock e marca `enviado`, ou `pendente` se a cota acabou no meio, ou `falhou` em erro definitivo. O processador só pega `pendente` e devolve para `pendente` os `enviando` com mais de 15 min (o script morreu no meio) |
| C3 | **O gatilho segura o lock enquanto envia vários e-mails.** Com 50 pendentes, isso dá cerca de 50 s de lock. Todo `doPost` nesse período estoura `waitLock(10000)` e o convidado vê "Não conseguimos enviar agora". | `Mail.js` | Erro para convidados justamente no pico de confirmações | O gatilho faz *claim-then-send*: com lock, marca até N = cota restante linhas `pendente` → `enviando` e solta o lock. Envia sem lock. Com lock de novo, grava os status finais |
| C4 | **A config do site e a do script se desencontram.** O `Config.js` do Apps Script é gerado no build e colado à mão. Quando o Victor preencher data/local/prazo no `config.json` (passo 5 do README), o site muda, mas o script continua com os dados velhos se ninguém colar de novo. | `build.mjs`, `Code.js` | E-mail sem data ou com data errada; prazo aplicado errado no servidor | O script lê `${siteUrl}/event.json` (gerado pelo build, mesmo subconjunto público) via `UrlFetchApp`, com `CacheService` de 10 min, e usa o `Config.js` embutido como reserva se o site falhar. O `siteUrl` é a única coisa fixa no script. Teste: o fake do `UrlFetchApp` devolve um prazo novo e ele prevalece sobre o embutido |

## Recomendações

| # | Problema | Arquivo(s) | Por quê | Correção |
|---|---|---|---|---|
| R1 | Criar uma **nova** implantação muda a URL do web app | `README.md` | O site passa a postar numa URL morta e todos recebem "erro" | No README: atualizar sempre em *Gerenciar implantações → Editar → Nova versão*, nunca em "Nova implantação" |
| R2 | Colunas mapeadas por posição fixa | `SheetStore.js` | Se alguém inserir uma coluna na planilha (comum), tudo grava no lugar errado | Ler a linha 1 e mapear cabeçalho → índice a cada operação. Atualizações localizam a linha **pelo ID** na hora (o Victor pode ordenar a planilha) |
| R3 | Endpoint anônimo sem limite | `Submission.js` | Um robô pode encher a planilha e gastar os 100 e-mails/dia mandando para terceiros (risco de a conta Gmail ser marcada) | Limite global suave via `CacheService`: mais de 60 confirmações em 10 min → `erro` e `console.warn`. O texto do e-mail é fixo (o nome é escapado), então o abuso tem pouco valor |
| R4 | Escopos OAuth implícitos | `appsscript.json` | O Apps Script pede mais permissões do que precisa | Declarar `oauthScopes`: `spreadsheets`, `script.send_mail`, `script.scriptapp`, `script.external_request` |
| R5 | Fuso da planilha | `Code.js` (`setup`) | Uma planilha criada por script usa o fuso da conta, que pode não ser São Paulo | `ss.setSpreadsheetTimeZone('America/Sao_Paulo')` |
| R6 | `e.postData` ausente | `Code.js`, `Submission.js` | Um POST sem corpo daria `TypeError` antes do `try` | `rawBody` que não é string vira `invalido`. Teste com `doPost({})` |
| R7 | `invalido` com campo que o formulário não tem (`id`) | `form.js` | O cliente tentaria marcar um campo inexistente | Chaves desconhecidas em `campos` → mensagem geral de erro + novo `id` |
| R8 | Duas leituras completas da planilha por envio | `SheetStore.js` | Desperdício dentro do lock | `findExisting(id, email, whatsapp) → {byId, byContact}` com um único `getValues()` |
| R9 | `--out` arbitrário no build | `build.mjs` | Limpar `dist/` com um caminho errado apagaria outra pasta | Aceitar `--out` só dentro do projeto ou de `os.tmpdir()`; limpar apenas essa pasta |
| R10 | Erro de envio repetido para sempre | `Mail.js` | Um endereço que o `MailApp` recusa seria tentado de hora em hora | Diferenciar cota (`pendente`) de erro (`falhou` + `console.error`). `falhou` não é reprocessado |
| R11 | Ordem de carga dos arquivos no Apps Script | `apps-script/src/*` | Os arquivos rodam no escopo global na ordem do projeto | Nenhum código de topo referencia global de outro arquivo. Teste carregando os arquivos em ordem invertida no `vm` |
| R12 | `bodyBytes` medido em caracteres | `rules.js` | 10 KB precisam ser bytes UTF-8 | `utf8Bytes(s)` em `MaksoRules`, usado no servidor |

## Melhorias opcionais

| # | Sugestão | Motivo |
|---|---|---|
| N1 | `doGet` devolver também `version` (hash do build) | Saber qual versão está implantada sem abrir o editor |
| N2 | `console.error` com o `id` da confirmação | Achar uma execução no log a partir de uma linha da planilha |

## Análise dos caminhos de erro

- **JSON inválido, corpo grande ou corpo ausente** → `invalido`. O cliente mostra uma mensagem geral e gera um novo `id` (R6, R7).
- **Validação** → `invalido` + `campos`. O cliente marca cada campo. ✓
- **Prazo vencido** → `encerrado`. O cliente troca o formulário. ✓ Correto apenas se a config estiver em sincronia (C4).
- **`waitLock` estoura** → `erro`, e o cliente oferece "Tentar de novo" com o mesmo `id`. Idempotente ✓. Fica frequente se o gatilho segurar o lock (C3).
- **`append` falha** (planilha apagada, sem permissão) → `erro`, lock solto no `finally` ✓. O convidado vê erro em toda tentativa. Hoje só o log mostra isso.
- **`MailApp` falha depois do `append`** → a confirmação vale (`ok`), e o status vira `pendente`/`falhou` (C2, R10). Não chega ao convidado, o que é correto: ele já está na lista.
- **Exceção fora do `handleSubmission`** (topo do script, cota do Apps Script) → o Google devolve uma página HTML. O cliente não consegue ler JSON e cai em `erro` ✓.
- **Rede do convidado cai depois de gravar** → o cliente recebe `erro` e reenvia o mesmo `id`. O servidor devolve o status original ✓.
- **Onde o erro se perde**: no `append` que falha sempre e na fila `falhou`. Os dois só aparecem no log de execuções. Por isso a aba `Resumo` ganha "E-mails com falha" (`COUNTIF(J:J;"falhou")`), para o Victor ver sem abrir o log.

## Ciclo de vida dos recursos

| Recurso | Alocado em | Liberado em | Liberado no erro? | Risco |
|---|---|---|---|---|
| Script lock (`doPost`) | `handleSubmission` passo 5 | `finally` | Sim | Baixo |
| Script lock (gatilho) | `processPendingEmails` | `finally`, por fase | Sim, se for claim-then-send | **Alto sem C3** |
| Cota de e-mail (100/dia) | `MailApp.sendEmail` | Renova em 24 h | — | Médio (R3) |
| Gatilho horário | `setup()` | Nunca (permanente) | — | Baixo; `setup` não duplica ✓ |
| Execuções simultâneas (30/usuário) | Cada `doPost` | Fim da execução | Sim | Baixo no volume esperado |
| Linhas `enviando` | `doPost`/gatilho | `enviado`/`pendente`/`falhou` | Recuperadas após 15 min | Médio sem C2 |
| `dist/` em disco | `build.mjs` | Próximo build | — | Baixo com R9 |

## Detalhes do veredito

- Tratamento de erros: **RESSALVAS** (R6, R7, R10)
- Concorrência: **RESSALVAS** (C2, C3)
- Recursos: **RESSALVAS** (C3, R3)
- Contrato navegador ↔ script: **APROVADO** com C1 (os tipos do Sheets são a fronteira que quebra) e C4
- Sistema de arquivos: **APROVADO** com R9
