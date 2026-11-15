# 412-demanda-voltar-e-trocar-de-modo.spec.md

> Task 84/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-116 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-02.
> Severidade: Baixa. Área: frontend/demanda. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Decidir se vale guardar o detalhe por pouco tempo: hoje não há memória por demanda, e ir ao Grafo ou ao Controle de horas e voltar recarrega tudo.

## Contexto

**A-116 · Baixa · Voltar a uma demanda já vista e trocar de modo refazem a carga inteira**

Não há cache por demanda: ngOnChanges zera o histórico e chama carregarTudo, por isso voltar a uma demanda vista repete as mesmas 5 (o histórico só serve ao "Voltar" interno, que ainda deixa planoDeOrigem com o plano da demanda de onde se voltou). Ir ao Grafo ou ao Controle de horas destrói a arvore-tela: na volta perde-se a demanda aberta e os ramos expandidos, abre a primeira da pasta e refaz tudo, inclusive a lista do projeto. Sem cache nenhum, só com os achados da árvore e do chat a seleção cai de 5 para 3 (plano, detalhe, atividades).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/components/demanda-aberta/demanda-aberta.component.ts:78-84 — historico.set([]) e carregarTudo(this.demandaId) a cada troca de demandaId
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:177-183 e 204-218 — histórico só na navegação interna; voltar() não restaura planoDeOrigem (declarado na linha 84)
- frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.html:178-179 — @if (modoVisualizacao() === "arvore" && projetoTemDemandas()) em volta de <app-demanda-arvore-tela>
- frontend/src/app/modules/demanda/components/demanda-arvore-tela/demanda-arvore-tela.component.ts:83-85 — demandaAbertaId, aba e expandidas são estado local do componente destruído
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:88 e 432 — projetoDasDemandas é por instância: a lista do projeto é pedida de novo

Como observar: Clicar na demanda A, na B e de novo na A: as mesmas 5 requisições de A. Abrir a demanda B, ir ao modo Grafo e voltar à Árvore: abre a primeira demanda da pasta (não a B) com GET /plano/demanda, /detalhe, /arvore, /demanda?projetoId&allRows, /atividade e /canal.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor pendente

**Antes:** cada volta refaz as requisições da seleção; a troca de modo destrói e recria a árvore.

**Opções:**

1. Aceitar: com as outras specs a seleção cai para 3 requisições e o dado está sempre fresco.
2. Guardar o último detalhe por id por pouco tempo e manter na página a demanda aberta ao trocar de modo.

Recomendação da auditoria: opção 1; reavaliar depois das outras specs desta tela.

## Entregáveis

1. A decisão registrada; na opção 2, a memória curta por id com invalidação nas mutações e teste.

## Critérios de Aceite

- Na opção 2: voltar a uma demanda vista há poucos segundos não gera requisição.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. Depois de `406-demanda-selecao-sem-a-arvore-que-ninguem-usa` e `405-demanda-botao-do-chat-sem-pergunta-a-cada-selecao`.

