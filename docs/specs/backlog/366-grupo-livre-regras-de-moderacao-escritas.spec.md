# 366-grupo-livre-regras-de-moderacao-escritas.spec.md

> Task 38/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-050 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Informativo. Área: backend/mensagem-direta. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

O comportamento atual do grupo livre vira regra escrita no `SYSTEM.SPEC.md`, ou é ajustado: hoje o criador não tem poder próprio, qualquer membro renomeia e adiciona qualquer pessoa ativa (inclusive quem saiu por vontade própria), ninguém remove e quem entra lê todo o histórico.

## Contexto

**A-050 · Informativo · Grupo livre sem dono: qualquer membro adiciona qualquer pessoa ativa, ninguém remove e quem entra lê todo o histórico**

O criador não tem poder próprio (`criadorUsuarioId` só é devolvido), gestor não modera grupo livre e não existe rota de remoção. Qualquer membro renomeia, muda a aparência e adiciona qualquer pessoa ativa, inclusive quem saiu por vontade própria, que volta sem aceite e lê tudo. O grupo só é encerrado quando o último membro sai; as regras estão nos comentários do código e não foram conferidas no documento.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/services/grupo.service.ts:240-241 — `alterarGrupo`: basta ser membro de grupo livre
- backend/src/modules/mensagem-direta/services/grupo.service.ts:264-270 — `adicionarMembros`: basta ser membro; só exige pessoas ativas
- backend/src/modules/mensagem-direta/repositories/grupo.repository.ts:430-438 — readicionar reabre a linha de quem tinha saído
- backend/src/modules/mensagem-direta/services/grupo.service.ts:301-304 — a saída é sempre a do token
- backend/src/modules/mensagem-direta/repositories/grupo.repository.ts:454 — `sairDoGrupo`: sem membros restantes, soft delete do grupo
- backend/src/modules/mensagem-direta/controllers/mensagem-direta-grupo.controller.ts:93 — "Qualquer membro adiciona pessoas; ninguém remove ninguém."
- backend/src/modules/mensagem-direta/services/grupo.service.ts:622 — `criadorUsuarioId` só no retorno

Como observar: DESENVOLVEDOR A chama `DELETE /mensagem-direta/grupo/:grupoId/membro`; DESENVOLVEDOR B chama `POST /mensagem-direta/grupo/:grupoId/membros` com `{ usuarioIds: [A] }` → 200; A volta a ser membro e `GET .../mensagens` devolve todo o histórico.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** não há rota de remoção de membro; a readição não pede aceite; o histórico inteiro é visível a quem entra.

**Opções:**

1. É a regra: registrar no documento como está.
2. Mudar: decidir quem remove membro (criador, gestor) e se a readição pede aceite; quem entra lê só dali em diante.

## Entregáveis

1. A regra no `SYSTEM.SPEC.md` §12 (opção 1) ou a regra nova implementada com testes (opção 2).

## Critérios de Aceite

- O documento descreve o comportamento que os testes de integração do grupo fixam.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

