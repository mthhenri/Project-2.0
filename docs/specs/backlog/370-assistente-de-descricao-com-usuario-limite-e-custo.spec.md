# 370-assistente-de-descricao-com-usuario-limite-e-custo.spec.md

> Task 42/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-053 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: Rota irmã de POST /assistente/alterar-trecho, que está conforme..
> Severidade: Média. Área: backend/assistente. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

A rota deixa de ser um acesso à IA sem dono: recebe o usuário, limita o texto e registra o uso em Custos, como `alterar-trecho` já faz no mesmo controller.

## Contexto

**A-053 · Média · POST /assistente/auxiliar-descricao chama a IA sem usuário, sem limite de tamanho e sem registrar o uso**

A rota não recebe o usuário ativo, não confere nenhuma entidade (o contexto é texto livre do cliente) e não chama `iaUsoService.registrar`, ao contrário de `alterar-trecho` no mesmo controller. `textoOriginal` e `contextoEntidade` não têm `MaxLength`. Qualquer tipo usa a IA como proxy de texto livre e o gasto não aparece em Custos.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- /home/user/Project-2.0/backend/src/modules/assistente/controllers/assistente.controller.ts:13-16 — `auxiliarDescricao(@Body() dto)` sem `@ActiveUser()`
- /home/user/Project-2.0/backend/src/modules/assistente/services/assistente.service.ts:49-82 — chama `iaService.gerar` e devolve, sem `iaUsoService.registrar`
- /home/user/Project-2.0/backend/src/modules/assistente/services/assistente.service.ts:128-137 — `alterarTrecho` registra o uso com `usuarioId` e `demandaId`
- /home/user/Project-2.0/shared/src/dtos/assistente/AssistenteDescricaoAuxiliarDto.ts:4-14 — `textoOriginal` só com `@MinLength(10)`; `contextoEntidade` só `@IsString/@IsNotEmpty`
- /home/user/Project-2.0/shared/src/dtos/assistente/AssistenteTrechoAlterarDto.ts:24-36 — a rota irmã limita `bloco`, `selecao` (8000) e `pedido` (2000)

Como observar: Como DESENVOLVEDOR: POST /assistente/auxiliar-descricao {"textoOriginal":"<texto de dezenas de KB>","tipoEntidade":"demanda","contextoEntidade":"qualquer coisa"}. Esperado: limite de tamanho e a chamada na aba Custos em nome do usuário. O código: 200 com o texto da IA e nenhum registro de uso.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

Os limites de tamanho entram no DTO de entrada (`AssistenteDescricaoAuxiliarDto`), que é contrato.

**Antes:** `textoOriginal` e `contextoEntidade` sem `MaxLength`; o gasto não aparece em Custos.

**Opções:**

1. Limites iguais aos de `alterar-trecho`.
2. Outros valores definidos pelo autor.

## Entregáveis

1. O controller passa `@ActiveUser()` à service e a service registra o uso (`iaUsoService.registrar`).
2. `MaxLength` nos dois campos do DTO, com os valores decididos.
3. Remover o `@UseGuards(JwtAuthGuard)` repetido do controller (o guard é global).
4. Testes da service (uso registrado) e do DTO (limite).

## Critérios de Aceite

- Uma chamada à rota aparece em `GET /ia-custo`; texto acima do limite responde 400.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.
