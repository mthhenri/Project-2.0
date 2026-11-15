# 441-atividade-texto-da-demanda-sem-reler-ao-salvar.spec.md

> Task 113/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-142 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-12.
> Severidade: Baixa. Área: frontend/atividade.

## Objetivo

Salvar um texto da demanda pelo painel ao lado da lista de atividades atualiza o campo local com o texto do editor, sem pedir `GET /demanda/:id` de novo.

## Contexto

**A-142 · Baixa · Demanda ao lado da lista de atividades: demanda inteira para um texto, relida depois de salvar**

Abrir um dos ícones de texto da linha pede GET /demanda/:id completo; ao salvar, o painel zera a demanda e pede tudo de novo, embora o editor já tenha o texto gravado. O chip 'Demanda: X' com a lista vazia também pede a demanda inteira só pelo nome.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/atividade/components/atividade-demanda-painel/atividade-demanda-painel.component.ts:91-96 — `carregar` faz `demanda.set(null)` e `demandaService.recuperar(demandaId)`
- frontend/src/app/modules/atividade/components/atividade-demanda-painel/atividade-demanda-painel.component.ts:120-124 — `aoSalvar` emite `textoSalvo` e chama `this.carregar(demandaId)`
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:402-404 — `demandaService.recuperar(demandaId)` usado só para `resposta.dados?.nome`

Como observar: /atividade: clicar no ícone de descrição técnica de uma linha: GET /demanda/:id; editar e salvar: a gravação do editor seguida de outro GET /demanda/:id, com o painel voltando ao estado de carga. Não exercitado na medição.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. O painel aplica o texto gravado no sinal local; teste de componente.

## Critérios de Aceite

- Ao vivo: salvar a descrição técnica pelo painel gera só o `PATCH /demanda/:id/textos`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Reduzir o `GET /demanda/:id` da abertura aos três textos (rota ou parâmetro novo: contrato).

## Dependências

Nenhuma.

