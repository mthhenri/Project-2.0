# Task 166 — IA: propor atribuir membros e tags a demandas e atividades

> Origem: mapa de lacunas entre o que as telas fazem e o que a IA faz (2026-10-18), no espírito do princípio da guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md): a IA faz o que o usuário faz, sempre com confirmação.

## Objetivo

Atribuir quem trabalha numa demanda e categorizar com tags são ações de gestor que hoje só existem nas telas. A IA passa a **propor** ambas, pelos endpoints `POST/DELETE demanda/:id/membro`, `PUT demanda/:id/tag` e `PUT atividade/:id/tag` de hoje.

## Entregáveis

1. Padrão de toda proposta nova: migration inserindo o código em `tipo_proposta_ia` (modelo da `0037`), enum em `shared/`, DTO de dados, executor em `ExecutorPropostaIaRegistro` (`validar`, `executar` pela service com o `JwtPayload` do usuário, `desfazer`, `estaObsoleta`), ferramenta `FerramentaPropostaIa` que só cria a proposta, cartão no `app-chat-proposta-cartao` e instrução no prompt `CONVERSA`.
2. Tipos `ATRIBUIR_MEMBRO` (adicionar ou remover usuário numa demanda) e `ATRIBUIR_TAG` (substituir o conjunto de tags de demanda ou atividade; o cartão mostra o conjunto antes e depois), ambos GESTOR.
3. Executores via `DemandaService` e `AtividadeService` com o usuário do token; `desfazer` restaura o conjunto anterior de membros ou tags.
4. `propor_atribuir_membro` e `propor_atribuir_tag`, apoiadas em `listar_usuarios` e `listar_tags` (task 162): a IA nunca inventa id nem nome de tag; tag inexistente leva a avisar que criar tag é pela tela (criar tag fica fora).
5. Gestor **não** entra em `demanda_usuario` (acesso por tipo): a ferramenta recusa atribuir gestor, com mensagem clara.
6. Testes: executores (adicionar, remover, desfazer, gestor recusado) e ferramentas só criam proposta.

## Critérios de Aceite

- "Coloca o Fulano na demanda X" e "marca a Y com a tag Z" geram cartão; confirmar aplica e desfazer reverte.
- Atribuir um gestor é recusado antes de existir cartão.
- O acesso do desenvolvedor ao projeto passa a existir ou deixa de existir conforme a regra de `demanda_usuario`.
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.
- Cartão novo verificado ao vivo em `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, tendo como análogo o cartão de `INICIAR_EXECUCAO` (estados vazio, carregando, cheio e erro).

## Fora de Escopo

- Criar, renomear ou excluir tags e usuários.
- Justificativa de ponto (`ponto-justificativa`).

## Dependências

`162` (leituras de equipe e tags) e `153` (gestor).

## Riscos e Mitigação

- `PUT .../tag` substitui o conjunto inteiro: o executor lê o atual, aplica a diferença e guarda o anterior para o desfazer.
