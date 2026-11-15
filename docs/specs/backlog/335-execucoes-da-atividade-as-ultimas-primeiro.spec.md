# 335-execucoes-da-atividade-as-ultimas-primeiro.spec.md

> Task 7/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-012, A-013, A-014, A-015 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-05, R-07.
> Severidade: Alta. Área: frontend/atividade. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

O detalhe da atividade e o diálogo "Encerrar execução" passam a trabalhar com as execuções mais recentes da atividade e sempre enxergam a execução aberta, sem o teto fixo de 200.

## Contexto

**A-012 · Alta · Detalhe da atividade mostra como 'Execuções recentes' as 5 mais antigas e perde a execução aberta (unidade de Atividades, achado ao seguir listarExecucoesPorAtividade)**

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

Verificação na auditoria: código lido pelo agente principal: `atividade.service.ts:93` pede `itensPorPagina=200`, o repository ordena por `inicio_data ASC` e `atividade-detalhe.page.ts:356` guarda `itens.slice(0, 5)`; medido que o detalhe pede `GET /execucao?atividadeId=:id&itensPorPagina=200`. Dois auditores chegaram ao mesmo defeito por caminhos diferentes. Não foi reproduzido na tela com uma atividade de 6 ou mais execuções.

**A-013 · Alta · Diálogo 'Encerrar execução' pede até 200 execuções da atividade, em ordem crescente: acima de 200 a própria execução aberta some do cabeçalho**

Abrir o diálogo (pelo chip, por Atividades ou por Execuções) faz GET /execucao?atividadeId=:id&itensPorPagina=200. A lista vem da mais antiga para a mais nova e é mostrada inteira sob o título 'Últimas execuções desta atividade'. O cabeçalho (projeto, atividade e dono) é tirado da linha da execução aberta dentro dessa lista; como o teto corta as mais novas, numa atividade com mais de 200 execuções a execução aberta não vem e o cabeçalho não aparece. O método ainda usa o teto fixo que a task 323 trocou por allRows nos seletores.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/services/atividade.service.ts:93-98 — listarExecucoesPorAtividade envia itensPorPagina=200
- frontend/src/app/shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component.ts:93 e 128-138 — abrir() carrega a lista a cada abertura
- frontend/src/app/shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component.ts:77-80 — execucaoAtual é achada por id dentro da lista
- frontend/src/app/shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component.html:13-27 e 64-87 — cabeçalho depende de execucaoAtual(); a lista é renderizada inteira, sem inverter
- backend/src/modules/execucao/repositories/execucao.repository.ts:303-344 e 385-387 — COUNT + SUM + SELECT com ORDER BY ... inicio_data ASC e LIMIT
- frontend/src/app/shared/layout/topbar/chip-execucao-ativa/chip-execucao-ativa.component.ts:51-61 — o chip só tem id, atividadeId e descricao para passar ao diálogo

Como observar: Clicar no ⏸ do chip: 1 GET /execucao?atividadeId=N&itensPorPagina=200; a lista do diálogo começa pela execução mais antiga. Com mais de 200 execuções na atividade (não exercitado), a linha 'projeto · atividade' do topo não aparece.

Verificação na auditoria: código lido pelo agente principal: `atividade.service.ts:93` pede `itensPorPagina=200`, o repository ordena por `inicio_data ASC` e `atividade-detalhe.page.ts:356` guarda `itens.slice(0, 5)`; medido que o detalhe pede `GET /execucao?atividadeId=:id&itensPorPagina=200`. Dois auditores chegaram ao mesmo defeito por caminhos diferentes. Não foi reproduzido na tela com uma atividade de 6 ou mais execuções.

**A-014 · Alta · Detalhe da atividade: 'execuções recentes' e a execução em andamento saem dos 5 itens mais antigos da lista**

