# 407-textos-somente-gestor-atualizados.spec.md

> Task 79/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-103, A-104, A-105 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: docs e backend (Swagger, comentários, ferramentas da IA).

## Objetivo

O `SYSTEM.SPEC.md`, os resumos do Swagger, os comentários e as descrições enviadas ao modelo deixam de dizer "só o gestor" nas ações que o código libera ao auxiliar. Na ferramenta de IA o texto é instrução: o modelo pode recusar o pedido de um auxiliar autorizado.

## Contexto

**A-103 · Baixa · Textos "somente gestor" desatualizados em rotas e ferramentas que o auxiliar usa**

O Swagger, comentários e a descrição enviada ao modelo dizem "só o gestor" em planejamento e conexões, mas o código libera auxiliar. Na ferramenta de IA o texto é instrução para o modelo, que pode recusar o pedido de um auxiliar autorizado.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/controllers/demanda.controller.ts:129 e 133 — resumo "(somente gestor)" com @ExigePermissao(temVisibilidadeTotal)
- backend/src/modules/demanda/controllers/demanda.controller.ts:243 e 248 — "Remover conexão entre demandas (somente gestor)" com @ExigePermissao(podeEditarDemanda)
- backend/src/modules/demanda/services/demanda.service.ts:277-284 — comentário cita `@GestorOnly()` da controller
- backend/src/modules/demanda/ferramentas/propor-desconectar-demanda.ferramenta.ts:20-21 — descrição "Só o gestor." com `permissao = 'AUXILIAR'`; propor-conectar-demanda.ferramenta.ts:13 e 21 — idem
- backend/src/modules/ferramenta-ia/domain/ferramenta-ia.ts:59-60 — 'AUXILIAR' significa temVisibilidadeTotal(tipo)

Como observar: Como AUXILIAR: GET /api/demanda/planejamento?projetoId=1 responde 200 embora o Swagger diga "somente gestor"; no chat, pedir à IA para desligar duas demandas e observar se o modelo recusa citando "só o gestor".

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-104 · Baixa · Documento, Swagger e comentários ainda dizem 'somente gestor' / @GestorOnly onde o código libera o auxiliar**

A tabela de módulos do SYSTEM.SPEC cita `@GestorOnly POST /execucao/registro`, mas a rota usa `@ExigePermissao(podeEditarExecucaoDeOutro)`, que inclui o auxiliar, como diz o parágrafo do auxiliar no mesmo documento. Os resumos do Swagger e comentários de service, executor e ferramentas repetem 'somente gestor'.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- docs/SYSTEM.SPEC.md:1245 — '`@GestorOnly POST /execucao/registro`'
- docs/SYSTEM.SPEC.md:1405 — auxiliar pode 'registrar, editar e excluir execução'
- backend/src/modules/execucao/controllers/execucao.controller.ts:50, 56, 127 e 132 — summary '(somente gestor)' com @ExigePermissao(podeEditarExecucaoDeOutro)
- backend/src/modules/atividade/controllers/atividade.controller.ts:88 e 102 — summary '(somente gestor)' em excluir e restaurar
- backend/src/modules/execucao/services/execucao.service.ts:138 e 407 — 'Restrito a gestor (via @GestorOnly no controller)'
- backend/src/modules/execucao/ferramentas/propor-pausar-execucao.ferramenta.ts:38 — mensagem 'Só o gestor pausa a execução de outra pessoa' com podeConduzirExecucaoDeOutro

Como observar: Auxiliar: POST /api/v1/execucao/registro com atividade, início e fim válidos responde 201, embora a linha 1245 e o Swagger digam que a rota é só do gestor.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-105 · Baixa · SYSTEM.SPEC.md diz que propor_desconectar_demanda é só do gestor; o código libera ao auxiliar**

A tabela de módulos descreve `DESCONECTAR_DEMANDA` como 'só gestor', mas a ferramenta declara `permissao = 'AUXILIAR'`, igual a `propor_conectar_demanda`. A regra de §14 resumida para esta auditoria dá ao auxiliar criar e remover conexões, então o texto da tabela é que ficou para trás.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- docs/SYSTEM.SPEC.md:1254 — '`DESCONECTAR_DEMANDA` (`propor_desconectar_demanda`; só gestor; nível `FAZ_E_AVISA`…'
- backend/src/modules/demanda/ferramentas/propor-desconectar-demanda.ferramenta.ts:21 — `readonly permissao = 'AUXILIAR' as const`
- backend/src/modules/demanda/ferramentas/propor-conectar-demanda.ferramenta.ts:21 — `readonly permissao = 'AUXILIAR' as const`
- backend/src/modules/ferramenta-ia/domain/ferramenta-ia.ts:59-60 — 'AUXILIAR' = `temVisibilidadeTotal(tipo)`

Como observar: Como AUXILIAR, pedir no chat para desconectar duas demandas conectadas: a ferramenta é listada ao modelo e a proposta nasce, ao contrário do que a linha 1254 descreve.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. No `SYSTEM.SPEC.md` §12: a linha de `proposta-ia` (`DESCONECTAR_DEMANDA`) e a de `execucao` (`POST /execucao/registro`, que usa `@ExigePermissao(podeEditarExecucaoDeOutro)`, não `@GestorOnly`).
2. Descrições das ferramentas de IA de conexão e planejamento, summaries do Swagger e comentários de service e executor: "auxiliar, gestor e administrador".

## Critérios de Aceite

- `grep -rni "somente gestor\|só o gestor\|apenas gestor" backend/src docs/SYSTEM.SPEC.md` só devolve o que é mesmo exclusivo de gestor, conferido contra a trava de cada rota (anexo de matrizes do dossiê).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Mudar permissão.

## Dependências

Nenhuma.

