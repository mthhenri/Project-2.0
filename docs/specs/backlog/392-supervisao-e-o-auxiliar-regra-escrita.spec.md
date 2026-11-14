# 392-supervisao-e-o-auxiliar-regra-escrita.spec.md

> Task 64/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-079 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/mensagem-direta. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Escrever a regra do auxiliar na supervisão. O código o trata como desenvolvedor (as conversas dele são lidas por gestor e administrador, e ele não supervisiona ninguém); o `SYSTEM.SPEC.md` só fala em "conversas entre desenvolvedores".

## Contexto

**A-079 · Média · Auxiliar na supervisão: o código o trata como desenvolvedor, a regra escrita não diz**

A conversa é supervisionável quando nenhum participante tem poder de gestor, então conversas auxiliar-desenvolvedor e auxiliar-auxiliar são lidas por gestor e administrador, e o auxiliar não supervisiona ninguém. O documento só fala em "conversas entre desenvolvedores" e em conversa com gestor ou administrador ser privada; o auxiliar não aparece.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/domain/mensagem-direta-regras.ts:91-93 — `tiposDosParticipantes.every((tipo) => !temPermissaoDeGestor(tipo))`
- shared/src/utils/permissao-usuario.ts:9-11 — `temPermissaoDeGestor` é só GESTOR e ADMINISTRADOR ("O auxiliar NÃO passa")
- backend/src/modules/usuario/repositories/usuario.repository.ts:648 — a lista exclui só `[GESTOR, ADMINISTRADOR]`
- backend/src/modules/autenticacao/guards/gestor.guard.ts:19 e mensagem-direta-supervisao.service.ts:173 — acesso só com `temPermissaoDeGestor`
- docs/SYSTEM.SPEC.md:1252 — "gestor e administrador leem só conversas entre desenvolvedores; conversa que envolve gestor ou administrador é privada"

Como observar: Como GESTOR: GET /api/v1/mensagem-direta/supervisao/conversa/<auxiliar>-<desenvolvedor> responde 200 com as mensagens. Como AUXILIAR: GET /api/v1/mensagem-direta/supervisao/conversas responde 403. A regra para o auxiliar não está escrita para comparar.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** `conversaEhSupervisionavel` é verdadeira quando nenhum participante tem poder de gestor.

**Opções:**

1. É isso: registrar no documento que o auxiliar conta como desenvolvedor na supervisão.
2. A conversa que envolve auxiliar é privada: mudar a função e os testes.

## Entregáveis

1. A regra no `SYSTEM.SPEC.md` §12 e teste com auxiliar em `conversaEhSupervisionavel` e na service.

## Critérios de Aceite

- Teste cobre auxiliar com desenvolvedor, auxiliar com auxiliar e auxiliar com gestor.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

