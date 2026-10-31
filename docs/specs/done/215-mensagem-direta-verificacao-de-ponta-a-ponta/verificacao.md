# Verificação — 215 Chat entre colaboradores, ponta a ponta

Verificada em 2026-10-31, no Windows com Docker Desktop. Saídas brutas em `.artifacts/215/` (ignorada pelo Git). O roteiro é `scripts/verificar-chat-duas-instancias.mjs`
(`node scripts/verificar-chat-duas-instancias.mjs <opensearch|elasticsearch|postgres> [--completo] [--conteiner-a]`).

## Ambiente simulado (e o que não foi)

- **Duas instâncias da API** na mesma máquina, portas 3100 (A) e 3101 (B), mesmo PostgreSQL, `CHAT_EVENTOS=postgres`. A instância A rodou num **contêiner Linux**
  (`node:22`, dependências instaladas no Linux num volume próprio) para o SIGTERM ser de verdade: no Windows `kill('SIGTERM')` mata o processo à força e não roda
  os ganchos de encerramento. A B rodou como processo do Windows.
- **Elasticsearch 9.1** real, do `docker-compose.yml` (perfil `elasticsearch`, porta 9201); OpenSearch 2 e PostgreSQL 16 também reais.
- **Não simulado:** proxy reverso sem buffer, contêineres da API e do front, tempo de leitura do proxy maior que o batimento de 25 s e o tempo de graça de uma
  orquestração. O `docker-compose.yml` do projeto só tem PostgreSQL, OpenSearch e Elasticsearch: **não existe composição da API nem do front**, e esta task não a inventa
  (lacuna registrada em `CONTEXT.md`). A "instância nova antes da antiga" foi reproduzida só no sentido de que os clientes seguem recebendo pela outra instância.

## Achado e correção

**Defeito:** com SIGTERM a API avisava os streams (`ENCERRANDO`) mas **não terminava**: ficava viva até o SIGKILL (`docker stop -t 40` → 41 s e código 137, mesmo sem
nenhum cliente). Causa: o pool do Knex nunca era fechado, e as conexões ociosas seguravam o processo (`getActiveHandles` mostrou um socket para a porta 5433).
**Correção:** `DatabaseModule.onApplicationShutdown` fecha o pool depois de todos os `onModuleDestroy`; teste unitário `database.module.test.ts`.
**Depois:** `docker stop` em 1 s e código 0. Esse defeito afetaria qualquer deploy com troca de instância, não só o chat.

## Roteiro de duas instâncias (11 verificações em cada armazenamento, `--conteiner-a`)

| Verificação | OpenSearch | Elasticsearch | PostgreSQL |
|---|---|---|---|
| As duas instâncias sobem | OK | OK | OK |
| Primeiro evento de cada stream é `ABERTURA` | OK | OK | OK |
| Presença entre instâncias (Ana em A vê Bruno em B online) | OK | OK | OK |
| Mensagem enviada em A chega ao destinatário ligado em B | OK | OK | OK |
| `LEITURA` marcada em B volta ao remetente em A | OK | OK | OK |
| 21 mensagens alternando as instâncias, todas no stream | 21/21 | 21/21 | 21/21 |
| Queda do stream e reconexão abre com `ABERTURA` | OK | OK | OK |
| Recuperação pela conversa: enviadas = recuperadas, sem perda nem duplicata | 26/26 | 26/26 | 26/26 |
| Reenviar o mesmo `mensagemId` não duplica (`jaExistia`) | OK | OK | OK |
| `SIGTERM` na A entrega `ENCERRANDO` ao stream | OK | OK | OK |
| A instância A encerra com código 0 | OK | OK | OK |

Antes da correção, a última linha falhava (`.artifacts/215/duas-instancias-opensearch.txt` da primeira passada).

**Presença que expira (`--completo`, PostgreSQL):** depois de matar a instância B com SIGKILL, Bruno saiu de online para quem estava numa instância nova (C, no lugar da A)
em **78 s**, dentro dos ~80 s da 209; a instância C já enxergava Bruno online na B ao subir. Essa passada ainda usou a A como processo do Windows, então o
`ENCERRANDO` dela falhou **por limite do Windows** (processo morto sem gancho); esse item só vale a partir das passadas com contêiner, acima. A passada completa não foi repetida
com contêiner nos outros dois armazenamentos.

## Armazenamento

- Suíte de contrato (`armazenamento-de-mensagem-direta.contrato.ts`) com `CHAT_INTEGRACAO=1`: **96 testes** nos três arquivos de repositório, contra OpenSearch, Elasticsearch
  e PostgreSQL reais, nenhum pulado.
- A API completa subiu e funcionou com `CHAT_ARMAZENAMENTO` igual a `opensearch`, `elasticsearch` e `postgres` (o roteiro acima, uma vez por valor).

## Na tela (uma pessoa na interface, a outra pela API)

Ana logada no Project (`1366×768` de partida), Bruno e um gestor pela API contra o backend de desenvolvimento:
- A mensagem do Bruno chegou **em tempo real** como cartão de aviso no canto, com "Responder"; o botão abriu a conversa no popup.
- O gestor novo abriu a conversa na supervisão e a linha central "Leitora Nova 215, gestor, leu esta conversa · 01:32" apareceu no popup aberto da Ana, sem recarregar
  (fecha o que a 214 deixou como não verificado). Um segundo gestor lendo no mesmo dia gera outra linha; o mesmo gestor, no mesmo dia, não (visto antes: `avisou: false`).
- **Não feito:** "Lida" visto na tela, reenvio de mensagem que falhou, busca por texto e por código, menção e cartão de demanda **pela interface** (cobertos por testes de
  componente e, no servidor, pelo roteiro); as verificações do **Electron real** (copiar código em outro programa, atalho global, escolher a pessoa, aviso com o Project
  oculto, silêncio e aviso desligado) **não foram repetidas** aqui; a 213 tem a sua parte.

## Gates

`npm test` (shared 294, backend 1578, scripts), `npm run test:integracao` 366, desktop 37, `repo:test` 13 de 14 (um item pulado, preexistente), build do backend e `repo:verificar`
ok. Frontend e desktop não mudaram nesta task (rodados na 214). Sem lint (P-001).

## Limites

Uma máquina só (sem latência de rede entre instâncias); os 3 armazenamentos foram exercitados com a instância B no Windows e a A em Linux. Teste de carga e backup do
Elasticsearch ficam fora (como a spec diz).
