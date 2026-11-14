# 402-plano-trocar-a-demanda-ligada-regra.spec.md

> Task 74/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-090 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Informativo. Área: backend/plano. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Decidir a regra da troca: hoje `ligarDemanda` confere a permissão só sobre a demanda nova, e quem acessa o plano e é membro da demanda B desfaz a ligação com a demanda A, de que não é membro.

## Contexto

**A-090 · Informativo · Trocar a demanda ligada exige editar só a demanda nova**

`ligarDemanda` confere a permissão apenas sobre a demanda nova, e o repositório apaga (soft delete) a ligação anterior do plano. Quem acessa o plano e é membro da demanda B desfaz a ligação com a demanda A, de que não é membro. O SPEC só diz "ligar demanda exige poder editá-la"; a troca não está escrita.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/plano/services/plano.service.ts:164 — só `dto.demandaId` (a nova) passa por `recuperarDemandaEditavel`
- backend/src/modules/plano/repositories/plano.repository.ts:334-340 — `UPDATE plano_demanda SET is_deleted = true ... WHERE plano_id = :planoId AND is_deleted = false`

Como observar: DESENVOLVEDOR membro só da demanda B, em plano de projeto ligado à demanda A: PUT /plano/:id/demanda {"demandaId":B} → 200 e a ligação com A é apagada. Sem regra escrita para dizer se deveria ser 403.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** o documento só diz "ligar demanda exige poder editá-la".

**Opções:**

1. Basta poder editar a nova: registrar.
2. Trocar exige poder editar também a antiga (ou ser criador, gestor ou administrador).

## Entregáveis

1. A regra no `SYSTEM.SPEC.md` e, na opção 2, a conferência na `PlanoService.ligarDemanda` com teste.

## Critérios de Aceite

- Teste da service para a troca feita por membro só da demanda nova.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

