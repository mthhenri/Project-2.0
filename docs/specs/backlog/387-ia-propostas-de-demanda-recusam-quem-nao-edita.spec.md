# 387-ia-propostas-de-demanda-recusam-quem-nao-edita.spec.md

> Task 59/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-071 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/demanda.

## Objetivo

O desenvolvedor que não é membro deixa de receber um cartão que só falha ao confirmar: as três ferramentas usam o `podeEditar` que a leitura da demanda já devolve.

## Contexto

**A-071 · Baixa · Ferramentas propor_concluir/alterar/descrever_demanda criam cartão para desenvolvedor que não é membro; o 403 só vem no Confirmar**

As ferramentas leem a demanda com recuperar, que confere só o acesso ao projeto, e não usam o `podeEditar` que essa leitura já devolve. O desenvolvedor não membro recebe a proposta e só é recusado quando o executor chama DemandaService.alterar. A ferramenta de membro, ao contrário, antecipa as recusas da service.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/demanda/ferramentas/propor-concluir-demanda.ferramenta.ts:37-41 — só recuperar e status; :19 — descrição "Quem é da demanda e o gestor podem"
- backend/src/modules/demanda/ferramentas/propor-alterar-demanda.ferramenta.ts:40 e propor-descrever-demanda.ferramenta.ts:52 — mesma leitura, sem checar participação
- backend/src/modules/demanda/services/demanda.service.ts:315-317 — recuperar já calcula `podeEditar`
- grep de `podeEditar` em backend/src/modules/demanda/ferramentas e executores: nenhuma ocorrência
- backend/src/modules/demanda/services/demanda.service.ts:460-469 — a recusa por participação só acontece em recuperarDemandaParaEditar

Como observar: Como DESENVOLVEDOR com acesso ao projeto mas não membro da demanda X: pedir à IA "conclua a demanda X". Esperado: recusa já na proposta. O código cria o cartão e o Confirmar falha com 403 "Você só pode editar demandas das quais é membro".

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `propor_concluir_demanda`, `propor_alterar_demanda` e `propor_descrever_demanda` recusam com mensagem para o modelo quando `demanda.podeEditar` é falso.
2. Teste das três ferramentas com desenvolvedor não membro.

## Critérios de Aceite

- Teste: nenhuma proposta é criada para quem não edita a demanda.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

