# Task 165 — IA: propor alterar atividade (status, prioridade e nome)

> Origem: mapa de lacunas entre o que as telas fazem e o que a IA faz (2026-10-18), no espírito do princípio da guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md): a IA faz o que o usuário faz, sempre com confirmação.

## Objetivo

Hoje a IA só cria atividade; para marcar "terminei", mudar a prioridade ou renomear, o usuário vai à tela. A IA passa a **propor** essas alterações, pela `PUT atividade/:id` de hoje.

## Entregáveis

1. Padrão de toda proposta nova: migration inserindo o código em `tipo_proposta_ia` (modelo da `0037`), enum em `shared/`, DTO de dados, executor em `ExecutorPropostaIaRegistro` (`validar`, `executar` pela service com o `JwtPayload` do usuário, `desfazer`, `estaObsoleta`), ferramenta `FerramentaPropostaIa` que só cria a proposta, cartão no `app-chat-proposta-cartao` e instrução no prompt `CONVERSA`.
2. Tipo `ALTERAR_ATIVIDADE`: dados `atividadeId` e ao menos um entre `status`, `prioridade` e `nome`; o cartão mostra o antes e o depois ("Status: Desenvolvendo → Desenvolvida"), como na linha de status já feita no cartão de iniciar execução.
3. Executor via `AtividadeService.alterar` (valem o dono da atividade e a recusa de mudar status com execução em andamento: o erro é traduzido, nunca reimplementado); `desfazer` devolve os valores anteriores guardados no resultado.
4. `propor_alterar_atividade`: confere a atividade e guarda os valores anteriores nos dados; "terminei" com execução ativa leva a **pausar antes** (a IA propõe a pausa e só depois o status), em vez de falhar no Confirmar.
5. Testes: executor (alterar, desfazer, execução ativa recusada, dono) e ferramenta só cria proposta e preenche o anterior.

## Critérios de Aceite

- "Terminei a atividade X" propõe marcá-la como desenvolvida; "sobe a prioridade da Y para alta" propõe a mudança; confirmar aplica e desfazer reverte.
- Atividade com execução ativa não gera cartão que falharia: a IA propõe a pausa primeiro.
- Desenvolvedor não altera atividade de outro.
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.
- Cartão novo verificado ao vivo em `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, tendo como análogo o cartão de `INICIAR_EXECUCAO` (estados vazio, carregando, cheio e erro).

## Fora de Escopo

- Excluir atividade (a IA nunca exclui).
- Alterar tags da atividade (task 168).

## Dependências

`145` (propostas de atividade e execução) e a base de propostas (`136`).

## Riscos e Mitigação

- A regra de não mudar o status com execução ativa é da service; o executor só traduz o erro.
