# 445-plano-mutacoes-sem-recarregar-as-listas.spec.md

> Task 117/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-157, A-158 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-10.
> Severidade: Média. Área: frontend/chat (plano).

## Objetivo

Gravar o texto, renomear, marcar solo, arquivar, atribuir projeto, anotar ponto, mexer em fonte e publicar deixam de reler `GET /chat/conversas` (que não depende de plano) e as listas cujo item a resposta já traz.

## Contexto

**A-157 · Média · Plano: toda alteração relê GET /chat/conversas e GET /plano (R-10 segue igual)**

`PlanoDocumentoComponent` emite `mudou` para texto, título, solo, arquivo, projeto e demanda, e a página responde a todos com `seletor.recarregar()`, sem olhar o tipo da mudança. `GET /chat/conversas` não depende de plano em nenhum desses casos, e a linha do plano na lista (`PlanoResumoDto`: título, solo, arquivado) pode ser corrigida em memória com o que a tela já tem. Criar e excluir plano passam pelo mesmo `recarregar()`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.ts:231 — `this.mudou.emit('texto')` depois de gravar o documento
- frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.ts:330 — `executar()` emite `mudou` para titulo, solo, arquivo, projeto e demanda
- frontend/src/app/modules/chat/pages/chat/chat.page.html:547 — `(mudou)="aoMudarPlano()"` descarta o tipo da mudança
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:617-619 — `aoMudarPlano()` só chama `this.seletor()?.recarregar()`
- frontend/src/app/modules/chat/pages/chat/chat.page.ts:624 e :641 — excluir e criar plano também chamam `recarregar()`
- frontend/src/app/modules/chat/components/seletor/seletor.component.ts:104 — `recarregar()` sempre inclui `listarConversas()`

Como observar: /chat → Planejamento → abrir um plano, digitar no documento e clicar em Gravar: PUT /plano/:id seguido de GET /chat/conversas e GET /plano. O mesmo ao renomear, marcar solo, arquivar, atribuir projeto e ligar demanda.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

**A-158 · Média · Plano: pontos, fontes e publicação relêem tudo depois de cada mutação**

Anotar ponto e mudar a situação relêem `GET /plano/:id/ponto`; adicionar e remover fonte relêem `GET /plano/:id/fonte`; publicar relê `GET /plano/:id` pela data da publicação, que `PlanoPublicadoDto.publicacaoData` já devolve. Remover fonte e mudar situação de ponto cabem em memória com a resposta atual; os dois POST não devolvem os campos do resumo. Abrir o diálogo de publicar também repete `GET /plano/:id/ponto` só para contar os abertos, lista que o painel ao lado já tem.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/chat/components/plano-pontos/plano-pontos.component.ts:107-111 e :147-151 — `criarPonto` e `alterarSituacaoDoPonto` terminam em `this.recarregar()`
- frontend/src/app/modules/chat/components/plano-fontes/plano-fontes.component.ts:133-138 e :149-153 — `excluirFonte` e `criarFonte` terminam em `this.recarregar()`
- shared/src/dtos/plano/PlanoPontoSituacaoAlteradaDto.ts:3-7 — devolve `id`, `situacao` e `resolucaoTexto`
- frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.ts:290-293 — `aoPublicar()` → `this.carregar(this.planoId())`
- shared/src/dtos/plano/PlanoPublicadoDto.ts:7 — `publicacaoData: string`
- frontend/src/app/modules/chat/components/plano-publicar-dialog/plano-publicar-dialog.component.ts:129-131 — `listarPontos(this.plano().id)` só para contar os de situação ABERTO
- frontend/src/app/modules/chat/components/plano-documento/plano-documento.component.html:55 — `<app-plano-pontos [planoId]="atual.id" ...>` sempre montado com a mesma lista

Como observar: Num plano: anotar um ponto (POST /plano/:id/ponto + GET /plano/:id/ponto), resolvê-lo (PATCH /plano/:id/ponto/:pontoId/situacao + GET), remover uma fonte (DELETE /plano/:id/fonte/:fonteId + GET /plano/:id/fonte), abrir Publicar (GET /demanda/:id + GET /plano/:id/ponto) e publicar (POST /plano/:id/publicacao + GET /plano/:id).

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. O seletor separa a releitura de planos da de conversas e recebe a mudança para corrigir a linha em memória (título, solo, arquivo); `GET /plano` só quando a lista muda de verdade (criar, excluir, atribuir projeto).
2. Pontos, fontes e publicação aplicam em memória o que a resposta traz (situação do ponto, remoção da fonte, `publicacaoData`).
3. Testes de componente contando as requisições por mutação.

## Critérios de Aceite

- Ao vivo: renomear um plano gera só o `PUT`; nenhuma mutação de plano gera `GET /chat/conversas`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

