# 403-plano-arquivado-somente-leitura.spec.md

> Task 75/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-091 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Informativo. Área: backend/plano. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Decidir se arquivar tira a escrita: hoje nenhuma escrita consulta `arquivado`, então um colega que não pode arquivar continua alterando o texto e publicando a partir de um plano arquivado.

## Contexto

**A-091 · Informativo · Plano arquivado continua editável e publicável por quem tem acesso**

Arquivar é restrito a criador, gestor e administrador, mas nenhuma escrita consulta o campo `arquivado`. Um colega que não pode arquivar continua alterando o texto e publicando a partir de um plano arquivado. Não achei regra escrita sobre isso.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/plano/services/plano.service.ts:105-124 — `alterar` não olha `arquivado`
- backend/src/modules/plano/services/plano-publicacao.service.ts:48-54 — `publicar` não olha `arquivado`
- backend/src/modules/plano/services/plano.service.ts:138-143 — arquivar só troca o campo

Como observar: DESENVOLVEDOR com acesso, não criador, em plano arquivado: PUT /plano/:id {"versao":<atual>,"descricaoTecnica":"x"} → 200.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** arquivar é do criador, do gestor e do administrador; alterar, pontos, fontes, publicar e a conversa ignoram o campo.

**Opções:**

1. Arquivado é somente leitura: recusar as escritas na `PlanoService`.
2. Arquivar é só organização da lista: registrar.

## Entregáveis

1. A regra no `SYSTEM.SPEC.md` e, na opção 1, a checagem nas escritas com teste e o estado somente leitura na tela.

## Critérios de Aceite

- Teste da service: escrita em plano arquivado responde conforme a opção.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

