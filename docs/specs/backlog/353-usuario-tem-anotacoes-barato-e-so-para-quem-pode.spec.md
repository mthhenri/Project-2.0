# 353-usuario-tem-anotacoes-barato-e-so-para-quem-pode.spec.md

> Task 25/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-032, A-033 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/usuario.

## Objetivo

O campo `temAnotacoes` da listagem de usuários deixa de varrer o texto inteiro de cada seção e deixa de informar, a quem não pode abrir o pad de alguém, se esse pad tem conteúdo.

## Contexto

**A-032 · Baixa · `GET /usuario` calcula `temAnotacoes` varrendo o texto das seções do pad de cada usuário, também nas listas de seletor que não usam o campo**

A consulta da listagem faz, por linha, um `EXISTS` com `regexp_replace(anotacao.texto, '[[:space:]]+', '', 'g') <> ''`, que reescreve o texto inteiro de cada seção. Com `allRows` não há `LIMIT`, e é assim que Atividades, Ponto, Execuções e o catálogo de Demandas pedem os usuários. Só a tela Usuários lê `temAnotacoes`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/usuario/repositories/usuario.repository.ts:166-177 — `EXISTS` com `regexp_replace` sobre `anotacao.texto`
- backend/src/modules/usuario/repositories/usuario.repository.ts:147-154 — com `allRows` a paginação some
- frontend/src/app/modules/usuario/services/usuario.service.ts:32-35 — o catálogo pede `listar({ allRows: true })`
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:797, frontend/src/app/modules/ponto/pages/ponto/ponto.page.ts:288 e frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts:522 — seletores com `allRows: true`
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.html:199-208 — único uso de `temAnotacoes`

Como observar: Não aparece na aba de rede além do tempo de resposta; ver o plano (`EXPLAIN ANALYZE`) da consulta de `GET /usuario?allRows=true` com pads longos.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

**A-033 · Baixa · `GET /usuario` devolve `temAnotacoes` de todos os usuários a quem não pode abrir aquele pad**

A rota é aberta a auxiliar, gestor e administrador e calcula `temAnotacoes` para toda linha. Pela regra do pad, o auxiliar só abre o próprio, e ninguém abre o de outro gestor ou administrador. O frontend esconde o botão nesses casos, mas o campo vem na resposta.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/usuario/controllers/usuario.controller.ts:103-107 — `@ExigePermissao(temVisibilidadeTotal)` em `GET /usuario`
- backend/src/modules/usuario/repositories/usuario.repository.ts:166-177 — `temAnotacoes` calculado para toda linha, sem olhar quem pede
- backend/src/modules/anotacao/services/anotacao.service.ts:165-175 — quem não é gestor só acessa o próprio pad; pad de gestor ou administrador é só dele
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:246-249 — o botão só aparece onde `podeAbrirAnotacoes`

Como observar: Como auxiliar, abrir Atividades e ver a resposta de `GET /usuario?ativo=true&allRows=true`: cada item traz `temAnotacoes`. Como gestor, na tela Usuários, a linha de outro gestor também traz o campo.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. No `UsuarioRepository`, a expressão de `temAnotacoes` para no primeiro caractere útil (sem mudar o DTO).
2. Na `UsuarioService`, `temAnotacoes` vem `false` para as linhas cujo pad quem pede não pode abrir, pela mesma regra de `AnotacaoService.validarAcesso` (hoje o auxiliar recebe o campo de todos e não abre o pad de ninguém).
3. Teste de integração do repository e teste da service por tipo de usuário.

## Critérios de Aceite

- Como auxiliar, `GET /usuario?allRows=true` devolve `temAnotacoes: false` em todas as linhas menos a dele; como gestor, o valor real.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Calcular o campo só para a tela Usuários (exigiria parâmetro ou DTO de seletor: contrato).

## Dependências

Nenhuma.
