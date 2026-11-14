# 378-atividade-excluir-e-restaurar-uma-regra-so.spec.md

> Task 50/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-062 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: Rota e ferramenta de IA divergentes para a mesma ação..
> Severidade: Média. Área: backend/atividade. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Acabar com a diferença entre os dois caminhos: a rota recusa todo desenvolvedor (até na própria atividade) e a ferramenta `propor_excluir_atividade` deixa o dono excluir e restaurar pelo chat.

## Contexto

**A-062 · Média · Excluir e restaurar atividade: a rota recusa todo desenvolvedor, a IA permite ao dono**

DELETE /atividade/:id e PATCH /atividade/:id/restaurar exigem `podeEditarAtividadeDeOutro` no guard, então o desenvolvedor recebe 403 até na própria atividade. A service e a ferramenta `propor_excluir_atividade` (permissão QUALQUER) aceitam o dono, que exclui e restaura pelo chat a atividade sem execução. O resumo de regras lista excluir/restaurar atividade como permissão extra do auxiliar; a exceção da task 230 só está no código.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/atividade/controllers/atividade.controller.ts:93-94 e 108-109 — @ExigePermissao(podeEditarAtividadeDeOutro) em excluir e restaurar
- backend/src/modules/atividade/services/atividade.service.ts:277 e 296 — a service aceita o dono
- backend/src/modules/atividade/ferramentas/propor-excluir-atividade.ferramenta.ts:23 e 40 — permissão QUALQUER; dono ou podeEditarAtividadeDeOutro
- backend/src/modules/atividade/executores/excluir-atividade.executor.ts:36-44 e 47-55 — executa excluir e restaurar com o usuário do token
- backend/src/modules/atividade/services/atividade.service.regras.test.ts:279 — teste 'o dono (desenvolvedor) exclui a própria atividade (task 230)'

Como observar: Desenvolvedor: DELETE /api/v1/atividade/<própria, sem execução> dá 403. No chat, 'exclua minha atividade X' e POST /api/v1/proposta-ia/:id/confirmar: atividade excluída; POST /api/v1/proposta-ia/:id/desfazer restaura.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** `DELETE /atividade/:id` e `PATCH /atividade/:id/restaurar` exigem `podeEditarAtividadeDeOutro` no guard; a service e a ferramenta aceitam o dono.

**Opções:**

1. O dono exclui a própria atividade sem execução também pela rota (o guard sai e a service decide).
2. A IA segue a rota: só quem conduz o trabalho exclui.

## Entregáveis

1. A regra escolhida na rota, na service e na ferramenta, escrita no `SYSTEM.SPEC.md` §14, com testes por tipo.

## Critérios de Aceite

- O mesmo pedido (dono desenvolvedor exclui atividade sem execução) dá o mesmo resultado pela rota e pela proposta da IA.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.
