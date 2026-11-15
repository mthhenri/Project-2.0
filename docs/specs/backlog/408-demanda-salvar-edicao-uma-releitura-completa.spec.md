# 408-demanda-salvar-edicao-uma-releitura-completa.spec.md

> Task 80/98 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-098, A-099 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-02.
> Severidade: Média. Área: frontend/demanda.

## Objetivo

Depois de salvar pelo botão Editar, a demanda aberta é relida uma vez pelo detalhe agregado, e o cabeçalho mostra as tags e os membros recém-gravados. Hoje são dois `GET /demanda/:id` e os chips ficam antigos.

## Contexto

**A-098 · Média · Salvar a edição pelo botão Editar faz GET /demanda/:id duas vezes**

aoDemandaAlterada() da demanda aberta relê a demanda e emite demandaAlterada; o evento chega à página, que recarrega o grafo e manda a mesma demanda aberta se reler outra vez. Resultado: PUT /demanda/:id, depois GET /demanda/:id, GET /demanda/grafo e GET /demanda/:id de novo.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/components/demanda-aberta/demanda-aberta.component.html:291-296 — diálogo de edição com (demandaAlterada)="aoDemandaAlterada()"
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:157-161 — carregarDemanda(idAtual) e this.demandaAlterada.emit()
- frontend/src/app/modules/demanda/components/demanda-arvore-tela/demanda-arvore-tela.component.html:63 — (demandaAlterada)="alterado.emit()"
- frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.html:188 e demanda-projeto.page.ts:302-304 — recarregarGrafo() + this.arvoreTela()?.recarregar()
- frontend/src/app/modules/demanda/components/demanda-arvore-tela/demanda-arvore-tela.component.ts:198-200 e frontend/src/app/modules/demanda/components/demanda-aberta/demanda-aberta.component.ts:87-90 — recarregar() -> atualizar() -> segunda carregarDemanda

Como observar: Abrir uma demanda, clicar em Editar, mudar o nome e Salvar. Rede: PUT /demanda/:id; GET /demanda/:id; GET /demanda/grafo; GET /demanda/:id.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-099 · Média · Depois de salvar a edição, tags e membros do cabeçalho da demanda aberta não são relidos**

O diálogo de edição grava tags (PUT) e membros (POST/DELETE), mas a demanda aberta só relê GET /demanda/:id, que não traz tags nem membros; tagsDaDemanda e membros só são preenchidos na carga completa. As duas releituras feitas não trazem o que mudou, e os chips e avatares do cabeçalho ficam antigos até trocar de demanda (a linha da lista atualiza, porque vem do grafo).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component.ts:290-308 — alterarTags, atribuirMembro e removerMembro no salvar
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:420-425 — carregarDemanda só faz this.demanda.set(...)
- frontend/src/app/modules/demanda/components/demanda-detalhe-base/demanda-detalhe.base.ts:403-404 e 213-214 — tagsDaDemanda e membros só são atribuídos em carregarTudo e em voltar()
- frontend/src/app/modules/demanda/components/demanda-aberta/demanda-aberta.component.html:140-153 — cabeçalho lê [(membros)]="membros" e [(tags)]="tagsDaDemanda"
- frontend/src/app/modules/demanda/components/demanda-arvore-painel/demanda-arvore-painel.component.ts:294-296 — a edição aberta pelo menu de contexto só emite alterado (mesmo efeito)

Como observar: Abrir uma demanda, Editar, trocar uma tag e um membro, Salvar. Rede: PUT /demanda/:id/tag e POST /demanda/:id/membro, depois só GET /demanda/:id (2x) e GET /demanda/grafo, nenhum GET de tags ou membros; conferir o cabeçalho da demanda aberta. Lido no código, não conferido na tela.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `aoDemandaAlterada()` chama `recuperarDetalhe` uma vez e aplica demanda, tags, membros e conexões.
2. A página não manda a demanda aberta se reler quando foi ela mesma que avisou da alteração.
3. Teste de componente: uma leitura depois do `PUT`; tags e membros do cabeçalho mudam.

## Critérios de Aceite

- Ao vivo: editar tags e membros no diálogo e salvar mostra os novos chips sem trocar de demanda; a aba de rede tem um `GET /demanda/:id/detalhe` e nenhum `GET /demanda/:id` repetido.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

