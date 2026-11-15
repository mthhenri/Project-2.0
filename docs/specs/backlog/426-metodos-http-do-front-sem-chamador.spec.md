# 426-metodos-http-do-front-sem-chamador.spec.md

> Task 98/98 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-131, A-132, A-133 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-02.
> Severidade: Baixa. Área: frontend (atividade, calendario, demanda, execucao, mensagem-direta).

## Objetivo

Tirar dos services do frontend os métodos de requisição que não têm chamador, com os testes que só os cobriam: os quatro da varredura por script, `recarregarSubDemandas` da demanda aberta e `MensagemDiretaGrupoService.recuperar`.

## Contexto

**A-131 · Baixa · Métodos HTTP sem chamador: recuperarAncestral e recarregarSubDemandas**

DemandaService.recuperarAncestral (GET /demanda/:id/ancestral) não tem chamador desde que o /detalhe passou a trazer os ancestrais, e recarregarSubDemandas (GET /demanda/:id/arvore) também não. Removida a árvore do forkJoin, recuperarArvore fica igualmente sem uso.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/services/demanda.service.ts:114-116 — definição de recuperarAncestral; grep por recuperarAncestral em frontend/src/app (ts e html, fora testes) só acha esta linha
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:164-175 — recarregarSubDemandas(); grep só acha a definição
- frontend/src/app/modules/demanda/services/demanda.service.ts:105-107 — recuperarArvore: chamadores só em demanda-detalhe.base.ts:167 e 390
- backend/src/modules/demanda/controllers/demanda.controller.ts:93 — rota @Get(':id/ancestral') segue publicada

Como observar: Não aparece na rede: nenhuma tela chama GET /demanda/:id/ancestral. Confere-se com grep por recuperarAncestral e recarregarSubDemandas em frontend/src.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-132 · Baixa · `MensagemDiretaGrupoService.recuperar` (GET /mensagem-direta/grupo/:grupoId) não tem chamador**

O método existe no service, mas nenhum dos cinco arquivos que injetam `MensagemDiretaGrupoService` o chama. As ocorrências de `.recuperar(` no módulo são do serviço de referências e do `recuperar()` interno do estado.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/mensagem-direta/services/mensagem-direta-grupo.service.ts:88-89 — `recuperar(grupoId)` faz `GET ${urlBase}/${grupoId}`
- grep em frontend/src/app (ts e html, fora de spec/test) por `grupoServi*.recuperar(` e `grupoService.recuperar(` — nenhum resultado (cobre ia-resposta e supervisao-chat.page)
- grep por `this.api.recuperar(` em mensagem-direta-grupo-estado.service.ts, mensagem-direta-canal-botao.component.ts e mensagem-direta-grupo-resumo.component.ts — nenhum resultado
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-referencia-cartao/mensagem-direta-referencia-cartao.component.ts:56 e frontend/src/app/modules/mensagem-direta/components/mensagem-direta-conversa/mensagem-direta-conversa.component.ts:238 — as chamadas `.recuperar(tipo, id)` são do `MensagemDiretaReferenciaService`

Como observar: A rota GET /mensagem-direta/grupo/N não aparece na aba de rede em nenhum fluxo do popup, da supervisão ou do botão de chat.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-133 · Baixa · Quatro métodos HTTP de services do frontend sem nenhum chamador**

Varredura por script dos 195 métodos do frontend que fazem HTTP: quatro só aparecem na própria definição e no teste do service. `AtividadeService.recuperarExecucaoAtiva()` e `ExecucaoService.buscarAtiva()` pedem `GET /execucao/ativa`, que hoje é do `ExecucaoAtivaService`; `CalendarioService.verificarDiaUtil()` pede `GET /calendario/verificar`; `DemandaService.recuperarAncestral()` pede `GET /demanda/:id/ancestral`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/services/atividade.service.ts:81 — `recuperarExecucaoAtiva()`
- frontend/src/app/modules/execucao/services/execucao.service.ts:61 — `buscarAtiva()`
- frontend/src/app/modules/calendario/services/calendario.service.ts:47 — `verificarDiaUtil()`
- frontend/src/app/modules/demanda/services/demanda.service.ts:114 — `recuperarAncestral()`

Verificação na auditoria: varredura por script e `grep` do agente principal em 2026-11-14: uma ocorrência fora de teste para cada nome (a definição).

## Entregáveis

1. Remover os métodos e os casos de teste que só os exercitam, depois de `npm run impacto` em cada service confirmar que não há consumidor. `DemandaService.recuperarArvore` sai junto se a spec `406-demanda-selecao-sem-a-arvore-que-ninguem-usa` já tiver tirado o último chamador.

## Critérios de Aceite

- Build e testes do frontend sem erro; `grep` pelos nomes removidos em `frontend/src` não devolve nada.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

As rotas do backend correspondentes (spec `425-rotas-sem-consumidor-na-interface`).

## Dependências

Nenhuma.

