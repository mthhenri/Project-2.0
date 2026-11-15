# 426-pad-o-que-o-gestor-pode-escrever.spec.md

> Task 98/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-133 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/anotacao. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Separar leitura de escrita no acesso ao pad de outra pessoa. Hoje a mesma `validarAcesso` serve as duas: gestor e administrador leem e sobrescrevem qualquer seção do pad de desenvolvedor e de auxiliar, inclusive a PESSOAL.

## Contexto

**A-133 · Média · Pad: gestor e administrador também escrevem no pad de desenvolvedor/auxiliar, inclusive na seção PESSOAL**

A mesma validarAcesso serve leitura e as cinco escritas: gestor/administrador leem e sobrescrevem qualquer seção do pad de desenvolvedor e de auxiliar (não o de outro gestor/administrador). A regra de escrita não está no resumo, o comentário do controller contradiz a service e o executor da IA trata PESSOAL como 'do usuário'.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/anotacao/services/anotacao.service.ts:165-175 — validarAcesso: dono passa; gestor passa se o dono não tem permissão de gestor; sem distinguir leitura de escrita nem seção
- backend/src/modules/anotacao/services/anotacao.service.ts:58, :76, :95, :112, :130 — alterar, trocarTrecho, anexarTexto, anexarFeito e moverTrecho chamam a mesma validarAcesso
- backend/src/modules/anotacao/controllers/anotacao.controller.ts:15 — comentário 'gestor e administrador, o de qualquer um' × service:162-163 'nunca o de outro gestor ou administrador'
- backend/src/modules/anotacao/executores/anotar-pad.executor.ts:11-12 e :41 — 'A seção Pessoal é do usuário'; a IA só escreve no pad do token
- backend/src/modules/anotacao/services/anotacao.service.test.ts:57 — teste fixa 'gestor e administrador, o de qualquer desenvolvedor' (lê e altera)

Como observar: Como GESTOR: GET /anotacao?usuarioId=<id de dev>&tipos=PESSOAL → 200 com o texto; PUT /anotacao/<id de dev>/PESSOAL {texto:'x', updatedDateLido:<data lida>} → 200 e a seção do desenvolvedor é substituída. Se a regra for 'gestor só lê' (ou 'não a PESSOAL'), o esperado seria 403.

Verificação na auditoria: medido na aplicação rodando em 2026-11-14: como gestor, `PUT /anotacao/<id de um desenvolvedor>/EM_ANDAMENTO` passou da permissão (respondeu 409 de versão, não 403).

## Decisão do autor pendente

**Antes:** a regra de escrita não está escrita e o comentário do controller contradiz o código.

**Opções:**

1. O gestor só lê.
2. O gestor lê e escreve, menos na seção PESSOAL.
3. Como está: registrar.

## Entregáveis

1. A regra em `AnotacaoService` (validação de leitura separada da de escrita), no `SYSTEM.SPEC.md` §12 e no comentário do controller, com testes por tipo e por seção.

## Critérios de Aceite

- `PUT` e `GET` do pad de outro respondem conforme a opção para gestor, auxiliar e desenvolvedor.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

