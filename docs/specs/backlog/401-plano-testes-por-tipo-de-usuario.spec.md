# 401-plano-testes-por-tipo-de-usuario.spec.md

> Task 73/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-089 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/plano.

## Objetivo

Cobrir o que nenhum teste do módulo exercita: o auxiliar não criador em arquivar e excluir, publicando a aba do cliente e ligando demanda sem ser membro.

## Contexto

**A-089 · Baixa · Módulo plano sem teste com AUXILIAR e sem os casos de borda de acesso**

Nenhum teste do backend do módulo plano usa o tipo AUXILIAR; no shared ele aparece só em `podeAcessarPlano` e na aba do cliente. `podeArquivarOuExcluirPlano` é testada com desenvolvedor, gestor e administrador: trocar a regra para incluir o auxiliar não quebraria teste nenhum. Faltam também o criador de plano solo sem acesso ao projeto e o 403×404 da demanda sem acesso.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- grep de "AUXILIAR" em backend/src/modules/plano/**/*.test.ts não retorna nada
- shared/src/utils/plano.test.ts:40-41 — únicos asserts com AUXILIAR (acesso ao plano de projeto e aba do cliente)
- shared/src/utils/plano.test.ts:61-64 — `podeArquivarOuExcluirPlano` só com DESENVOLVEDOR, GESTOR e ADMINISTRADOR
- backend/src/modules/plano/services/plano.service.test.ts:90, 164 e 175 — solo e arquivar/excluir sem auxiliar e sem criador sem acesso ao projeto
- backend/src/modules/plano/services/plano.service.test.ts:263 — ligarDemanda testa só desenvolvedor membro × não membro

Como observar: Conferência por grep nos *.test.ts; nenhum teste foi rodado.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Casos por tipo de usuário na service do plano e em `podeArquivarOuExcluirPlano`, de modo que incluir o auxiliar na regra quebre um teste.

## Critérios de Aceite

- Cada caso falha se a verificação correspondente for alterada.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Os casos do plano solo e da demanda sem acesso, que vêm nas specs dessas correções.

## Dependências

Nenhuma.

