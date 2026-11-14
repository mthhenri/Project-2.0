# 365-proposta-do-resumo-tratada-num-ponto-so.spec.md

> Task 37/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-046 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/mensagem-direta e proposta-ia.

## Objetivo

A proposta de gravar o resumo não pode ser confirmada ou desfeita pela rota geral `/proposta-ia/:id/*` fugindo das checagens do resumo (ser membro agora, marcar o resumo como gravado, avisar o chat).

## Contexto

**A-046 · Baixa · Proposta do resumo pode ser confirmada ou desfeita pela rota geral, fora das checagens do resumo**

A proposta de gravar o resumo é uma proposta comum do usuário; `confirmarProposta` do resumo exige ser membro do grupo agora, marca o resumo como gravado e avisa o chat, mas `POST /proposta-ia/:id/confirmar` só confere o dono. Por ela a documentação é gravada sem marcar o resumo nem avisar o chat, e o mesmo resumo pode virar proposta de novo. A permissão sobre a demanda continua valendo, porque o executor passa pelo `DemandaService`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/services/grupo-resumo-ia.service.ts:222 — proposta `ALTERAR_DEMANDA` criada em nome de quem pede
- backend/src/modules/mensagem-direta/services/grupo-resumo-ia.service.ts:229-235 — `confirmarProposta`: membro do grupo, `marcarGravado` e aviso no chat
- backend/src/modules/mensagem-direta/services/grupo-resumo-ia.service.ts:211 — `criarProposta` só barra se `gravadaData` estiver preenchida
- backend/src/modules/proposta-ia/controllers/ (único *.controller.ts):33 e :48 — `@Post(':id/confirmar')` e `@Post(':id/desfazer')`
- backend/src/modules/proposta-ia/services/proposta-ia.service.ts:322-327 — `obterDoUsuario` confere só o dono
- backend/src/modules/demanda/executores/alterar-demanda.executor.ts:46 e :58-64 — executor usa `demandaService.recuperar/alterar` com o usuário

Como observar: Membro do canal: `POST /mensagem-direta/grupo/:g/resumo/:r/proposta` e depois `POST /proposta-ia/:propostaId/confirmar`. Esperado: resumo marcado como gravado e mensagem "Resumo gravado na demanda"; pelo código a documentação é gravada sem as duas coisas e um novo `POST .../proposta` do mesmo resumo é aceito. Não executado: as transições de `PropostaIaService.confirmar` não foram lidas.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Um ponto só de tratamento: ou a marcação e o aviso reagem à confirmação e ao desfazer onde quer que ocorram, ou a rota geral recusa proposta vinculada a resumo.
2. Teste: confirmar pela rota geral não deixa o resumo sem marca nem permite gerar a mesma proposta duas vezes.

## Critérios de Aceite

- Teste da service de propostas e do resumo para o caminho pela rota geral.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

