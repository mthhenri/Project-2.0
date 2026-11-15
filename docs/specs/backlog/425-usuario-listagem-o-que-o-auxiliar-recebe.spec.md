# 425-usuario-listagem-o-que-o-auxiliar-recebe.spec.md

> Task 97/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-123 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/usuario. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

A listagem que alimenta os seletores do auxiliar deixa de entregar o `login` de todos os usuários (o identificador usado para entrar no sistema).

## Contexto

**A-123 · Média · GET /usuario entrega ao auxiliar login e temAnotacoes de todos os usuários**

A listagem é liberada por temVisibilidadeTotal e a service não recebe o usuário ativo: auxiliar e gestor recebem a mesma carga, com login, ativo e temAnotacoes de todos (inclusive gestores, administradores e inativos). O auxiliar não pode ver perfil nem pad de outro, mas fica sabendo o login e quem tem anotações; o gestor também vê temAnotacoes de outro gestor/administrador, cujo pad é fechado para ele.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/usuario/controllers/usuario.controller.ts:103-107 — @ExigePermissao(temVisibilidadeTotal) em GET /usuario; listar(dto) sem usuarioAtivo
- backend/src/modules/usuario/services/usuario.service.ts:67-68 — listar(filtros) devolve o que o repository traz, sem recorte por tipo de quem pede
- backend/src/modules/usuario/repositories/usuario.repository.ts:158-177 — SELECT usuario.login ... EXISTS(anotacao ...) AS "temAnotacoes", sem filtrar tipo do dono
- shared/src/dtos/usuario/UsuarioResumoDto.ts:9 e :27 — login e temAnotacoes no resumo
- backend/src/modules/usuario/ferramentas/listar-usuarios.ferramenta.ts:21 e :34 — permissao 'AUXILIAR' e devolve login (o comentário da linha 11 diz 'só para o gestor')

Como observar: Como AUXILIAR: GET /usuario?allRows=true → 200 com login e temAnotacoes de cada usuário. Para comparar: GET /usuario/<id de outro> → 403 e GET /anotacao?usuarioId=<outro> → 403. Esperado pela regra (auxiliar não gerencia usuários nem vê perfil de outro): só o necessário para os seletores (id, nome, tipo, cor).

Verificação na auditoria: medido na aplicação rodando em 2026-11-13: como auxiliar, `GET /usuario?allRows=true` devolve `login`, `tipo`, `ativo` e `temAnotacoes` de todos os usuários, inclusive gestores e administradores.

## Decisão do autor pendente

**Antes:** a rota é liberada por `temVisibilidadeTotal` e a service não recebe o usuário: auxiliar e gestor recebem a mesma carga.

**Opções:**

1. O `login` vem só para quem tem permissão de gestor (o campo fica nulo ou ausente para o auxiliar: muda o DTO de saída).
2. Listagem enxuta própria para seletores (id, nome, tipo, ativo, cor).
3. Manter e registrar que o auxiliar vê os logins.

## Entregáveis

1. A opção escolhida na `UsuarioService`, com teste por tipo; a ferramenta de IA que lista usuários segue a mesma regra.

## Critérios de Aceite

- Como auxiliar, a resposta de `GET /usuario` traz o que a regra escolhida manda.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

O campo `temAnotacoes` (spec `353-usuario-tem-anotacoes-barato-e-so-para-quem-pode`).

## Dependências

Decisão do autor acima.

