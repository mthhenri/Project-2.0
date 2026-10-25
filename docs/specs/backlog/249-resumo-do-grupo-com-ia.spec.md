# 249-resumo-do-grupo-com-ia.spec.md

> Task 4/5 da guarda-chuva [`chat-grupos.spec.md`](chat-grupos.spec.md), fase 3. Depende da [`248`](248-canais-de-projeto-e-de-demanda.spec.md) (e, por ela, da 246 e da 247). Usa as propostas das tasks
> [`145`](../done/145-chat-propostas-de-atividade-e-execucao.spec.md) e [`159`](../done/159-ia-cria-projetos-e-demandas.spec.md) e os custos da [`202`](../done/202-custos-pelas-mensagens-do-chat.spec.md).

## Objetivo

Um membro resume com a IA o que foi conversado num grupo ou canal, num período livre, e (em canal) propõe gravar o resumo na documentação da demanda, com consentimento, estimativa de custo e
opção de omitir o código.

## Decisões da guarda-chuva (autor, 2026-10-23)

- **Ação explícita** de um membro, pelo comando **`/resumir`** no compositor. **Período livre**, com a data do último resumo à vista.
- O servidor pega **todas** as mensagens do período, resume **em blocos** e manda os resumos dos blocos para fechar num **único** texto, sem limite visível de mensagens; antes de rodar mostra uma
  **estimativa** e pede confirmação. O texto termina com uma linha dizendo que **foi gerado por IA**. **Sem nomes:** o resumo não cita os autores (opção de citar em `IDEAS.md` I-021).
- **Consentimento:** aviso a quem aciona de que as mensagens vão ao provedor de IA configurado; os demais membros **não** são avisados por mensagem.
- **Código:** a cada resumo, escolher se envia código; se não, os blocos viram `[trecho de código omitido]` **antes** de sair do servidor (usa `contem_codigo`).
- **Onde grava:** no campo `demanda.documentacao`, **acrescentando** ao fim com data e período, por **proposta** que o usuário revisa e confirma; quem aciona precisa poder editar a demanda.
  Canal de demanda → a própria demanda; canal de projeto → o usuário escolhe uma **demanda de destino**; grupo livre → só gera o texto para copiar.
- **Custo** na aba **Custos** (task 202), atribuído a quem acionou. Ao gravar, o canal recebe uma **mensagem do sistema** com cartão clicável da demanda.

## Entregáveis

1. **Migration** (a próxima livre na hora): `grupo_resumo` (grupo, quem acionou, período, `enviou_codigo`, modelo, tokens de entrada e de saída, demanda de destino, se gravou), base do "último resumo"
   e dos custos. Sem `DEFAULT`; `docs/SCHEMA.md` atualizado.
2. **Domínio puro com teste** (`backend/src/modules/mensagem-direta/domain/`): troca de blocos de código por `[trecho de código omitido]` (reaproveitando a detecção do `shared`, `contemBlocoDeCodigo`),
   divisão das mensagens em blocos por tamanho, montagem do prompt sem nomes de autor, estimativa de tokens e de custo e a linha final "gerado por IA" (texto único, em constante do `shared`).
3. **Serviço de resumo** usando `IaService` e os provedores existentes (tasks 129 a 133 e 203): lê **todas** as mensagens do período pelo armazenamento (paginando), resume cada bloco, fecha num texto
   único; respeita o fallback e o nível de modelo do projeto; sem IA no ar, o comando recusa com mensagem clara. Resumo do mesmo período pode repetir; a data do último vem de `grupo_resumo`.
4. **Fluxo em duas chamadas:** `estimar` (devolve número de mensagens, tokens e custo aproximado, sem chamar o provedor de resumo) e `resumir` (confirma e executa). A estimativa mostra que o
   código vai ou não. A execução longa devolve o progresso ou o resultado por stream (padrão do chat da IA) ou por resposta única com limite de tempo; decidir ao abrir a task.
5. **Proposta de gravar na documentação:** o resumo vira **proposta** de alterar `demanda.documentacao`, acrescentando ao fim "data e período" mais o texto, pelo mecanismo de propostas das
   tasks 145/159 (executor de demanda `descrever-demanda`/`alterar-demanda` em `backend/src/modules/demanda/executores/`, conferir qual se aplica); confirmar grava; recusar não grava nada.
   Quem aciona precisa poder editar a demanda (mesma regra do executor); senão o resumo é só para copiar.
