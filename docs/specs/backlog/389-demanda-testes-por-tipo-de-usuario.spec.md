# 389-demanda-testes-por-tipo-de-usuario.spec.md

> Task 61/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-076 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/demanda.

## Objetivo

Cobrir na service o que hoje só tem teste de metadado do decorador ou nenhum: auxiliar recusado em `descricaoCliente`, auxiliar editando sem ser membro, escritas em projeto sem acesso, excluir e restaurar.

## Contexto

**A-076 · Baixa · Regras sensíveis de demanda sem teste por tipo de usuário**

Não há teste da service para: auxiliar recusado ao gravar descricaoCliente em alterarTextos; auxiliar editando demanda sem ser membro em alterar (caso positivo); alvo gestor ou inativo em atribuirMembro/criar; desenvolvedor em projeto inacessível nas escritas de tag e membro. Excluir e restaurar só têm teste de metadado do decorador, e o desfazer de CRIAR_DEMANDA não é testado por tipo.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/services/demanda.service.test.ts:96 e :54 — alterarTextos só testa desenvolvedor; a única ocorrência de AUXILIAR no arquivo é em listarExecutadas
- backend/src/modules/demanda/services/demanda.service.regras.test.ts:300 — único caso de AUXILIAR em alterar é a recusa da descricaoCliente; títulos 284 e 290 só falam de desenvolvedor
- backend/src/modules/demanda/services/demanda.service.regras.test.ts:465 e controllers/demanda.controller.test.ts:13 — excluir testa só soft delete; a restrição por tipo é conferida apenas como metadado @GestorOnly
- backend/src/modules/demanda/services/demanda.service.regras.test.ts:507 e 536 — recusa do desenvolvedor não distingue demanda de projeto inacessível (403 × 404)
- grep -c AUXILIAR em executores/criar-demanda.executor.test.ts, ferramentas/alterar-demanda.test.ts e ferramentas/concluir-demanda.test.ts devolve 0

Como observar: grep -n "AUXILIAR" backend/src/modules/demanda/services/*.test.ts e leitura dos títulos de teste: os casos listados não aparecem.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Casos por tipo (administrador, gestor, auxiliar, desenvolvedor) para `alterarTextos`, `alterar`, escritas de tag e membro em projeto inacessível, `excluir` e `restaurar`.

## Critérios de Aceite

- Cada caso falha se a verificação correspondente for removida da service.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Os testes de alvo gestor ou inativo e do desfazer de criar demanda, que vêm nas specs dessas correções.

## Dependências

Nenhuma.

