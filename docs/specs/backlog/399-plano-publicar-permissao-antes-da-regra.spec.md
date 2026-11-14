# 399-plano-publicar-permissao-antes-da-regra.spec.md

> Task 71/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-086 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/plano.

## Objetivo

Em `publicar`, a permissão de editar a demanda é conferida logo depois de ler o plano, antes das respostas de versão (409) e de comparação dos textos (400).

## Contexto

**A-086 · Baixa · Publicar responde regra de negócio antes da permissão de editar a demanda**

A checagem de membro da demanda só acontece dentro de `DemandaService.alterar`, última etapa de `publicar`. Antes dela saem 400 (sem demanda, apagaria, textos iguais) e 409 (versão). O impacto é pequeno porque o desenvolvedor já lê o plano e a demanda do projeto, mas a ordem foge do padrão "permissão primeiro".

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/plano/services/plano-publicacao.service.ts:50, 54, 66-67 e 72 — 400/409 de negócio
- backend/src/modules/plano/services/plano-publicacao.service.ts:74 — `demandaService.alterar(alteracoes, usuarioAtivo)` só no fim
- backend/src/modules/demanda/services/demanda.service.ts:460-469 — é aqui que sai 'Você só pode editar demandas das quais é membro'

Como observar: DESENVOLVEDOR com acesso ao projeto e não membro da demanda ligada: POST /plano/:id/publicacao {"versao":<atual>,"abas":["DESCRICAO_TECNICA"]} com texto igual ao da demanda. Esperado 403. O código dá 400 'Os textos escolhidos já são iguais aos da demanda'; com versão antiga dá 409.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. A ordem ajustada na `PlanoService.publicar` e o teste que a fixa (quem não edita a demanda recebe 403 em qualquer estado do plano).

## Critérios de Aceite

- Teste da service para desenvolvedor não membro com versão desatualizada: 403, não 409.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

