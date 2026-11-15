# 455-tipos-de-usuario-sem-comparacao-direta.spec.md

> Task 127/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-160, A-161, A-162, A-163, A-164 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend (mensagem-direta, chat, plano, usuario e ponto).

## Objetivo

Toda decisão ou rótulo por tipo de usuário passa pelas funções de `shared/src/utils/permissao-usuario.ts` (lista positiva), como manda a regra do projeto. Hoje há uma lista `[GESTOR, ADMINISTRADOR]` montada num repository e comparações `tipo === TipoUsuarioEnum.X` em rótulos e no prompt do plano.

## Contexto

**A-160 · Baixa · Lista de "poder de gestor" repetida em consulta e tipo comparado direto em rótulos**

`listarIdsComPermissaoDeGestor` monta `[GESTOR, ADMINISTRADOR]` no repositório, fora de `temPermissaoDeGestor`, e as duas fontes decidem juntas quem é membro de canal. Os rótulos "administrador"/"gestor" das mensagens do sistema comparam o tipo direto e chamam de "gestor" qualquer tipo que não seja administrador. Hoje as listas coincidem; um tipo novo as faria divergir.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/usuario/repositories/usuario.repository.ts:648 — `{ tipos: [TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR] }`
- shared/src/utils/permissao-usuario.ts:9-11 — `temPermissaoDeGestor` com a mesma lista
- backend/src/modules/mensagem-direta/services/canal-acesso.service.ts:81-93 e :121 — a consulta exclui membros derivados; a função decide o acesso por tipo
- backend/src/modules/mensagem-direta/domain/grupo-regras.ts:55 — `tipo === TipoUsuarioEnum.ADMINISTRADOR ? 'administrador' : 'gestor'`
- backend/src/modules/mensagem-direta/domain/mensagem-direta-regras.ts:97 — mesma comparação direta

Como observar: Leitura de código; sem efeito observável pela API com os quatro tipos atuais.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-161 · Baixa · Comparação direta de tipo em chat-plano.service.ts**

`montarInstrucoes` compara `usuarioAtivo.tipo === TipoUsuarioEnum.AUXILIAR` para escolher o rótulo da pessoa no prompt do plano. Não decide permissão, mas é o padrão que as regras proíbem (lista positiva em `permissao-usuario.ts`).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/chat/services/chat-plano.service.ts:154 — `temPermissaoDeGestor(usuarioAtivo.tipo) ? 'gestor ou administrador' : usuarioAtivo.tipo === TipoUsuarioEnum.AUXILIAR ? 'auxiliar' : 'desenvolvedor'`

Como observar: Leitura de código; não muda nenhuma resposta da API.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-162 · Baixa · Regra "tem poder de gestor" escrita duas vezes na supervisão e comparação direta de tipo**

A lista da supervisão exclui gestores por uma lista fixa de tipos no repository, enquanto a leitura usa `temPermissaoDeGestor`; o comentário da service afirma que as duas usam a mesma função pura. Um tipo novo com poder de gestor faria lista e leitura divergirem. O texto do aviso compara o tipo direto com ADMINISTRADOR.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/usuario/repositories/usuario.repository.ts:648 — `{ tipos: [TipoUsuarioEnum.GESTOR, TipoUsuarioEnum.ADMINISTRADOR] }`
- backend/src/modules/mensagem-direta/domain/mensagem-direta-regras.ts:92 — a leitura usa `temPermissaoDeGestor`
- backend/src/modules/mensagem-direta/services/mensagem-direta-supervisao.service.ts:39-40 — "a lista e a rota usam a mesma função pura"
- backend/src/modules/mensagem-direta/domain/mensagem-direta-regras.ts:97 — `tipoDoLeitor === TipoUsuarioEnum.ADMINISTRADOR`

Como observar: Só por leitura de código: hoje as duas listas coincidem (GESTOR e ADMINISTRADOR), então não há diferença observável pela API.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-163 · Baixa · Comparação direta de tipo no prompt do plano e parâmetro `ehGestor` que carrega o auxiliar**

O rótulo de quem fala no prompt é montado com `usuarioAtivo.tipo === TipoUsuarioEnum.AUXILIAR`, comparação direta que o projeto proíbe; um tipo novo cairia como "desenvolvedor". Na listagem, o parâmetro chamado `ehGestor` recebe `temVisibilidadeTotal`, que inclui o auxiliar. Nenhum dos dois muda resposta de API hoje.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/chat/services/chat-plano.service.ts:154 — `usuarioAtivo.tipo === TipoUsuarioEnum.AUXILIAR ? 'auxiliar' : 'desenvolvedor'`
- backend/src/modules/plano/services/plano.service.ts:86 — `ehGestor: temVisibilidadeTotal(usuarioAtivo.tipo)`
- backend/src/modules/plano/repositories/plano.repository.ts:159 — `dados.ehGestor ? 'true' : EXISTS(...)`

Como observar: Só leitura de código: não altera a resposta de nenhuma rota hoje.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-164 · Baixa · Mesma regra por funções diferentes, comparação direta de tipo e textos que dizem 'gestor' onde o auxiliar passa**

O ponto de outra pessoa é liberado por podeVerExecucaoEPontoDeOutro na rota /ponto/todos e por temVisibilidadeTotal na service; UsuarioService compara dto.tipo com ADMINISTRADOR direto em dois pontos e usa a função em um terceiro. Comentários e descrições de ferramentas de IA ainda afirmam 'só gestor' em ações que o auxiliar faz.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/ponto/controllers/ponto.controller.ts:25 — @ExigePermissao(podeVerExecucaoEPontoDeOutro) × backend/src/modules/ponto/services/ponto.service.ts:69 e :104 — temVisibilidadeTotal
- backend/src/modules/usuario/services/usuario.service.ts:38 e :152 — dto.tipo === TipoUsuarioEnum.ADMINISTRADOR × :170 — temPermissaoDeAdministrador(dto.tipo)
- backend/src/modules/ponto/services/ponto.service.ts:83-84 — 'Exclusivo de gestor (restrito via @GestorOnly no controller)', mas a rota usa @ExigePermissao
- backend/src/modules/ponto/ferramentas/consultar-ponto-do-dia.ferramenta.ts:19 — descrição enviada ao modelo: 'O gestor pode informar usuarioId'
- backend/src/modules/usuario/ferramentas/listar-usuarios.ferramenta.ts:11 × :21 — 'só para o gestor' × permissao 'AUXILIAR'

Como observar: Sem diferença de resposta hoje (as duas funções devolvem conduzOTrabalho). Para ver o efeito do texto: como AUXILIAR, pedir à IA o ponto de outra pessoa; a descrição da ferramenta diz que só o gestor informa usuarioId.

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

