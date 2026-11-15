# 431-preco-do-modelo-na-estimativa-do-resumo.spec.md

> Task 103/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-129 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/mensagem-direta e configuracao-ia. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Resolver a contradição: custo e preço por modelo são exclusivos de administrador, mas `POST /mensagem-direta/grupo/:id/resumo/estimativa` devolve `custoEstimadoDolar` a qualquer membro do grupo.

## Contexto

**A-129 · Baixa · Preço do modelo (dado da aba Custos) chega a qualquer membro de grupo pela estimativa do resumo**

A spec declara custo e preço por modelo exclusivos de administrador, mas `ConfiguracaoIaService.listarPrecos()` é pública e sem conferência de tipo, e o resumo de grupo a usa para devolver `custoEstimadoDolar` junto com os tokens estimados. Qualquer membro do grupo (inclusive desenvolvedor) recebe o valor em dólar; com duas estimativas de períodos diferentes dá para deduzir o preço de entrada e de saída do modelo principal do nível rápido. Não achei regra escrita que abra essa exceção.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- docs/SYSTEM.SPEC.md:1258 — módulo `ia-custo`: 'Custo da IA ... exclusivo de administrador', incluindo `PUT /ia-custo/preco` (preço por milhão de tokens)
- backend/src/modules/configuracao-ia/services/configuracao-ia.service.ts:105-108 — `listarPrecos()` sem `usuarioAtivo`; o comentário diz 'Para a aba "Custos" (que confere a permissão)'
- backend/src/modules/mensagem-direta/services/grupo-resumo-ia.service.ts:306-310 — `precoDoModeloRapido()` chama `configuracaoIaService.listarPrecos()` sem conferir tipo
- backend/src/modules/mensagem-direta/services/grupo-resumo-ia.service.ts:110-117 — `estimar` só exige `exigirMembroDoGrupo` e devolve `...estimativa` em `dados`
- backend/src/modules/mensagem-direta/domain/grupo-resumo-ia.ts:132-134 — a estimativa traz `tokensEntradaEstimados`, `tokensSaidaEstimados` e `custoEstimadoDolar` calculado com o preço
- backend/src/modules/mensagem-direta/controllers/mensagem-direta-grupo.controller.ts:154-157 — `POST grupo/:grupoId/resumo/estimativa` sem decorador de tipo

Como observar: Como DESENVOLVEDOR membro de um grupo: POST /mensagem-direta/grupo/<id>/resumo/estimativa com o corpo de `GrupoResumoIaEstimarDto` (período e `enviaCodigo`; não li o DTO). O código responde 200 com `custoEstimadoDolar` e os tokens estimados. Pela regra 'custos exclusivos do administrador', o esperado seria não devolver valor em dólar a quem não é administrador.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** `ConfiguracaoIaService.listarPrecos()` é pública e sem conferência de tipo.

**Opções:**

1. A estimativa mostra o custo a qualquer membro: registrar no `SYSTEM.SPEC.md`.
2. Quem não é administrador recebe `custoEstimadoDolar` nulo (só os tokens).

## Entregáveis

1. A opção escolhida, com teste por tipo de usuário e a regra no documento.

## Critérios de Aceite

- Como desenvolvedor membro do grupo, a estimativa responde conforme a opção.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

