# 385-demanda-ultimo-membro-regra.spec.md

> Task 57/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-069 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; `PROBLEMS.md` P-023.
> Severidade: Baixa. Área: backend/demanda. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Resolver a contradição: a remoção do último membro é recusada para todos os tipos, mas a demanda criada por gestor, administrador ou auxiliar nasce sem nenhum membro. Liga-se ao P-023 de `PROBLEMS.md`.

## Contexto

**A-069 · Baixa · "Último membro" trava a remoção até para o gestor, mas a demanda nasce sem membro quando criada por condutor**

removerMembro recusa quando há um membro só, para todos os tipos. Como gestor, administrador e auxiliar criam demanda sem nenhuma linha em demanda_usuario, o invariante "ao menos um membro" não existe de fato: a demanda pode ter zero membros, mas não pode voltar a zero. A trava não consta do resumo de regras usado nesta auditoria.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/services/demanda.service.ts:954-957 — `if (totalMembros <= 1) throw new BusinessException('Não é possível remover o último membro da demanda')`, sem exceção por tipo
- backend/src/modules/demanda/services/demanda.service.ts:149-154 — o criador com visão total não entra em usuarioIds
- backend/src/modules/demanda/repositories/demanda.repository.ts:195 — comentário: "usuarioIds pode ser [] (criação por gestor sem membros)"
- backend/src/modules/demanda/services/demanda.service.regras.test.ts:568 — "o último membro não sai (nem para o gestor)"

Como observar: Como GESTOR: criar demanda sem usuarioIds (0 membros), POST /api/demanda/{id}/membro com um desenvolvedor e depois DELETE /api/demanda/{id}/membro/{usuarioId}: responde 400 "Não é possível remover o último membro da demanda".

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** a demanda pode ter zero membros, mas não pode voltar a zero.

**Opções:**

1. A trava vale só para o desenvolvedor que sai sozinho; quem conduz o trabalho pode esvaziar.
2. Toda demanda não estrutural precisa de membro: a criação por condutor também exige.

## Entregáveis

1. A regra escolhida em `removerMembro` (e em `criar`, na opção 2), no `SYSTEM.SPEC.md` §14, com teste.

## Critérios de Aceite

- Teste da service para remover o último membro como gestor e como desenvolvedor.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima (a mesma do P-023).

