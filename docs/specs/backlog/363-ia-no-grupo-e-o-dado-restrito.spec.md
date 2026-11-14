# 363-ia-no-grupo-e-o-dado-restrito.spec.md

> Task 35/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-044 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: Só membro chama e só o dono resolve as propostas (conferido); o risco é o texto da resposta..
> Severidade: Média. Área: backend/mensagem-direta. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Decidir e implementar o que protege um dado restrito quando a IA é chamada num grupo: hoje as ferramentas rodam com a permissão de quem chamou, a resposta vai para todos e a única barreira é uma frase no prompt.

## Contexto

**A-044 · Média · @IA no grupo consulta com a permissão de quem chamou e publica a resposta a todos; a única barreira é o prompt**

As ferramentas do turno rodam com o `usuarioAtivo` de quem chamou e a resposta é gravada na conversa e enviada a todos os membros, ficando no histórico para quem entrar depois. O que impede um dado restrito de chegar a um desenvolvedor é só a instrução "Não exponha no texto o que algum deles não acessa". Não há filtro no servidor.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- /home/user/Project-2.0/backend/src/modules/mensagem-direta/services/mensagem-direta-ia.service.ts:199-206 — `conduzirTurno({ usuarioAtivo, ..., ferramentas: listarParaUsuario(usuarioAtivo) })`
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/services/mensagem-direta-ia.service.ts:222-234 — resposta gravada como autor IA e publicada a `participantes`
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/domain/mensagem-direta-ia.ts:93 — contenção apenas por texto de orientação
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/domain/mensagem-direta-ia.ts:90 — "quem entrar depois a verá no histórico"
- /home/user/Project-2.0/backend/src/modules/mensagem-direta/services/grupo.service.ts:359-363 — a chamada leva o `usuarioAtivo` de quem enviou

Como observar: Grupo livre com GESTOR e DESENVOLVEDOR sem acesso ao projeto X: o gestor envia `POST /mensagem-direta/grupo/:grupoId/mensagem` com `{ mensagemId, texto: "@IA resuma as demandas do projeto X" }`; o desenvolvedor lê a resposta em `GET /mensagem-direta/grupo/:grupoId/mensagens`. Esperado: dado do projeto X não chega a ele; o código depende de o modelo obedecer à orientação.

Verificação na auditoria: código, por um auditor; não exercitado (a IA não tem provedor no ambiente da auditoria).

## Decisão do autor pendente

**Antes:** gestor chama `@IA` num grupo com desenvolvedores; a IA consulta com a visão do gestor e publica; fica no histórico para quem entrar depois.

**Opções:**

1. Registrar como risco aceito no `SYSTEM.SPEC.md` (a instrução do prompt é a regra).
2. Ferramentas de leitura do turno rodam com o menor perfil entre os leitores do grupo.
3. Resposta que usou dado restrito vai só para quem chamou.

## Entregáveis

1. A opção escolhida, com teste do turno no grupo com leitores de perfis diferentes (ou o registro no documento, na opção 1).

## Critérios de Aceite

- Na opção 2 ou 3: teste em que o gestor pede no grupo um dado de projeto que um membro não vê e o texto gravado para o grupo não o contém.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.
