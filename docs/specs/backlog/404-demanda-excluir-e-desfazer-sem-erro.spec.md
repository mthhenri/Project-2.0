# 404-demanda-excluir-e-desfazer-sem-erro.spec.md

> Task 76/98 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-092, A-093 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; `PROBLEMS.md` P-084; auditoria anterior: R-11, R-15.
> Severidade: Média. Área: frontend/demanda.

## Objetivo

Excluir uma demanda deixa de mostrar um erro logo depois de dar certo, e desfazer a exclusão devolve a demanda à lista e a reabre.

## Contexto

**A-092 · Média · Excluir demanda: a demanda excluída é pedida de novo (404 com aviso) e a vizinha é carregada inteira**

Depois do DELETE 200, o evento de exclusão sobe pelo mesmo caminho de "demanda alterada": a página recarrega o grafo e manda a demanda aberta se reler antes de o componente dela ser desmontado, então sai GET /demanda/<id excluído>, que responde 404 e vira o aviso "Não encontrado". Quando o grafo novo chega, a Árvore abre a primeira demanda da pasta e faz a carga completa dela (plano, detalhe, árvore, atividades, canal e de novo a lista do projeto, porque a coluna foi recriada).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:343-346 — no next do DELETE: demandaExcluida.emit() e aoExcluida()
- frontend/src/app/modules/demanda/components/demanda-arvore-tela/demanda-arvore-tela.component.html:65 — (demandaExcluida)="aoExcluida()"
- frontend/src/app/modules/demanda/components/demanda-arvore-tela/demanda-arvore-tela.component.ts:333-336 — aoExcluida() zera demandaAbertaId e emite alterado
- frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.html:188 e demanda-projeto.page.ts:302-304 — (alterado)="aoAlteradoPlanejamento()", que chama recarregarGrafo() e this.arvoreTela()?.recarregar()
- frontend/src/app/modules/demanda/components/demanda-arvore-tela/demanda-arvore-tela.component.ts:198-200 e frontend/src/app/modules/demanda/components/demanda-aberta/demanda-aberta.component.ts:87-90 — recarregar() -> atualizar() usa demandaIdAtual() (ainda o id excluído; o @if só desmonta na detecção de mudanças seguinte) e chama carregarDemanda
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:420-421 — demandaService.recuperar(identificador), sem erro tratado pela tela
- frontend/src/app/core/interceptors/error-handler.interceptor.ts:38-40 — 404 vira toast 'Não encontrado / Registro não encontrado'
- frontend/src/app/modules/demanda/components/demanda-arvore-tela/demanda-arvore-tela.component.ts:171-178 — effect abre itens[0] quando a demanda aberta some dos nós

Como observar: Como gestor em /demanda?projetoId=<id>, abrir uma demanda, clicar na lixeira do cabeçalho e confirmar. Rede: DELETE /demanda/:id 200; GET /demanda/grafo 200; GET /demanda/:id 404 (toast "Não encontrado"); depois GET /plano/demanda/:v, /demanda/:v/detalhe, /demanda/:v/arvore, /demanda?projetoId&allRows=true, /atividade?demandaId=:v e /mensagem-direta/canal/demanda/:v da vizinha.

Verificação na auditoria: reproduzido na aplicação rodando em 2026-11-14: `DELETE /demanda/:id` 200 seguido de `GET /demanda/:id` 404, do aviso "Não encontrado: Registro não encontrado" e de mais 7 leituras; "Desfazer" fez `PATCH /demanda/:id/restaurar` 200, nenhuma leitura, e a demanda restaurada não voltou à lista.

**A-093 · Média · Desfazer a exclusão não recarrega nada: o aviso vai para um componente já desmontado**

O aposDesfazer emite demandaExcluida na instância da demanda aberta que a própria exclusão desmontou (o @if da coluna), então ninguém ouve: depois do PATCH /demanda/:id/restaurar nenhuma leitura é feita e a demanda só volta à lista na próxima recarga do grafo. Se o evento chegasse, o tratador é o de exclusão e fecharia a demanda aberta naquele momento.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:347-351 — desfazer: () => this.demandaService.restaurar(id); aposDesfazer: () => this.demandaExcluida.emit()
- frontend/src/app/core/services/desfazer.service.ts:66-68 — aposDesfazer roda no next do restaurar
- frontend/src/app/modules/demanda/components/demanda-arvore-tela/demanda-arvore-tela.component.html:56-68 — <app-demanda-aberta> dentro de @if (demandaAbertaId(); as idAberto)
- frontend/src/app/modules/demanda/components/demanda-arvore-tela/demanda-arvore-tela.component.ts:333-336 — aoExcluida() faz demandaAbertaId.set(null) (desmonta a instância) e é o único ouvinte de demandaExcluida
- shared/src/dtos/demanda/DemandaRestauradaDto.ts — a resposta do restaurar traz id, projetoId e nome

Como observar: Excluir uma demanda e clicar em "Desfazer" no toast. Rede: PATCH /demanda/:id/restaurar 200 e mais nada; a demanda não reaparece na lista até outra ação recarregar o grafo. Lido no código; a dossiê registrou a mesma sequência de rede.

Verificação na auditoria: reproduzido na aplicação rodando em 2026-11-14: `DELETE /demanda/:id` 200 seguido de `GET /demanda/:id` 404, do aviso "Não encontrado: Registro não encontrado" e de mais 7 leituras; "Desfazer" fez `PATCH /demanda/:id/restaurar` 200, nenhuma leitura, e a demanda restaurada não voltou à lista.

## Entregáveis

1. A exclusão ganha uma saída própria (não reaproveita o caminho de "demanda alterada"): a página recarrega o grafo e seleciona a vizinha, sem mandar a demanda aberta se reler.
2. O desfazer é tratado pela página (que sobrevive ao componente da demanda aberta): recarrega o grafo e reabre a demanda restaurada.
3. Testes de componente dos dois fluxos.

## Critérios de Aceite

- Repetir o roteiro do dossiê: depois do `DELETE` não há `GET` da demanda excluída nem toast de erro; depois do "Desfazer" a demanda aparece na lista e fica aberta.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Reduzir o que a seleção da vizinha pede (specs próprias).

## Dependências

Nenhuma.

