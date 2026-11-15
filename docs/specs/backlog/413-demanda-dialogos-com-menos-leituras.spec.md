# 413-demanda-dialogos-com-menos-leituras.spec.md

> Task 85/98 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-104 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-02.
> Severidade: Baixa. Área: frontend/demanda.

## Objetivo

Abrir a edição passa a reler a demanda, as tags e os membros numa chamada (`/detalhe`) em vez de três, com as candidatas a pai em paralelo; o diálogo de Tags do menu de contexto usa as tags que o nó já tem.

## Contexto

**A-104 · Baixa · Diálogos de edição e de tags leem em 3 a 4 chamadas o que /detalhe ou o grafo já entregam**

Abrir a edição faz GET /demanda/:id, /demanda/:id/tag e /demanda/:id/membro (a releitura é decisão vigente, mas /demanda/:id/detalhe devolve os três de uma vez) e só depois, em cascata, pede as candidatas a pai. O diálogo "Tags" do menu de contexto pede o catálogo e, em cascata, GET /demanda/:id/tag só para marcar os chips, embora as tags da demanda já estejam no nó do grafo, mantido em dia por aoTagsAlteradas.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component.ts:142-145 — ao abrir: catálogos e carregarDemanda (edição) ou carregarDemandasPai (criação)
- frontend/src/app/modules/demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component.ts:336-340 — forkJoin de recuperar, listarTags e listarMembros
- frontend/src/app/modules/demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component.ts:360 e 395-398 — carregarDemandasPai() só depois do forkJoin (listar({ projetoId, estrutural: true, allRows: true }))
- frontend/src/app/modules/demanda/components/demanda-arvore-painel/demanda-arvore-painel.component.ts:306-328 — abrirDialogTagsPorId: tagService.listarCatalogo() e, no next, demandaService.listarTags(demandaId)
- frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.ts:340-346 — o nó do grafo tem tags e é atualizado sem recarregar

Como observar: Abrir Editar numa demanda: GET /demanda/:id, GET /demanda/:id/tag, GET /demanda/:id/membro e depois GET /demanda?projetoId&estrutural=true&allRows=true. Menu de contexto, Tags: GET /tag (se o catálogo em memória expirou) e depois GET /demanda/:id/tag.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Edição: `recuperarDetalhe` no lugar de `GET /demanda/:id`, `/tag` e `/membro` (a releitura antes de editar continua, como decidido na task 325); pais em paralelo quando o projeto é conhecido.
2. Diálogo de Tags: as tags do nó chegam por entrada; sem leitura em cascata.
3. Testes de componente contando as requisições.

## Critérios de Aceite

- Ao vivo: abrir a edição faz 1 leitura da demanda (hoje 3) e os pais em paralelo.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

