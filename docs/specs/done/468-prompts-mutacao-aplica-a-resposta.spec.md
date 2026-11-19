# 468-prompts-mutacao-aplica-a-resposta.spec.md

> Task 140/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-186 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-10.
> Severidade: Média. Área: frontend/configuracao-ia.

## Objetivo

Cada mutação de prompt deixa de pedir `GET /prompt` (os 14 prompts inteiros) e `GET /prompt/:tipo/versoes`: a resposta já traz o prompt gravado.

## Contexto

**A-186 · Média · Prompts: toda mutação relê GET /prompt e GET /prompt/:tipo/versoes, embora a resposta já traga o prompt gravado**

Salvar rascunho, ativar, restaurar padrão, descartar e desfazer chamam carregarTipos(tipo), que pede GET /prompt e, em cascata, GET /prompt/:tipo/versoes?itensPorPagina=50. As respostas de salvar e ativar são um PromptResumoDto completo, o mesmo formato de ativa/rascunho em PromptTipoResumoDto. No salvar rascunho a releitura das versões nem muda a tela, porque o histórico descarta rascunhos.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/configuracao-ia/components/prompts-aba/prompts-aba.component.ts:172-176 — salvarRascunho: POST e depois this.carregarTipos(tipo)
- frontend/src/app/modules/configuracao-ia/components/prompts-aba/prompts-aba.component.ts:119-129 e 152 — carregarTipos pede listarTipos() e, no next, abrirTipo() pede listarVersoes(tipo)
- frontend/src/app/modules/configuracao-ia/components/prompts-aba/prompts-aba.component.ts:198-202, 221-225, 239-246 — ativar, restaurar padrão, descartar e o desfazer repetem carregarTipos(tipo)
- frontend/src/app/modules/configuracao-ia/components/prompts-aba/prompts-aba.component.ts:74 — versoesNavegaveis filtra !versao.rascunho
- shared/src/dtos/prompt/PromptRascunhoSalvoDto.ts:3 e PromptRascunhoAtivadoDto.ts:3 — ambos são PromptResumoDto; shared/src/dtos/prompt/PromptTipoResumoDto.ts:8-9 — ativa e rascunho são PromptResumoDto

Como observar: Em /configuracao-ia, aba Prompts, editar o texto e clicar em Salvar rascunho. Na rede: POST /prompt/CONVERSA/rascunho, depois GET /prompt e GET /prompt/CONVERSA/versoes?itensPorPagina=50.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. A resposta é aplicada no sinal dos tipos (rascunho ou ativa); ao ativar ou restaurar, a versão entra na lista local; a releitura fica no botão de recarregar.
2. Teste de componente contando as requisições por mutação.

## Critérios de Aceite

- Ao vivo: salvar um rascunho gera só o `POST`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

