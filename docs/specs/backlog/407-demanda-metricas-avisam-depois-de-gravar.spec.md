# 407-demanda-metricas-avisam-depois-de-gravar.spec.md

> Task 79/98 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-097 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: frontend/demanda.

## Objetivo

Editar a estimativa ou a previsão de término deixa de disparar as releituras antes de a gravação sair: hoje `GET /demanda/grafo` e `GET /demanda/:id` partem antes do `PUT` e podem devolver o valor antigo por cima do novo.

## Contexto

**A-097 · Média · Estimativa/previsão inline: as releituras saem antes do PUT e podem devolver o valor antigo**

app-demanda-metricas emite alterada antes de enviar o PUT; o evento sobe até aoAlteradoPlanejamento(), que dispara GET /demanda/grafo e GET /demanda/:id no mesmo instante, ainda antes de o PUT /demanda/:id sair. Se as leituras forem atendidas antes da gravação, carregarDemanda sobrescreve o valor otimista com o antigo e a barra de horas da linha fica com o dado velho. São 3 requisições para uma mudança que a tela já aplicou.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/components/demanda-metricas/demanda-metricas.component.ts:94-99 — this.alterada.emit(novo) e só depois demandaService.alterar(...)
- frontend/src/app/modules/demanda/components/demanda-aberta/demanda-aberta.component.html:112-119 — (alterada)="aoMetricaAlterada($event)"
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:296-302 — aplica localmente e if (!reverter) this.demandaAlterada.emit()
- frontend/src/app/modules/demanda/components/demanda-arvore-tela/demanda-arvore-tela.component.html:63 e frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.ts:302-304 — alterado -> recarregarGrafo() + arvoreTela.recarregar()
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:420-425 — carregarDemanda faz this.demanda.set(resposta.dados) sem conferir nada
- frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.ts:327-337 — a página já tem aoHorasEstimadasAlteradas, que atualiza o nó sem recarregar, mas este fluxo não o usa

Como observar: Como gestor, abrir uma demanda e alterar "Estimado" no cabeçalho. Rede: GET /demanda/grafo e GET /demanda/:id aparecem antes do PUT /demanda/:id; conferir se as respostas dos GET trazem horasEstimadas antigo e se o valor volta na tela. Lido no código, não reproduzido nesta auditoria.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `app-demanda-metricas` emite `alterada` no sucesso do `PUT` (como o título já faz) ou, melhor, a página recebe `{ demandaId, horasEstimadas }` e aplica sem reler.
2. Teste de componente: nenhuma leitura sai antes da resposta do `PUT`.

## Critérios de Aceite

- Ao vivo, com a rede lenta simulada no navegador: o valor editado não volta ao anterior.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

