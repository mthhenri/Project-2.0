# 234-plano-ia.spec.md

> Task 4/7 da guarda-chuva [`chat-planejamento.spec.md`](chat-planejamento.spec.md): a IA passa a conversar no plano, escrever no
> rascunho e editar trechos com aceitar ou rejeitar.

## Objetivo

No modo Planejamento a IA **pergunta antes de escrever**, analisa o que falta, **escreve direto no rascunho** e altera **só o trecho
selecionado**, mostrando a mudança como diff para a pessoa aceitar ou rejeitar.

## Entregáveis

1. **Prompts novos** (migration, próxima livre na hora): `TipoPromptEnum` ganha `PLANEJAMENTO` (a conversa),
   `PLANO_DESCRICAO_TECNICA`, `PLANO_DESCRICAO_CLIENTE` e `PLANO_DOCUMENTACAO`, com seed da versão 1 e nível analítico (confirmar o
   nível por tipo). Aparecem na aba de prompts das Configurações da IA (`modules/configuracao-ia/components/prompts-aba`),
   **editáveis só pelo administrador**, como os atuais. Backend em `modules/prompt` e `modules/configuracao-ia`.
2. **Conversa do plano** no `ArmazenamentoDeChat` (`backend/src/modules/chat/repositories`), com chave de conversa própria do plano
   (formato definido na task, distinto de `<usuarioId>-<yyyy-mm-dd>`), `usuario_id` do autor de cada mensagem e referência opcional
   ao plano. A listagem não filtra por usuário; a autorização vem do acesso ao plano (232). A **suíte de contrato** ganha os
   cenários nas três implementações (OpenSearch, Elasticsearch, PostgreSQL provisório). Tokens por mensagem; o custo é de quem enviou
   (aba Custos, task 202).
3. **Contexto e ferramentas:** a IA recebe o documento, a conversa do plano e as ferramentas de **leitura** do chat (demanda, árvore,
   projeto, equipe), sempre com as permissões de quem enviou. Ferramenta nova de **escrita direta no rascunho** (grava com a
   `versao`; recusa sobre versão mais nova). No planejamento a IA **não** propõe iniciar, pausar nem registrar execução. Numa conversa
   de desenvolvedor, não lê nem escreve a aba do cliente.
4. **Edição de trecho:** a pessoa seleciona um trecho do documento e pede a mudança; a IA devolve o novo trecho como **proposta**
   (`proposta_ia` com valor novo em `TipoPropostaIaEnum`, migration em `tipo_proposta_ia`; `dados` com `planoId`, aba,
   `trechoAntigo`, `trechoNovo` e `versao`). Confirmar, recusar, desfazer e expirar reaproveitam `modules/proposta-ia` (executor novo
   em `proposta-ia/domain`). **Expira** quando o trecho antigo não está mais no texto. A mudança aparece no próprio documento; a
   pessoa aceita, rejeita ou pede outra versão.
5. **Sem coedição:** duas pessoas no mesmo plano seguem a regra de versão da 232.
6. **IA desligada:** o plano segue legível e editável; só a conversa para.
7. Testes: service e executor (aceitar, rejeitar, expirar com texto alterado, aba do cliente vedada ao desenvolvedor), contrato do
   armazenamento, repositories alterados com teste de integração, componente do pedido de edição.

## Critérios de Aceite

- `npm test`, `npm run test:integracao` (com `CHAT_INTEGRACAO=1` para o contrato) e os builds de backend e frontend aprovados.
- Verificação ao vivo com a IA real (skill `verify`): conversa do plano com duas pessoas do projeto vendo as mensagens uma da outra;
  escrita direta; edição de trecho aceita, rejeitada e expirada; desenvolvedor sem a aba do cliente. UI em 1920×1080, 1366×768 e
  1080×1920. Análogo: o chat atual e o `proposta-cartao`.
- O diff do trecho usa a apresentação por palavra da 224 se ela já estiver em `done/`; senão, o diff atual, e isso fica registrado
  no fecho.

## Fora de Escopo

Pontos em aberto (235), material de fora (236), publicar (237). Coedição ao vivo. Imagens.

## Dependências

232, 233. Apresentação por palavra do diff: 224 (desejável, não bloqueia).

## Riscos e Mitigação

Prompt novo precisa de revisão do autor (a qualidade da escrita depende dele). A chave de conversa do plano não pode colidir com
`<usuarioId>-<data>` nem vazar nas listagens de "conversas do dia".

## Pontos em aberto (o autor confirma ao abrir a task)

- Nível analítico de cada um dos quatro prompts; formato da chave de conversa do plano.
