# 458-projetos-menu-e-rota-com-a-mesma-regra.spec.md

> Task 130/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-173, A-174 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/projeto. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Decidir se o desenvolvedor tem a tela de Projetos. Hoje o menu esconde o item, a rota abre para qualquer um e a regra escrita diz que ele vê os projetos em que tem demanda.

## Contexto

**A-173 · Baixa · Projetos: o menu esconde do desenvolvedor o que a rota, o backend e a SPEC permitem; ?projetoId da URL não é conferido**

O item 'Projetos' só aparece para gestor, administrador e auxiliar, mas /projeto e /projeto/:id não têm guard, GET /projeto não é @GestorOnly e a SPEC diz que o desenvolvedor vê os projetos em que tem demanda atribuída. Menu e rota contam regras diferentes para a mesma tela. Em /demanda, o projetoId vindo da URL é usado sem conferir se está na lista do usuário, ao contrário do projeto lembrado.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/shared/layout/navegacao.ts:40 — Projetos: somenteGestor: true, visivelAoAuxiliar: true
- frontend/src/app/modules/projeto/projeto.routes.ts:5-11 e 20-25 — rotas '' e ':id' sem canActivate (só ':id/relatorio' tem gestorGuard, linha 14)
- backend/src/modules/projeto/controllers/projeto.controller.ts:57 e 108 — @Get() e @Get(':id') sem @GestorOnly
- docs/SYSTEM.SPEC.md:1410 — 'Ver todos os projetos | Gestor sim | Desenvolvedor: apenas projetos com ao menos uma demanda atribuída'
- frontend/src/app/modules/demanda/pages/demanda-projeto/demanda-projeto.page.ts:408-411 — daUrl > 0 retorna direto; só o 'lembrado' passa por existe()

Como observar: Como desenvolvedor: a barra lateral não tem 'Projetos', mas /projeto abre e lista os projetos dele; /demanda?projetoId=<id sem acesso> dispara GET /demanda/grafo recusado.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13: o desenvolvedor não vê "Projetos" no menu, mas `/projeto` abre; `/projeto/<id sem acesso>` faz `GET /projeto/:id` (404) e `GET /demanda/grafo` (403).

**A-174 · Baixa · Menu esconde Projetos do desenvolvedor, mas a rota /projeto não tem guard**

O item Projetos só aparece para gestor, administrador e auxiliar. A rota /projeto (lista e detalhe) não tem guard: o desenvolvedor que digita a URL abre a tela e recebe os projetos em que participa. O backend filtra, então não há vazamento; a diferença é entre o que o menu diz e o que a rota permite. As outras telas de gestor têm guard coerente com o menu.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/shared/layout/navegacao.ts:40 — Projetos: somenteGestor: true, visivelAoAuxiliar: true
- frontend/src/app/modules/projeto/projeto.routes.ts:5-11 e 20-26 — path '' e ':id' sem canActivate; só ':id/relatorio' tem gestorGuard
- .artifacts/revisao-requisicoes-e-permissoes/trafego/DESENVOLVEDOR.txt — 'abrir /projeto' como desenvolvedor: GET /projeto?pagina=1&itensPorPagina=100 [200]

Como observar: Logar como desenvolvedor e digitar /projeto: a tela abre com os projetos dele, embora o menu não tenha o item.

Verificação na auditoria: medido na aplicação rodando em 2026-11-13: o desenvolvedor não vê "Projetos" no menu, mas `/projeto` abre; `/projeto/<id sem acesso>` faz `GET /projeto/:id` (404) e `GET /demanda/grafo` (403).

## Decisão do autor pendente

**Antes:** `/projeto` e `/projeto/:id` sem guard; item de menu só para gestor, administrador e auxiliar.

**Opções:**

1. O desenvolvedor tem a tela: o item entra no menu dele.
2. Não tem: guard de visão total na listagem e no detalhe.

## Entregáveis

1. A opção escolhida no menu e nas rotas.
2. Em qualquer caso, o `projetoId` da URL é conferido contra a lista carregada antes de pedir o grafo.
3. Teste dos guards e de componente.

## Critérios de Aceite

- Como desenvolvedor, digitar `/projeto/<id sem acesso>` não gera 403 nem 404 na aba de rede.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

