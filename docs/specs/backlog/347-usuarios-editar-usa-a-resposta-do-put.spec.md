# 347-usuarios-editar-usa-a-resposta-do-put.spec.md

> Task 19/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-025, A-026 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/usuario.

## Objetivo

Depois de salvar a edição, a linha é trocada pelo que o `PUT /usuario/:id` devolveu e, quando o usuário editou o próprio cadastro, a sessão é atualizada.

## Contexto

**A-025 · Baixa · Usuários: editar faz `GET /usuario/:id`, `PUT /usuario/:id` e recarrega a lista; a resposta do PUT já traz a linha**

Abrir a edição busca o usuário porque o resumo da listagem não tem `horasDiariasNecessarias`. Ao salvar, o diálogo emite `aoAlterar` e a página refaz `GET /usuario`, embora `UsuarioAlteradoDto` traga todos os campos da linha menos `temAnotacoes`. O switch de status, na mesma tela, já atualiza a linha sem recarga.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/components/usuario-formulario-dialog/usuario-formulario-dialog.component.ts:111-121 — `GET /usuario/:id` ao abrir ("o resumo da listagem não traz as horas diárias")
- frontend/src/app/modules/usuario/components/usuario-formulario-dialog/usuario-formulario-dialog.component.ts:204-212 — `PUT` e `aoAlterar.emit()` sem dados
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.html:311 — `(aoAlterar)="buscarUsuarios()"`
- shared/src/dtos/usuario/UsuarioAlteradoDto.ts — id, login, nomeCompleto, cargoTitulo, tipo, ativo, corAvatar
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:316-318 — `definirAtivoLocal` já troca a linha em memória

Como observar: Editar um usuário: `GET /usuario/7` ao abrir; ao salvar, `PUT /usuario/7` seguido de `GET /usuario?pagina=…`.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-026 · Baixa · Usuários: editar o próprio cadastro não atualiza o nome na barra superior, embora a resposta do PUT traga o usuário**

Ao salvar a edição da própria linha, o diálogo só repassa a cor à sessão. Nome e login novos ficam fora de `UsuarioSessaoService` até a próxima abertura do app, quando `atualizarSessao()` relê o usuário.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/components/usuario-formulario-dialog/usuario-formulario-dialog.component.ts:208-209 — só `sessao.definirCorAvatar(...)` quando é o próprio usuário
- frontend/src/app/core/services/usuario-sessao.service.ts:75-78 — `definirUsuario` existe e aceita o mesmo formato
- frontend/src/app/shared/layout/topbar/topbar.component.ts:99 — a barra lê `sessao.nomeCompleto()`
- frontend/src/app/shared/layout/layout.component.ts:24 — a sessão só é relida na abertura da casca

Como observar: Como gestor, editar o próprio nome em Usuários e salvar: a lista mostra o nome novo; a barra superior e o menu do perfil seguem com o antigo até recarregar a página.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `aoAlterar` do diálogo emite o `UsuarioAlteradoDto` e a página troca a linha (mantendo `temAnotacoes`), sem `GET /usuario`.
2. Quando o editado é o usuário logado, `UsuarioSessaoService.definirUsuario(resposta)` atualiza o nome da barra superior.
3. Testes de componente dos dois comportamentos.

## Critérios de Aceite

- Ao vivo: salvar a edição faz `GET /usuario/:id` (releitura antes de editar) e `PUT`, sem a recarga da lista; editar o próprio nome muda a topbar na hora.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Tirar o `GET /usuario/:id` da abertura do diálogo: exigiria `horasDiariasNecessarias` no resumo (contrato).

## Dependências

Nenhuma.
