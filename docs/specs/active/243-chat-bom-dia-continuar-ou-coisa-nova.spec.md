# 243-chat-bom-dia-continuar-ou-coisa-nova.spec.md

> Task 2/4 da guarda-chuva [`chat-execucao-por-demanda.spec.md`](chat-execucao-por-demanda.spec.md) (fase 2): o bom dia pergunta se o
> desenvolvedor continua de onde parou ou tem coisa nova. Origem: `IDEAS.md` I-025.

## Objetivo

O bom dia proativo termina perguntando, em essência, "bora continuar de onde paramos ou tem coisa nova?". **Continuar** inicia a execução
na última atividade, sem perguntar qual. **Coisa nova** é contada como o desenvolvedor contaria a um colega, e a IA acha onde ela se
encaixa, cria a atividade, pausa o que estava rodando e inicia a nova, avisando cada passo.

## Entregáveis

1. **Instrução do bom dia:** `montarAberturaDoDia` (`backend/src/modules/chat/domain/abertura-do-dia.ts`) troca o fecho "termine
   perguntando por onde ele quer começar" pela pergunta de continuar ou coisa nova, com teste em `abertura-do-dia.test.ts`. A
   instrução continua sendo do sistema, não mensagem gravada.
2. **Continuar:** a IA identifica a última atividade em que o usuário executou (ferramentas de leitura de hoje, como
   `listar_minhas_execucoes_do_dia` e `consultar_execucao_ativa`, mais o dia útil anterior) e inicia a execução nela sem perguntar qual.
3. **Coisa nova:** a IA descobre o projeto e a demanda onde o assunto se encaixa (exemplo do autor: CPF válido recusado na integração de
   pesquisas do projeto X, caso 4821, vai para a demanda **Suporte** do projeto X, normalmente na raiz), reaproveitando a leitura da
   árvore do projeto (`consultar_grafo_do_projeto`, `listar_demandas_do_projeto`) e a ferramenta `sugerir_conexoes_e_lugar`
   (`backend/src/modules/demanda/ferramentas/`). Prefere uma demanda que já existe a criar uma.
4. **Demanda que falta:** a IA propõe `CRIAR_DEMANDA` dentro das regras de hoje (o desenvolvedor cria demanda nos projetos em que está,
   inclusive de estrutura dentro de estrutura, nunca de estrutura na raiz) e **pergunta antes** ("não vi a demanda de Suporte neste
   projeto, vou criar"). Demandas de estrutura não se criam à toa.
5. **Atividade, pausa e início fazem e avisam:** criar a atividade ("investigar CPF válido recusado, caso 4821", com o identificador
   quando houver), pausar a execução ativa e iniciar a nova passam a ser "faz e avisa" (uma linha de aviso por ação, com desfazer), usando
   os níveis de autonomia da task 228 para `CRIAR_ATIVIDADE`, `PAUSAR_EXECUCAO` e `INICIAR_EXECUCAO`. A linha de aviso mostra o caminho
   completo da demanda onde a atividade foi criada. Sem duas execuções ao mesmo tempo (iniciar pausa antes a que está rodando).
6. **Prompts** (CONVERSA, editáveis pelo administrador): nome de atividade (bloco, não execução; identificador do caso quando houver),
   quando continuar e quando encaixar coisa nova. Texto-padrão por migration, se mudar (a próxima livre na hora).
7. **Documentação:** `docs/SYSTEM.SPEC.md` (linha `chat`: bom dia) atualizado.

## Critérios de Aceite

- `npm run test --workspace=backend` aprovado, com teste da instrução do bom dia e da escolha da última atividade, se virar regra pura.
- `npm run build --workspace=backend` aprovado; se tocar o `shared`, também `npm run test --workspace=shared` e o build dele.
- Teste de prompt (aba Prompts) com: "continuar"; coisa nova com demanda existente; coisa nova sem a demanda (a IA pergunta antes de
  criar); coisa nova com execução rodando (pausa a anterior). Evidências em `.artifacts/243-chat-bom-dia-continuar-ou-coisa-nova/`.
- Verificação ao vivo no chat (skill `verify`) em 1920×1080, 1366×768 e 1080×1920, com a tela atual do chat
  (`frontend/src/app/modules/chat/pages/chat`) como análogo: bom dia, os dois caminhos, as linhas de aviso com desfazer e o cartão de
  criar demanda. Estados: sem atividade anterior, com execução rodando, sem a demanda de Suporte.

## Fora de Escopo

- A régua e o painel de autonomia (task 228); o checklist e `DESENVOLVIDA` (task 242); a troca no check-in (task 244); a lista de
  demandas (task 245).
- Mudar quem pode criar demanda, atividade ou execução; ação em nome de outra pessoa (continua "sempre pergunta").
- Check-in automático e Git/Gitea.

## Dependências

- **228** (autonomia, "faz e avisa") antes desta; **242** (a IA entende o checklist).
- Guarda-chuva `chat-execucao-por-demanda.spec.md` (decisões 4 a 10) e `chat-propostas.spec.md` (tabela de autonomia).

## Riscos e Mitigação

- **Lugar errado para a coisa nova.** Mitigação: criar demanda sempre pergunta e o aviso mostra o caminho completo da demanda.
- **Status da atividade ao iniciar.** Hoje `propor_iniciar_execucao` manda a IA perguntar quando a atividade está PENDENTE ou PLANEJADA,
  o que contradiz "inicia sem perguntar qual" e "criar e iniciar". Ver Pontos em aberto.

## Pontos em aberto (o autor confirma ao abrir a task)

- Ao iniciar atividade `PENDENTE` ou `PLANEJADA` em "faz e avisa", a IA deixa de perguntar e passa `novoStatus = DESENVOLVENDO`? Padrão
  proposto: sim, com o aviso dizendo a mudança de status e o desfazer cobrindo o status anterior (`statusAnterior` já é gravado).
- "Última atividade em que parou" quando ela já está `DESENVOLVIDA`: padrão proposto, a IA segue para a próxima do checklist e avisa.
