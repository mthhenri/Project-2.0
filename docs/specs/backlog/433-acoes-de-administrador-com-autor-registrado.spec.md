# 433-acoes-de-administrador-com-autor-registrado.spec.md

> Task 105/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-142 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Informativo. Área: backend/prompt e configuracao-ia. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Com mais de um administrador, ativar o rascunho de outro, restaurar o padrão, descartar e alterar preço deixam de acontecer sem rastro de quem fez.

## Contexto

**A-142 · Informativo · Ativar, restaurar e descartar prompt e alterar preço não registram qual administrador agiu**

Salvar rascunho e gravar versão da configuração guardam o autor do token, mas ativar o rascunho, restaurar o padrão, descartar e alterar preço não recebem o usuário. Com mais de um administrador, quem ativa o rascunho de outro não deixa rastro: a versão ativa segue com o autor do rascunho, e o preço muda na versão ativa sem autor.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/prompt/services/prompt.service.ts:78 — `salvarRascunho(tipo, dto.conteudo, usuarioAtivo.sub)`; linhas 85, 94 e 102 — `ativarRascunho(tipo)`, `restaurarPadrao(tipo)` e `descartarRascunho(tipo)` sem o usuário
- backend/src/modules/prompt/repositories/prompt.repository.ts:230-233 — `UPDATE prompt SET ativo = true, rascunho = false`, sem tocar `usuario_id`
- backend/src/modules/ia-custo/services/ia-custo.service.ts:69 — `configuracaoIaService.alterarPreco(dto)` sem `usuarioAtivo.sub`
- backend/src/modules/configuracao-ia/repositories/configuracao-ia.repository.ts:144-152 — `UPDATE configuracao_ia SET precos_modelo = jsonb_set(...), updated_date = NOW()` na versão ativa, sem autor
- backend/src/modules/configuracao-ia/services/configuracao-ia.service.ts:100 — a versão nova grava `usuarioAtivo.sub`

Como observar: Administrador A: POST /prompt/CONVERSA/rascunho {conteudo}. Administrador B: POST /prompt/CONVERSA/rascunho/ativar. GET /prompt/CONVERSA/versoes mostra a versão ativa com A como autor e nada indica que B ativou; o mesmo com PUT /ia-custo/preco feito por B.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor pendente

Guardar o autor nessas ações exige coluna nova: é modelagem.

**Antes:** salvar rascunho e gravar versão da configuração guardam o autor; as outras quatro ações não recebem o usuário.

**Opções:**

1. Coluna de autor nas tabelas envolvidas (migration).
2. Sem mexer no modelo: registro em log com o id do usuário nas quatro ações.
3. Não registrar.

## Entregáveis

1. A opção escolhida, com teste.

## Critérios de Aceite

- Depois de ativar um rascunho, dá para saber qual administrador ativou (pelo meio escolhido).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

