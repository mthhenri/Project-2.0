# 361-canal-leitura-por-tipo-sempre-auditada.spec.md

> Task 33/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-042 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/mensagem-direta. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Fechar os caminhos em que o gestor que não é membro lê conteúdo do canal sem registro nem aviso: fixadas, última mensagem na lista e busca por texto na lista da supervisão.

## Contexto

**A-042 · Média · Gestor lê conteúdo do canal sem auditoria pelas fixadas, pela última mensagem e pela lista da supervisão**

O próprio código declara que a leitura por tipo é "a da supervisão: auditada e avisada", mas só `listarMensagens` passa pela auditoria. `listarFixadas`, `recuperarGrupo` e `recuperarCanal` entregam texto de mensagens ao gestor não membro sem registro nem aviso. A lista da supervisão ainda busca por texto em todos os grupos legíveis e devolve a última mensagem de cada um, também sem auditoria.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/services/grupo.service.ts:95 — comentário de `leitorPorTipo`: "a leitura é a da supervisão: auditada e avisada"
- backend/src/modules/mensagem-direta/services/grupo-fixada.service.ts:77-86 — `listarFixadas` usa `exigirAcessoAoGrupo` e devolve a `mensagem` inteira de cada fixada
- backend/src/modules/mensagem-direta/services/grupo.service.ts:171-172 — `recuperarGrupo` aceita leitor por tipo e chama `montarResumo`
- backend/src/modules/mensagem-direta/services/grupo.service.ts:624 — `ultimaMensagem` entra no resumo sem olhar se quem pede é membro
- backend/src/modules/mensagem-direta/services/grupo.service.ts:181-185 — `recuperarCanal` devolve o mesmo resumo
- shared/src/dtos/grupo/GrupoResumoDto.ts:19 — `ultimaMensagem: MensagemDiretaResumoDto | null`
- backend/src/modules/mensagem-direta/services/grupo-supervisao.service.ts:68-76 e :99 — lista com filtro `texto` e `ultimaMensagem`, sem `registrarLeituraDeGrupo`

Como observar: GESTOR não membro do canal: `GET /mensagem-direta/grupo/:canalId/fixadas` e `GET /mensagem-direta/canal/demanda/:demandaId` → 200 com texto de mensagens; `GET /mensagem-direta/supervisao/grupos?texto=<palavra>` → grupos que contêm a palavra, com a última mensagem. Esperado pela regra do código: auditoria e aviso; o código não grava nem avisa.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** só `listarMensagens` passa pela auditoria; `listarFixadas`, `recuperarGrupo`, `recuperarCanal` e a lista da supervisão entregam texto.

**Opções:**

1. Essas leituras gravam a mesma auditoria, com o aviso diário.
2. O leitor por tipo recebe só metadados (sem `ultimaMensagem` e sem o texto das fixadas) até abrir a conversa, que é auditada.

Recomendação da auditoria: opção 2 (menos avisos e nenhuma leitura sem abrir).

## Entregáveis

1. A opção escolhida em `grupo.service.ts`, `grupo-fixada.service.ts` e na lista da supervisão.
2. A regra escrita no `SYSTEM.SPEC.md` §12.
3. Testes de integração por tipo de usuário.

## Critérios de Aceite

- Como gestor não membro, nenhuma rota do canal devolve texto de mensagem sem que exista auditoria do dia (ou devolve só metadados, na opção 2).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. Depois de `359-supervisao-do-chat-auditoria-com-ou-sem-cursor`.