6. **Canal de projeto:** a interface pede a **demanda de destino** (lista das demandas do projeto a que a pessoa pode editar) antes da proposta.
7. **Mensagem do sistema** ao gravar: "Resumo gravado na demanda X (período)", com `referencias` `DEMANDA:<id>` (cartão clicável do chat, task 211).
8. **Custos:** a aba **Custos** (202) soma os tokens de `grupo_resumo` além das mensagens do chat (a 202 contou só mensagens, sem tabela de uso); atribuir ao usuário que acionou. Aplicar
   `gerenciamento-de-impacto` em `IaCustoService`/`ArmazenamentoDeChat.somarTokens`.
9. **Frontend:** comando `/resumir` no compositor (211) que abre um diálogo (PrimeNG): período (com "último resumo em <data>"), opção "Enviar o código para a IA" (padrão desligado), aviso de
   consentimento ("as mensagens vão ao provedor de IA configurado"), estimativa e confirmação; resultado com texto, **Copiar** e, em canal, **Gravar na documentação** (leva à proposta);
   estados: carregando, erro, sem mensagens no período, IA fora do ar. Aviso permanente no compositor de canal: "este chat pode ser resumido por IA" (ponto em aberto).
10. **Testes:** domínio (omissão de código, divisão em blocos sem perder mensagem, sem nome de autor, linha final), service com dublê de IA (período, permissão de editar, estimativa, custo
    gravado), repository (integração), proposta, componente do diálogo. Documentação: `docs/SYSTEM.SPEC.md`, `docs/SCHEMA.md`, `CONTEXT.md`, `HISTORY.md`, `MEMORY.md`.

## Critérios de Aceite

- Testes de `shared`, `backend` (unitários e integração) e `frontend`, builds e `npm run repo:verificar` passam.
- **Ao vivo** (IA real ou provedor configurado, canal de demanda com mais mensagens que cabem num bloco): `/resumir` mostra a estimativa; com "enviar código" desligado, nenhum bloco de código sai do
  servidor (conferido no que o provedor recebe); o texto sai sem nome de autor e com a linha de IA; a proposta acrescenta ao fim de `documentacao` com data e período e só grava ao confirmar; o
  canal recebe a mensagem do sistema com o cartão; o custo aparece na aba Custos para quem acionou; um membro sem permissão de editar a demanda só consegue copiar o texto; em grupo livre só
  gera o texto.
- Verificação visual do diálogo em `1920×1080`, `1366×768` e `1080×1920`, claro e escuro, comparada com um diálogo existente (análogo a escolher ao abrir).

## Fora de Escopo

- Resumo automático ao concluir a demanda; citar autores (I-021); avisar os demais membros por mensagem de que houve resumo (decisão do autor: só um aviso, a quem aciona).
- Resumir conversa um a um; busca semântica; editar o resumo antes da proposta além do que a revisão de proposta já permite.

## Dependências

`248`; tasks 145 e 159 (propostas), 202 (custos), 203 (provedores e fallback) em `done/`. Fontes: `chat-grupos.spec.md`, `modelagem.md` §5, `IaService`, `descrever-demanda.executor.ts`.

## Riscos e Mitigação

- **Dado sensível que não é código:** o consentimento e o aviso permanente existem por isso; o resumo nunca roda sem ação explícita.
- **Período grande demais:** o resumo em blocos tem custo proporcional; a estimativa e a confirmação são obrigatórias, e há um teto técnico de segurança (proposta: abortar acima de um número
  de chamadas configurado, a confirmar).
- **Resumo que perde mensagem:** a divisão em blocos cobre o período inteiro; teste garante que a união dos blocos é o conjunto de mensagens.
- **Custos de duas fontes:** somar `grupo_resumo` com as mensagens do chat sem contar duas vezes.

## Pontos em aberto (padrão proposto; autor confirma ao abrir a task)

- Aviso permanente "este chat pode ser resumido por IA" no compositor de canal (decisão aberta da guarda-chuva; proposta: sim).
- Retenção de `grupo_resumo` (modelagem §6): proposta = guardar sem prazo, são poucas linhas.
- Teto de chamadas por resumo e execução por stream ou resposta única.
