# 335-execucoes-da-atividade-as-ultimas-primeiro.spec.md

> Task 7/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-007, A-008 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-05, R-07.
> Severidade: Média. Área: frontend/atividade. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

O detalhe da atividade e o diálogo "Encerrar execução" passam a trabalhar com as execuções mais recentes da atividade e sempre enxergam a execução aberta, sem o teto fixo de 200.

## Contexto

**A-007 · Média · Detalhe da atividade mostra como 'Execuções recentes' as 5 mais antigas e perde a execução aberta (unidade de Atividades, achado ao seguir listarExecucoesPorAtividade)**

GET /execucao devolve as execuções em ordem crescente de início. A página de detalhe guarda itens.slice(0, 5), ou seja, as cinco primeiras da atividade, e procura a execução aberta e a 'última descrição' só nelas. Com seis ou mais execuções, a lista 'Execuções recentes' mostra as mais antigas e execucaoAberta() fica nulo mesmo com a atividade em execução; a faixa 'ativa' e o bloqueio de status dependem desse valor. Pertence à unidade de Atividades; registrado porque usa o mesmo método do diálogo de encerrar.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/execucao/repositories/execucao.repository.ts:385-387 — ORDER BY usuario.nome_completo ASC, execucao.inicio_data ASC seguido do LIMIT
- backend/src/modules/execucao/repositories/execucao.repository.integracao.test.ts:214 — teste 'listar: ordena por nome do usuário e depois por início'
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:40 — EXECUCOES_RECENTES = 5
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:356 e 374 — execucoesRecentes.set(execucoes.dados.itens.slice(0, EXECUCOES_RECENTES))
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:115 — execucaoAberta procura fimData === null só em execucoesRecentes()
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:137, 143, 152 — estadoFaixa, statusBloqueado e ultimaDescricao dependem dessa lista
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.html:124 e 310-319 — a faixa 'ativa' usa execucaoAberta(); o bloco se chama 'Execuções recentes'

Como observar: Numa atividade com 6 ou mais execuções, iniciar uma execução e abrir /atividade/:id: o bloco 'Execuções recentes' lista as cinco primeiras da história e a faixa de execução em andamento não aparece. Não executei; confirmar na aplicação.

Verificação na auditoria: código lido pelo agente principal: `atividade.service.ts:93` pede `itensPorPagina=200`, o repository ordena por `inicio_data ASC` e `atividade-detalhe.page.ts:356` guarda `itens.slice(0, 5)`; medido que o detalhe pede `GET /execucao?atividadeId=:id&itensPorPagina=200`.

**A-008 · Média · Diálogo 'Encerrar execução' pede até 200 execuções da atividade, em ordem crescente: acima de 200 a própria execução aberta some do cabeçalho**

Abrir o diálogo (pelo chip, por Atividades ou por Execuções) faz GET /execucao?atividadeId=:id&itensPorPagina=200. A lista vem da mais antiga para a mais nova e é mostrada inteira sob o título 'Últimas execuções desta atividade'. O cabeçalho (projeto, atividade e dono) é tirado da linha da execução aberta dentro dessa lista; como o teto corta as mais novas, numa atividade com mais de 200 execuções a execução aberta não vem e o cabeçalho não aparece. O método ainda usa o teto fixo que a task 323 trocou por allRows nos seletores.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/services/atividade.service.ts:93-98 — listarExecucoesPorAtividade envia itensPorPagina=200
- frontend/src/app/shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component.ts:93 e 128-138 — abrir() carrega a lista a cada abertura
- frontend/src/app/shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component.ts:77-80 — execucaoAtual é achada por id dentro da lista
- frontend/src/app/shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component.html:13-27 e 64-87 — cabeçalho depende de execucaoAtual(); a lista é renderizada inteira, sem inverter
- backend/src/modules/execucao/repositories/execucao.repository.ts:303-344 e 385-387 — COUNT + SUM + SELECT com ORDER BY ... inicio_data ASC e LIMIT
- frontend/src/app/shared/layout/topbar/chip-execucao-ativa/chip-execucao-ativa.component.ts:51-61 — o chip só tem id, atividadeId e descricao para passar ao diálogo

Como observar: Clicar no ⏸ do chip: 1 GET /execucao?atividadeId=N&itensPorPagina=200; a lista do diálogo começa pela execução mais antiga. Com mais de 200 execuções na atividade (não exercitado), a linha 'projeto · atividade' do topo não aparece.

Verificação na auditoria: código lido pelo agente principal: `atividade.service.ts:93` pede `itensPorPagina=200`, o repository ordena por `inicio_data ASC` e `atividade-detalhe.page.ts:356` guarda `itens.slice(0, 5)`; medido que o detalhe pede `GET /execucao?atividadeId=:id&itensPorPagina=200`.

## Decisão do autor pendente

A correção barata fica só no front; a eficiente pede parâmetro novo na rota de listagem.

**Antes:** `AtividadeService.listarExecucoesPorAtividade` pede 200 execuções em ordem crescente; o detalhe mostra as 5 primeiras (as mais antigas) e procura a execução aberta só nelas.

**Opções:**

1. Só front: `allRows: true` (decisão da task 323) e usar as últimas N em ordem inversa; a execução aberta é procurada na lista inteira.
2. Rota: `GET /execucao` aceitar ordem decrescente e limite (parâmetros novos no DTO de filtro), e as telas pedirem só as N últimas.

Recomendação da auditoria: opção 1 agora (corrige o defeito); a 2 se o volume de execuções por atividade incomodar.

## Entregáveis

1. Detalhe da atividade: "Execuções recentes" mostra as 5 mais novas; `execucaoAberta()` acha a execução aberta com qualquer quantidade de execuções.
2. Diálogo de encerrar: o cabeçalho não depende de a execução aberta caber no teto; a lista "Últimas execuções" mostra as últimas.
3. Teste de componente do detalhe com 7 execuções, a última aberta: a faixa de execução ativa aparece e o status fica bloqueado.

## Critérios de Aceite

- Ao vivo: atividade com 7 execuções (a última em andamento) mostra a faixa "em execução" no detalhe e as 5 mais recentes na lista.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Paginação do histórico de execuções.

## Dependências

Decisão do autor acima.

