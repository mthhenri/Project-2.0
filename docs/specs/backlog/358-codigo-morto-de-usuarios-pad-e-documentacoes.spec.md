# 358-codigo-morto-de-usuarios-pad-e-documentacoes.spec.md

> Task 30/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-038 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/usuario.

## Objetivo

Tirar o que não é mais usado nessas telas: os tipos de `usuario.model.ts`, `textosPreenchidos`, a opção `secoesAbertas` do pad, a entrada `editavel` do diálogo do pad e o parâmetro `forcar` de `TipoUsuarioAjudaService.carregar`.

## Contexto

**A-038 · Baixa · Código sem uso na unidade: tipos de `usuario.model.ts`, `textosPreenchidos`, opção `secoesAbertas` do pad, entrada `editavel` do diálogo do pad e parâmetro `forcar` de `TipoUsuarioAjudaService.carregar`**

Nenhum é método com HTTP: todos os métodos HTTP de `UsuarioService`, `AnotacaoService`, `TipoUsuarioAjudaService` e `AssistenteTrechoService` têm chamador. Os itens abaixo não têm uso fora de testes.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/models/usuario.model.ts:3-4 — `UsuarioModelo` e `UsuarioListagemModelo` sem importador em `frontend/src`
- frontend/src/app/modules/documentacao/utils/documentacao-arvore.util.ts:97-99 — `textosPreenchidos` sem chamador
- frontend/src/app/modules/usuario/services/pad.service.ts:91 e 95 — `opcoes.secoesAbertas`: nenhum chamador passa
- frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.ts:30 — `editavel`: `topbar.component.html:221` e `usuario-listagem.page.html:307` não passam
- frontend/src/app/modules/usuario/services/tipo-usuario-ajuda.service.ts:29-30 — `forcar`: o único chamador é `usuario-listagem.page.ts:121`, sem argumento

Como observar: `grep -rn` dos nomes em `frontend/src` (ts e html), fora de `*.spec.ts` e `*.test.ts`.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Cada item removido depois de `npm run impacto` confirmar que não há consumidor (o que tiver consumidor fica e entra no relatório).

## Critérios de Aceite

- Build e testes do frontend sem erro; nenhum teste removido além dos que só cobriam o código morto.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