O backend devolve GET /execucao em ordem crescente de início e o detalhe guarda `itens.slice(0, 5)` sem reordenar; a execução aberta é procurada só nesses 5. A partir da 6ª execução da atividade, a que está em andamento (a mais nova) fica de fora: a faixa não vira 'ativa', o status não bloqueia e 'Reutilizar última' oferece a descrição mais antiga. Acima de 200 execuções os diálogos de iniciar/encerrar também perdem as mais novas, e o cabeçalho do encerrar depende de achar a execução nessa lista.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/execucao/repositories/execucao.repository.ts:385-387 — `ORDER BY usuario.nome_completo ASC, execucao.inicio_data ASC` seguido do LIMIT/OFFSET
- frontend/src/app/modules/atividade/services/atividade.service.ts:93-96 — `listarExecucoesPorAtividade` envia só `atividadeId` e `itensPorPagina=200`
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:356 e :374 — `execucoesRecentes.set(execucoes.dados.itens.slice(0, EXECUCOES_RECENTES))`; a constante vale 5 (:40) e o arquivo não tem sort/reverse
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:115 — `execucaoAberta` = `execucoesRecentes().find(fimData === null)`; :152 — `ultimaDescricao` pega o primeiro item encerrado
- frontend/src/app/shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component.ts:77-79 — o cabeçalho vem de `execucoes().find(execucao.id === aberta.execucaoId)`

Como observar: Não executado (auditoria só de leitura). Em /atividade/:id de uma atividade com 6 ou mais execuções, iniciar a execução: a rede mostra POST /execucao e GET /execucao?atividadeId=:id&itensPorPagina=200 com a execução nova no fim da resposta; conferir se a faixa continua oferecendo 'iniciar' e se a lista mostra as 5 mais antigas.

Verificação na auditoria: código lido pelo agente principal: `atividade.service.ts:93` pede `itensPorPagina=200`, o repository ordena por `inicio_data ASC` e `atividade-detalhe.page.ts:356` guarda `itens.slice(0, 5)`; medido que o detalhe pede `GET /execucao?atividadeId=:id&itensPorPagina=200`. Dois auditores chegaram ao mesmo defeito por caminhos diferentes. Não foi reproduzido na tela com uma atividade de 6 ou mais execuções.

**A-015 · Alta · GET /execucao?atividadeId=:id&itensPorPagina=200: 200 linhas para usar 5, repetido a cada ação**

O detalhe da atividade pede 200 execuções e guarda 5; a mesma requisição se repete depois de iniciar, pausar, registrar tempo, pausar pelo chip e a cada volta à aba. Os diálogos de iniciar e de encerrar pedem as mesmas 200 a cada abertura para a lista 'Últimas execuções' e, no encerrar, para montar o cabeçalho. Não é seletor que precise da lista inteira: o uso é 'as últimas N'.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/services/atividade.service.ts:96 — `.set('itensPorPagina', '200')`
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:342 e :367 — chamadas em `carregarTudo` e `carregarExecucoes`; :356 e :374 — só `slice(0, 5)` é guardado
- frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts:164, :189, :311 e :318 — gatilhos de `carregarExecucoes` (pausa pelo chip, visibilitychange, registro, iniciar/pausar)
- frontend/src/app/modules/atividade/components/execucao-iniciar-dialog/execucao-iniciar-dialog.component.ts:93 e :138-139 — `abrir` chama `listarExecucoesPorAtividade`
- frontend/src/app/shared/components/execucao-encerrar-dialog/execucao-encerrar-dialog.component.ts:93 e :130-131 — idem no diálogo de encerrar (usado pela listagem, por /execucao e pelo chip)
- .artifacts/revisao-requisicoes-e-permissoes/trafego/ADMINISTRADOR.txt:110-114 — medido: GET /execucao?atividadeId=5&itensPorPagina=200 ao abrir o detalhe

Como observar: /atividade/:id: GET /execucao?atividadeId=:id&itensPorPagina=200 ao abrir e de novo após iniciar, pausar, registrar e ao voltar à aba. Em /atividade, clicar play ou pause numa linha: a mesma requisição ao abrir o diálogo.

Verificação na auditoria: código lido pelo agente principal: `atividade.service.ts:93` pede `itensPorPagina=200`, o repository ordena por `inicio_data ASC` e `atividade-detalhe.page.ts:356` guarda `itens.slice(0, 5)`; medido que o detalhe pede `GET /execucao?atividadeId=:id&itensPorPagina=200`. Dois auditores chegaram ao mesmo defeito por caminhos diferentes. Não foi reproduzido na tela com uma atividade de 6 ou mais execuções.

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

