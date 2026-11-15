# 411-demanda-selecao-rapida-cancela-a-carga-anterior.spec.md

> Task 83/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-106 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/demanda.

## Objetivo

Navegar depressa entre demandas (cliques ou setas) deixa de acumular requisições e de correr o risco de uma resposta atrasada preencher a coluna com dados de outra demanda.

## Contexto

**A-106 · Média · Seleção rápida de demandas: nada é cancelado e resposta atrasada pode sobrescrever a demanda aberta**

carregarTudo, carregarAtividades e carregarDemanda assinam sem cancelar a chamada anterior e aplicam a resposta sem conferir se ela ainda é da demanda atual. Navegar depressa (cliques ou setas) deixa as 5 requisições de cada demanda correrem até o fim, e uma resposta atrasada pode pôr na coluna os dados de outra demanda. O plano de origem e o botão de chat já fazem essa conferência.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:388-418 — forkJoin sem cancelamento; this.demanda.set(demanda) sem comparar identificador com demandaIdAtual()
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:320-326 — carregarAtividades aplica atividades.set sem conferir a demanda
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:420-425 — carregarDemanda idem (usada pelas releituras de status e edição)
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:369-372 — contraste: if (demandaId === this.demandaIdAtual()) no plano de origem
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-canal-botao/mensagem-direta-canal-botao.component.ts:56-61 — contraste: geracao descarta a resposta velha

Como observar: Com a rede limitada (Slow 3G), clicar em duas ou três demandas em sequência: as requisições das anteriores ficam pendentes e concluem; se a da primeira chegar por último, a coluna mostra a primeira com a outra selecionada na lista. Lido no código, não reproduzido.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. A carga da demanda aberta é cancelada ao trocar de demanda (`switchMap` sobre o id ou cancelar a assinatura), e `carregarDemanda` e `carregarAtividades` conferem o id antes de aplicar.
2. Teste de componente com duas seleções em sequência e a primeira resposta chegando depois.

## Critérios de Aceite

- Teste passa; ao vivo, segurar a seta para baixo pela lista deixa na aba de rede as cargas anteriores como canceladas.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

