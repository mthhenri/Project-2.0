# 331-execucao-ativa-consulta-com-guarda.spec.md

> Task 3/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-003 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-06.
> Severidade: Média. Área: frontend/casca.

## Objetivo

`ExecucaoAtivaService.carregar()` compartilha a consulta em curso e respeita um intervalo mínimo quando quem pede é o foco ou a volta à aba, como o `IaDisponibilidadeService` já faz.

## Contexto

**A-003 · Média · Cada foco da janela dispara GET /execucao/ativa sem guarda; voltar à aba dispara 2 e mais um GET /checkin/situacao**

A topbar ouve visibilitychange e window:focus no mesmo método e ExecucaoAtivaService.carregar() não tem guarda de consulta em curso nem de tempo. Um alt-tab de volta custa 1 requisição; voltar de aba oculta custa 2 iguais ao mesmo tempo, mais o GET /checkin/situacao da janelinha, que confere mesmo sem execução ativa. A página de detalhe da atividade ainda chama carregar() por conta própria na carga e na volta à aba (terceira cópia).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/shared/layout/topbar/topbar.component.ts:142-146 — @HostListener('document:visibilitychange') e @HostListener('window:focus') em ressincronizarExecucao(), que chama execucaoAtiva.carregar()
- frontend/src/app/core/services/execucao-ativa.service.ts:27-39 — carregar() sempre faz o GET, sem consulta compartilhada nem janela de tempo
- frontend/src/app/modules/checkin/components/checkin-janelinha/checkin-janelinha.component.ts:44-47 — aoVoltar confere a situação em todo visibilitychange visível, sem olhar execucaoAtiva.ativa()
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:185-190 e 337 — a página chama execucaoAtiva.carregar() de novo na volta à aba e na carga
- .artifacts/revisao-requisicoes-e-permissoes/trafego/DESENVOLVEDOR.txt — 'foco na janela 3x' = 3× GET /execucao/ativa; 'aba oculta e visivel' = 2× GET /execucao/ativa + GET /checkin/situacao; 'atividade: detalhe' repete GET /execucao/ativa

Como observar: Em qualquer tela, alternar para outro programa e voltar três vezes: 3 GET /execucao/ativa. Trocar de aba do navegador e voltar: 2 GET /execucao/ativa e 1 GET /checkin/situacao no mesmo instante.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13: 3 focos seguidos da janela = 3 `GET /execucao/ativa`; voltar de aba oculta = 2 `GET /execucao/ativa` iguais e 1 `GET /checkin/situacao`.

## Entregáveis

1. `ExecucaoAtivaService.carregar()` não abre requisição nova com outra em curso e aceita `{ forcar: true }`; sem `forcar`, pula a consulta se a última resposta tem menos de alguns segundos (o valor fica numa constante nomeada).
2. A topbar (`visibilitychange` e `window:focus` no mesmo método) e o detalhe da atividade passam a chamar sem `forcar`; o interceptor de execução, o chat e as propostas continuam forçando.
3. A janelinha do check-in não confere a situação na volta à aba quando não há execução ativa conhecida.
4. Testes do serviço para consulta em curso, intervalo mínimo e `forcar`.

## Critérios de Aceite

- Ao vivo: 3 focos seguidos geram no máximo 1 `GET /execucao/ativa`; voltar de aba oculta sem execução gera 1 `GET /execucao/ativa` e nenhum `GET /checkin/situacao`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Recarga das listas das telas ao voltar à aba (spec própria).

## Dependências

Nenhuma.

