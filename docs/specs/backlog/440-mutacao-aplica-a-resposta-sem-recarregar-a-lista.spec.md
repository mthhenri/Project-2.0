# 440-mutacao-aplica-a-resposta-sem-recarregar-a-lista.spec.md

> Task 112/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-141 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-10.
> Severidade: Baixa. Área: frontend/atividade, calendario e execucao.

## Objetivo

Trocar o status na linha de uma atividade, criar ou alterar um dia no calendário e editar o início ou o fim de uma execução deixam de reler a lista inteira quando a resposta já traz o registro.

## Contexto

**A-141 · Baixa · Recarga da lista inteira depois de mutação cuja resposta já traz o dado**

Trocar o status na linha de /atividade atualiza a linha na hora e mesmo assim relê a página (prioridade, nome e tags não releem). Criar ou alterar dia no calendário relê GET /calendario; editar início ou fim em /execucao aplica a resposta na linha e relê a lista; criar ou remover justificativa relê a lista de justificativas além do mensal. Parte dessas releituras tem motivo (linha que sai do filtro de status, total do dia, meta do mês).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:454-461 — `definirStatusDaAtividade` otimista e, no `next`, `this.buscarAtividades()`; :432-435 — prioridade sem recarga
- frontend/src/app/modules/calendario/pages/calendario-listagem/calendario-listagem.page.ts:432 e :457 — `this.buscarDias()` após `criar` e `alterar`
- shared/src/dtos/calendario/DiaNaoUtilCriadoDto.ts:3-10 — a resposta traz id, diaData, descricao, tipo, duracao, recorrente
- frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts:440-455 — atualiza a linha com `resposta.dados` e depois `if (atual.campo !== 'descricao') this.buscarExecucoes()`
- frontend/src/app/modules/ponto/components/ponto-justificativa-dialog/ponto-justificativa-dialog.component.ts:169-170 e :196-197 — `carregarJustificativas()` + `aoAlterar.emit()`; frontend/src/app/modules/ponto/pages/ponto/ponto.page.html:221 — `(aoAlterar)="carregar()"`

Como observar: /atividade: trocar o status de uma linha: PUT /atividade/:id seguido de GET /atividade?... /calendario: salvar um dia: POST ou PUT seguido de GET /calendario. /execucao: editar o fim de uma execução: PUT /execucao/:id seguido de GET /execucao?... Não exercitado na medição.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Onde a resposta basta, o retorno é aplicado no estado local; a releitura fica só onde um agregado vem do servidor (totais do dia, filtro que exclui a linha).
2. Testes de componente por caso.

## Critérios de Aceite

- Ao vivo: alterar a descrição de um dia no calendário gera só o `PUT`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

