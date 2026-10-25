# 225-chat-sumico-scroll-e-varias-propostas.spec.md

> Task 2/8 (fase 1) da guarda-chuva [`chat-propostas.spec.md`](chat-propostas.spec.md): corrige a mensagem da IA que some e volta, a
> rolagem que não acompanha o cartão e a mensagem que guarda só a primeira proposta do turno. Origem: `IDEAS.md` I-026, defeitos
> encontrados na leitura do código em 2026-10-25 (**não reproduzidos ao vivo**: reproduzir primeiro).

## Objetivo

A resposta da IA com proposta aparece uma vez, sem piscar, com a rolagem acompanhando o cartão; ao reabrir a conversa, todas as
propostas do turno estão lá, e o texto das voltas do laço de ferramentas não vem colado.

## Entregáveis

1. **Reprodução ao vivo** dos três defeitos antes de mexer (skill `verify`), registrada em `.artifacts/225-.../` e resumida no fecho.
2. **Um item só para a resposta em andamento e a gravada** (`frontend/src/app/modules/chat/pages/chat/chat.page.ts` e `.html`, hoje a
   bolha `aoVivo` apagada no evento `fim`): a mensagem gravada assume o lugar da bolha sem destruir o `app-chat-proposta-cartao`; os dados
   da proposta já carregados são reaproveitados (sem "Carregando proposta…" de novo).
3. **Rolagem** acompanha até o cartão terminar de carregar e crescer, salvo se o usuário subiu a conversa.
4. **Lista de propostas por mensagem** nos três armazenamentos de `ArmazenamentoDeChat` (OpenSearch, Elasticsearch, Postgres provisório):
   o campo `propostaId` (hoje `propostasDoTurno[0]` em `backend/src/modules/chat/services/chat.service.ts`) passa a ser lista
   (`propostaIds`); mensagem antiga com uma só continua lida como lista de um. `ChatMensagemResumoDto` e
   `backend/src/modules/chat/domain/chat-mensagem.documento.ts` acompanham; migration só se o Postgres provisório exigir (a próxima
   livre na hora; migration já aplicada nunca é editada) e o mapeamento do índice ganha o campo sem quebrar o índice existente.
5. **Separador entre as voltas** do laço de ferramentas (hoje `texto += resposta.texto`): um parágrafo em branco entre textos de voltas
   diferentes.
6. Atualizar `docs/SYSTEM.SPEC.md` (linha `chat`, "`proposta_id` (a primeira do turno)") na mesma task.

## Critérios de Aceite

- Testes de componente da `chat.page`: resposta sem proposta, com uma, com duas e com falha no meio; o cartão não é recriado no `fim`.
- Testes do `ChatService` (lista de propostas gravada, texto com separador) e da suíte de contrato dos três armazenamentos (leitura de
  mensagem antiga com `propostaId` único); `npm run test:integracao` para o Postgres provisório.
- Builds do backend e do frontend passam; testes de `shared`, `backend` e `frontend` sem regressão.
- Verificação ao vivo: resposta com duas propostas não pisca, a rolagem fica no cartão, a conversa reaberta mostra as duas; bom dia,
  retomada e check-in (mesmo caminho de streaming) continuam funcionando; 1920×1080, 1366×768 e 1080×1920.

## Fora de Escopo

- Cartão compacto, grupo e "Confirmar todas" (226 e 227); só garante que a mensagem guarda e mostra a lista.
- Mudar o protocolo de eventos do stream além do necessário.

## Dependências

Nenhuma. Vem primeiro; a 227 depende dela.

## Riscos e Mitigação

- O fluxo de streaming é sensível e compartilhado (bom dia, retomada, check-in). Mitigação: testes dos três caminhos e verificação ao vivo.
- Defeitos ainda não reproduzidos: se um deles não se confirmar, registrar no fecho e ajustar o escopo.
