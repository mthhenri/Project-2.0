# 383-demanda-pai-lido-com-o-acesso-de-quem-pede.spec.md

> Task 55/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-067 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/demanda.

## Objetivo

Informar `demandaPaiId` de projeto sem acesso deixa de revelar que a demanda existe (400 "deve pertencer ao mesmo projeto") e, pela IA, o nome dela no cartão.

## Contexto

**A-067 · Baixa · demandaPaiId de outro projeto responde 400 (existe) em vez de 404; a ferramenta propor_criar_demanda lê o pai sem filtro de acesso**

Em criar e em alterar o pai é lido sem filtro de acesso, e a resposta "A demanda pai deve pertencer ao mesmo projeto" distingue demanda existente em outro projeto de id inexistente (404). Na ferramenta, quando o projeto vem por projetoPropostaId, a conferência de mesmo projeto é pulada e o nome do pai vai para o cartão.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/services/demanda.service.ts:98-110 — criar: `recuperar({ id: dto.demandaPaiId })` sem filtro; 404 "Demanda pai" × 400 "A demanda pai deve pertencer ao mesmo projeto"
- backend/src/modules/demanda/services/demanda.service.ts:363-375 — alterar: mesma sequência
- backend/src/modules/demanda/ferramentas/propor-criar-demanda.ferramenta.ts:61-65 — `demandaRepositorio.recuperar` direto; a linha 63 só compara projeto `if (entrada.projetoId && ...)`; 65 copia `pai.nome`

Como observar: Como DESENVOLVEDOR com acesso ao projeto 1: POST /api/demanda {"projetoId":1,"demandaPaiId":<id de demanda do projeto 2, sem acesso>,"nome":"x","horasEstimadas":0,"status":"PLANEJADA","estrutural":false}. Esperado: 404 "Demanda pai não encontrada". O código responde 400 "A demanda pai deve pertencer ao mesmo projeto".

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Em `criar` e `alterar`, o pai é lido com o filtro de acesso do usuário; quem não tem visão total recebe 404 nos dois casos (inexistente e sem acesso).
2. `propor_criar_demanda` confere o pai pela `DemandaService` também quando o projeto vem por `projetoPropostaId`.
3. Testes da service e da ferramenta com desenvolvedor sem acesso.

## Critérios de Aceite

- Desenvolvedor cria sub-demanda informando pai de outro projeto: 404, sem mensagem que confirme a existência.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

