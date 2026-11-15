# 406-demanda-selecao-sem-a-arvore-que-ninguem-usa.spec.md

> Task 78/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-100 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-02.
> Severidade: Média. Área: frontend/demanda.

## Objetivo

Cada seleção de demanda deixa de pedir a árvore de sub-demandas, que alimenta um sinal que ninguém lê e ainda derruba a carga inteira se falhar.

## Contexto

**A-100 · Média · GET /demanda/:id/arvore é pedido em toda seleção e a resposta não é usada em lugar nenhum**

carregarTudo inclui recuperarArvore no forkJoin só para preencher o signal subDemandas, que nenhum template nem outro código lê (sobra do diálogo de detalhe antigo). É 1 das 5 requisições de cada seleção, com consulta recursiva no servidor, e ainda derruba o forkJoin inteiro se falhar. Se a tela voltar a precisar das filhas, elas saem do grafo já carregado (demandaPaiId em cada nó).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:388-390 — forkJoin com arvore: this.demandaService.recuperarArvore(identificador)
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:410 — único uso da resposta: this.subDemandas.set(arvore.dados.filhos ?? [])
- grep por subDemandas em frontend/src/app (ts e html, fora testes): só demanda-detalhe.base.ts:43, 77, 170, 194, 212 e 410 — nenhuma leitura em template
- frontend/src/app/modules/demanda/components/demanda-aberta/demanda-aberta.component.ts:56 — DemandaAbertaComponent é a única classe que estende DemandaDetalheBase
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:164-175 — recarregarSubDemandas() (outro GET /arvore) não tem chamador
- shared/src/dtos/demanda/DemandaGrafoNoDto.ts — o nó do grafo tem demandaPaiId, status, horas e tags (tudo de DemandaArvoreItemDto, menos nivel e filhos)

Como observar: Selecionar qualquer demanda na Árvore: GET /demanda/:id/arvore 200 na aba de rede; nenhum elemento da coluna da demanda aberta mostra sub-demandas.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13/14 (administrador): abrir `/demanda` com projeto = 10 requisições; selecionar uma demanda = 5 (`/plano/demanda/:id`, `/demanda/:id/detalhe`, `/demanda/:id/arvore`, `/atividade?demandaId`, `/mensagem-direta/canal/demanda/:id`); voltar a uma demanda já vista = as mesmas 5. O sinal `subDemandas`, único destino da resposta, não é lido por nenhum template nem código (conferido por `grep` pelo agente principal).

## Entregáveis

1. Remover `recuperarArvore` do `forkJoin` de `demanda-detalhe.base.ts`, o sinal `subDemandas`, o campo correspondente do estado e `recarregarSubDemandas`.
2. Teste de componente: selecionar uma demanda não chama `GET /demanda/:id/arvore`.

## Critérios de Aceite

- Ao vivo: a seleção de uma demanda não pede mais `/demanda/:id/arvore`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Remover a rota do backend (a IA e outras telas podem usá-la; ver a spec das rotas sem consumidor).

## Dependências

Nenhuma.

