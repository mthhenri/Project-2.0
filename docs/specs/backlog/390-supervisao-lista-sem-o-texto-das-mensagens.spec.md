# 390-supervisao-lista-sem-o-texto-das-mensagens.spec.md

> Task 62/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-077 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/mensagem-direta. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

A listagem da supervisão deixa de ser um jeito de ler conversas sem registro: hoje ela devolve a última mensagem inteira de cada conversa e aceita busca por texto e período, sem auditoria nem aviso.

## Contexto

**A-077 · Média · Listagem da supervisão entrega o texto das mensagens e aceita busca por texto e período sem auditoria nem aviso**

`GET supervisao/conversas` devolve em `ultimaMensagem` a mensagem inteira (com `texto`) mais recente que casa com o filtro, por conversa, e nunca grava auditoria nem avisa. Com `texto` e deslizando `fim`, o gestor lê qualquer conversa entre desenvolvedores mensagem a mensagem sem deixar rastro.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/services/mensagem-direta-supervisao.service.ts:54-83 — `listarConversasSupervisionadas` não chama `supervisaoRepositorio`; linha 79 repassa `ultimaMensagem: conversa.ultimaMensagem`
- backend/src/modules/mensagem-direta/repositories/mensagem-direta-postgres.repository.ts:134-146 — `FILTROS_DA_SUPERVISAO` aplica texto, período e código antes de escolher a última
- backend/src/modules/mensagem-direta/repositories/mensagem-direta-postgres.repository.ts:160-180 — a macro ranqueia só as mensagens filtradas (`ROW_NUMBER` por conversa)
- backend/src/modules/mensagem-direta/repositories/mensagem-direta-postgres.repository.ts:228 — `ultimaMensagem: deFonteDireta(deLinha(linha))`, a mensagem completa (texto na linha 206)

Como observar: Como GESTOR: GET /api/v1/mensagem-direta/supervisao/conversas?texto=senha&fim=2026-01-10T12:00:00Z. Esperado: nenhum conteúdo sem auditoria/aviso. O código responde 200 com o texto integral da última mensagem que casa em cada conversa; `mensagem_direta_supervisao` não recebe linha.

Verificação na auditoria: reproduzido na aplicação rodando em 2026-11-14: `GET /mensagem-direta/supervisao/conversas?texto=SEGREDO` devolveu o texto das mensagens e o número de auditorias do gestor não mudou.

## Decisão do autor pendente

**Antes:** `ultimaMensagem` vem com `texto`; com `texto` e `fim` deslizando, o gestor lê uma conversa mensagem a mensagem.

**Opções:**

1. A lista traz só participantes, total e data (muda `ConversaDiretaSupervisaoResumoDto`); a busca por texto diz em quais conversas há ocorrência, sem o trecho.
2. A consulta que devolve conteúdo grava a auditoria e avisa, como a abertura da conversa.

Recomendação da auditoria: opção 1.

## Entregáveis

1. A opção escolhida na service e no repository da supervisão (conversas um a um e grupos), com o DTO ajustado no `shared` se for a opção 1.
2. A tela de Supervisão adaptada ao que a lista passa a devolver.
3. Testes de integração: a lista não devolve texto (ou grava auditoria).

## Critérios de Aceite

- Repetir o roteiro: a resposta da lista não contém o texto das mensagens, ou a tabela de auditoria ganha a linha.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. Gate visual da tela de Supervisão se a lista mudar.

