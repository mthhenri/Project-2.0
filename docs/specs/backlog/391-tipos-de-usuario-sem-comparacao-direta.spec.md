# 391-tipos-de-usuario-sem-comparacao-direta.spec.md

> Task 63/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-078, A-079 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend (mensagem-direta e chat).

## Objetivo

Toda decisão ou rótulo por tipo de usuário passa pelas funções de `shared/src/utils/permissao-usuario.ts` (lista positiva), como manda a regra do projeto. Hoje há uma lista `[GESTOR, ADMINISTRADOR]` montada num repository e comparações `tipo === TipoUsuarioEnum.X` em rótulos e no prompt do plano.

## Contexto

**A-078 · Baixa · Lista de "poder de gestor" repetida em consulta e tipo comparado direto em rótulos**

`listarIdsComPermissaoDeGestor` monta `[GESTOR, ADMINISTRADOR]` no repositório, fora de `temPermissaoDeGestor`, e as duas fontes decidem juntas quem é membro de canal. Os rótulos "administrador"/"gestor" das mensagens do sistema comparam o tipo direto e chamam de "gestor" qualquer tipo que não seja administrador. Hoje as listas coincidem; um tipo novo as faria divergir.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/usuario/repositories/usuario.repository.ts:648 — `{ tipos: [TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR] }`
- shared/src/utils/permissao-usuario.ts:9-11 — `temPermissaoDeGestor` com a mesma lista
- backend/src/modules/mensagem-direta/services/canal-acesso.service.ts:81-93 e :121 — a consulta exclui membros derivados; a função decide o acesso por tipo
- backend/src/modules/mensagem-direta/domain/grupo-regras.ts:55 — `tipo === TipoUsuarioEnum.ADMINISTRADOR ? 'administrador' : 'gestor'`
- backend/src/modules/mensagem-direta/domain/mensagem-direta-regras.ts:97 — mesma comparação direta

Como observar: Leitura de código; sem efeito observável pela API com os quatro tipos atuais.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-079 · Baixa · Comparação direta de tipo em chat-plano.service.ts**

`montarInstrucoes` compara `usuarioAtivo.tipo === TipoUsuarioEnum.AUXILIAR` para escolher o rótulo da pessoa no prompt do plano. Não decide permissão, mas é o padrão que as regras proíbem (lista positiva em `permissao-usuario.ts`).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/chat/services/chat-plano.service.ts:154 — `temPermissaoDeGestor(usuarioAtivo.tipo) ? 'gestor ou administrador' : usuarioAtivo.tipo === TipoUsuarioEnum.AUXILIAR ? 'auxiliar' : 'desenvolvedor'`

Como observar: Leitura de código; não muda nenhuma resposta da API.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. O `shared` exporta a lista de tipos com poder de gestor (a mesma que `temPermissaoDeGestor` usa) e `listarIdsComPermissaoDeGestor` passa a usá-la.
2. Os rótulos "administrador"/"gestor" das mensagens do sistema e o rótulo do prompt do plano (`chat-plano.service.ts`) saem de um mapa por tipo no `shared`.
3. Uma regra de lint (ou teste) que reprove `=== TipoUsuarioEnum.` e `!== TipoUsuarioEnum.` fora de `shared/src/utils/`, com as exceções justificadas listadas.

## Critérios de Aceite

- `grep -rn "=== TipoUsuarioEnum\.\|!== TipoUsuarioEnum\." backend/src frontend/src` só devolve as exceções listadas na regra; `npm run lint:tudo` sem erro.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Mudar qualquer regra de permissão: o comportamento de hoje é mantido.

## Dependências

Nenhuma.

