# 439-nova-atividade-com-catalogos-em-memoria.spec.md

> Task 111/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-151 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-08.
> Severidade: Baixa. Área: frontend/atividade.

## Objetivo

Abrir o diálogo de nova atividade e o popover de tags da listagem deixa de pedir todas as tags a cada abertura: eles passam a usar `TagService.listarCatalogo()`, como os seletores de demanda.

## Contexto

**A-151 · Baixa · 'Nova atividade' recarrega três listas a cada abertura; tags fora do catálogo de 60 s**

O formulário é recriado a cada abertura do diálogo e o `ngOnInit` pede de novo as demandas atribuídas, todas as tags e os usuários. As tags usam `tagService.listar()` em vez de `listarCatalogo()`, aqui e no popover de tags da listagem. Abrir e fechar o diálogo três vezes são até nove requisições iguais.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/components/atividade-nova-dialog/atividade-nova-dialog.component.html:15-20 — `@if (visivel()) { <app-atividade-formulario ...> }`
- frontend/src/app/modules/atividade/components/atividade-formulario/atividade-formulario.component.ts:82-90 — `ngOnInit` chama `carregarDemandasAtribuidas`, `carregarTodasAsTags` e `carregarUsuarios`; :158, :174 e :184 — as três leituras
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:806-807 — `tagService.listar()` para o popover e a barra em massa (guarda só `todasAsTags().length === 0` na :500)
- frontend/src/app/modules/tag/services/tag.service.ts:35 — `listarCatalogo()` existe; o detalhe já o usa (atividade-detalhe.page.ts:341)

Como observar: /atividade: abrir 'Nova atividade' (tecla c), fechar e abrir de novo: cada abertura repete a leitura das demandas atribuídas, GET /tag e GET /usuario?ativo=true&allRows=true. Não exercitado na medição.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. `listarCatalogo()` no formulário de nova atividade e no popover de tags da listagem.
2. Teste de componente: abrir o diálogo duas vezes dentro do prazo faz uma leitura de tags.

## Critérios de Aceite

- Ao vivo: abrir e fechar "Nova atividade" duas vezes faz 1 `GET /tag`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

As demandas atribuídas do formulário (a lista muda com frequência) e os usuários ativos (spec `436-usuarios-ativos-dos-seletores-pelo-catalogo`).

## Dependências

Nenhuma.

