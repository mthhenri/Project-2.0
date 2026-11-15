# 474-visao-volume-nao-carrega-a-visao-escondida.spec.md

> Task 146/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-192 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-02.
> Severidade: Baixa. Área: frontend/projeto.

## Objetivo

Com a visão Volume à frente, a lista de projetos (em `/projeto`) e a árvore de demandas com o grafo (em `/projeto/:id`) só carregam quando o usuário troca para elas.

## Contexto

**A-192 · Baixa · Visão Volume: a visão que está escondida é carregada do mesmo jeito**

Em /projeto?visao=volume a lista de projetos é pedida no ngOnInit mesmo sem ser desenhada. Em /projeto/:id com a visão Volume lembrada no navegador, a árvore de demandas fica montada e escondida e GET /demanda/grafo é pedido mesmo assim. É carga antecipada de propósito para a troca de visão, mas quem só olha o volume paga as duas.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/projeto/pages/projeto-listagem/projeto-listagem.page.ts:112-113 — define a visão pela URL e chama buscarProjetos() sem condição
- frontend/src/app/modules/projeto/pages/projeto-listagem/projeto-listagem.page.html:20-22 — @if (visao() === "VOLUME") { <app-projeto-volume /> } @else { lista }
- frontend/src/app/modules/projeto/pages/projeto-detalhe/projeto-detalhe.page.ts:125-137 — lerVisao() vem do localStorage; ngOnInit chama carregarProjeto e carregarArvore sempre
- frontend/src/app/modules/projeto/pages/projeto-detalhe/projeto-detalhe.page.html:164-167 — comentário e classe --oculto: as demandas ficam montadas, só escondidas

Como observar: Como gestor, abrir /projeto?visao=volume: na rede aparecem GET /projeto?pagina=1&itensPorPagina=100 e GET /projeto/volume?ano&mes. Em /projeto/1 com Volume escolhido antes: GET /demanda/grafo?projetoId=1 além de GET /projeto/volume/anual.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. A carga da visão escondida é adiada até a primeira troca, guardando o estado depois de carregada; teste de componente.

## Critérios de Aceite

- Ao vivo: abrir `/projeto?visao=volume` não faz `GET /projeto`; abrir `/projeto/:id` com a visão Volume lembrada não faz `GET /demanda/grafo`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

