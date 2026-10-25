# 244-chat-checkin-troca-sozinho.spec.md

> Task 3/4 da guarda-chuva [`chat-execucao-por-demanda.spec.md`](chat-execucao-por-demanda.spec.md) (fase 3): o check-in percebe a troca
> de atividade pelo relato e avisa quando o desenvolvedor está tempo demais no mesmo bloco. Origem: `IDEAS.md` I-025.

## Objetivo

No check-in, se o relato mostra que o desenvolvedor já está em outra parte, a IA descreve a execução atual e abre a próxima na
atividade certa do checklist (ou cria o bloco que falta), **sem perguntar**. Se ele está há muito tempo na mesma atividade, a IA comenta
no mesmo bloco da conversa e sugere trocar ou quebrar o bloco.

## Entregáveis

1. **Contexto do check-in:** `montarContextoDoCheckin` (`backend/src/modules/checkin/domain/contexto-do-checkin.ts`) deixa de mandar
   "pergunte também se ele continua na mesma atividade ou vai trocar" e passa a instruir: perceber a troca pelo relato, descrever a
   execução atual (`propor_descrever_execucao` com `TROCAR`) e abrir a próxima na atividade do checklist, ou criar o bloco que falta
   (nunca uma atividade por execução). Em dúvida real, continua na mesma. Teste em `contexto-do-checkin.test.ts`.
2. **Tempo demais no mesmo bloco:** o contexto usa a duração recomendada e o `acimaDoRecomendado` que o check-in já calcula
   (`CheckinSituacaoConsultadaDto`, `checkin.service.ts`); **não há prazo novo**. Acima dela, a IA diz "você está nisso há bastante
   tempo" e sugere trocar ou quebrar o bloco em atividades menores, no mesmo bloco da conversa. Nunca é trava. Não se confunde com o
   rigor proporcional de hoje, que só muda o que a IA pergunta antes da descrição.
3. **Troca faz e avisa:** descrever a execução trocando de atividade, criar o bloco e iniciar a nova são "faz e avisa" (níveis da
   task 228), com uma linha de aviso por ação e desfazer. O desfazer da troca restaura a execução anterior como já faz a
   `DESCREVER_EXECUCAO` (`backend/src/modules/execucao/executores/descrever-execucao.executor.ts`).
4. **Marcar desenvolvida na troca:** quando o relato mostra o bloco acabado, a IA marca `DESENVOLVIDA` (faz e avisa). A regra de hoje
   não deixa mudar o status com execução ativa, então a ordem é pausar, marcar e iniciar a próxima, e o prompt diz isso.
5. **Prompt CHECKIN** (editável pelo administrador): texto novo da troca sozinha e do aviso de tempo, com migration se o texto-padrão
   mudar (a próxima livre na hora).
6. **Documentação:** `docs/SYSTEM.SPEC.md` (linha `checkin`).

## Critérios de Aceite

- `npm run test --workspace=backend` aprovado (contexto do check-in nos dois lados da duração recomendada, com e sem
  `rigorProporcional`); `npm run build --workspace=backend` aprovado.
- Teste de prompt (aba Prompts) com relato de troca, de continuação, de bloco acabado e de tempo acima do recomendado. Evidências em
  `.artifacts/244-chat-checkin-troca-sozinho/`.
- Verificação ao vivo do check-in (skill `verify`) em 1920×1080, 1366×768 e 1080×1920, com a tela atual do chat e o check-in aprovado
  (`frontend/src/app/modules/checkin`) como análogos: troca percebida pelo relato, linha de aviso com desfazer, aviso de tempo e o
  desfazer da troca.

## Fora de Escopo

- Check-in automático e leitura do Git ou do Gitea (fica para a integração com o Gitea).
- Mudar a agenda, o sorteio do intervalo ou a duração recomendada.
- Bom dia e lista de demandas (tasks 243 e 245).

## Dependências

- **228** (autonomia) antes desta; **242** (checklist). A **243** define o "criar e iniciar" que esta reaproveita; o ideal é vir depois
  dela.
- Guarda-chuva `chat-execucao-por-demanda.spec.md` (decisões 9 a 13).

## Riscos e Mitigação

- **Trocar de atividade errado sem perguntar.** Mitigação: aviso com desfazer e o relato cru na conversa para corrigir.
- **Aviso de tempo repetitivo** a cada check-in. Ver Pontos em aberto.

## Pontos em aberto (o autor confirma ao abrir a task)

- Frequência do aviso de tempo. Padrão proposto: em todo check-in acima da duração recomendada, uma vez por check-in, sem prazo novo.
