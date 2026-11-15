# 451-minhas-demandas-relida-no-evento-certo.spec.md

> Task 123/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-165, A-166 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/chat.

## Objetivo

A lista "Minhas demandas" deixa de ser relida toda vez que o componente é recriado (abrir uma demanda, ir a Planejamento e voltar) e passa a ser relida quando algo muda: proposta confirmada, ajustada ou desfeita.

## Contexto

**A-165 · Baixa · "Minhas demandas" e a demanda aberta não se atualizam depois de proposta confirmada**

`aoResolverProposta` só relê o documento do plano (ALTERAR_TRECHO_PLANO) e o pad (ANOTAR_PAD). A lista "Minhas demandas" carrega só no `ngOnInit` e a demanda aberta só quando o id muda; a página nem guarda referência a esses componentes. Depois de confirmar pelo chat iniciar ou pausar execução, ou criar atividade, a marca de execução, o checklist e as horas ao lado continuam antigos.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/chat/pages/chat/chat.page.ts:213-222 — `aoResolverProposta` trata só ALTERAR_TRECHO_PLANO e ANOTAR_PAD
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:103-108 — `viewChild` só de rolagem, fluxo, editor, seletor, documento e área; nenhum de MinhasDemandasComponent ou DemandaLeituraComponent
- frontend/src/app/modules/chat/components/minhas-demandas/minhas-demandas.component.ts:57-59 e :127 — `carregar()` só no `ngOnInit` e no desfazer de "Sair da demanda"
- frontend/src/app/modules/chat/components/demanda-leitura/demanda-leitura.component.ts:100-103 — `carregar(id)` só no efeito de `demandaId`

Como observar: /chat em Perguntas com a lista à direita: pedir "inicia a atividade X" e confirmar o cartão. Rede: POST /proposta-ia/:id/confirmar + GET /execucao/ativa e nenhum GET /demanda/executadas; a linha da demanda não ganha a marca de execução até sair da tela e voltar.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

**A-166 · Baixa · GET /demanda/executadas?limite=20 repetido a cada volta à lista**

A lista fica num `@if (listaVisivel())`, verdadeiro só em Perguntas e sem demanda aberta: abrir uma demanda ou ir a Planejamento destrói o componente, e voltar o recria com nova leitura. Ao abrir /chat com execução rodando, a lista carrega, emite `emExecucaoEncontrada`, a página abre a demanda e a lista recém-carregada é descartada.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/chat/pages/chat/chat.page.ts:131 — `listaVisivel = computed(() => this.modo() === ModoDoChatEnum.PERGUNTAS && this.demandaAbertaId() === null)`
- frontend/src/app/modules/chat/pages/chat/chat.page.html:503-510 — `@if (listaVisivel()) { ... <app-chat-minhas-demandas ...> }`
- frontend/src/app/modules/chat/components/minhas-demandas/minhas-demandas.component.ts:57-64 — `ngOnInit → carregar() → demandaService.listarExecutadas(QUANTIDADE_DE_DEMANDAS)` (20, linha 18)
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:562-566 — `abrirDemandaEmExecucao` define `demandaAbertaId`, o que esconde a lista

Como observar: /chat: clicar numa demanda e em Voltar, três vezes: 3× GET /demanda/executadas?limite=20, além das leituras da demanda a cada abertura. Alternar Perguntas ⇄ Planejamento repete.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. Os itens ficam guardados fora do `@if` que destrói o componente.
2. `aoResolverProposta` e o fim de fluxo com proposta concluída releem a lista e, se houver, a demanda aberta.
3. Testes de componente.

## Critérios de Aceite

- Ao vivo: abrir uma demanda e voltar à lista não gera `GET /demanda/executadas`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

