# 329-chat-ia-enviar-resposta-para-colaborador.spec.md

> Task 329, pedido do autor em 2026-11-13 (conversa de trabalho). **Decisão de modelagem do autor (2026-11-13):** reaproveitar `autor = IA` de
> `mensagem_direta` (task 315), com `chamada_por_usuario_id` = quem enviou. Nenhuma coluna, migration nem enum novos. Contrato novo: um DTO de entrada
> (ver Entregáveis), a confirmar na leitura de `project20-dto-conventions`.

## Objetivo

No Chat IA (conversa da pessoa com a IA), cada resposta da IA ganha o botão **"Enviar para colaborador"**. Ele abre um seletor de destino (pessoa, grupo ou
canal) e uma **nota opcional**; ao confirmar, a resposta chega ao chat entre colaboradores como mensagem da IA, identificada como "Resposta da IA, enviada
por <remetente>".

## Decisões

1. **Marcação:** a mensagem entregue é `autor = IA`, sem `autor_usuario_id`, com `chamada_por_usuario_id` = o remetente (que participa da conversa de destino).
   Sem `proposta_ids` (proposta da IA não é encaminhada; só o texto).
2. **O servidor lê a resposta, o cliente não a envia.** O pedido leva só o id da mensagem do Chat IA; o servidor busca a mensagem, confere que é uma resposta
   `IA` de uma conversa **do próprio remetente** e copia o texto. Isso impede forjar "resposta da IA" com texto arbitrário.
3. **Nota opcional:** vira uma mensagem comum do remetente (`autor = USUARIO`), enviada **antes** da resposta, na mesma conversa. Sem nota, só a resposta vai.
4. **Destino:** os mesmos de hoje — pessoa (conversa um a um), grupo livre, canal de projeto ou de demanda — com as mesmas travas de participação, grupo
   arquivado e limites que o envio normal já aplica. O seletor reaproveita o de "nova conversa" do popup do chat.
5. **Idempotência:** `mensagemId` (UUID v4) vem do cliente, como no envio normal; reenviar não duplica. A nota usa um UUID derivado/segundo informado.
6. **Menções e custo:** o texto da resposta é copiado sem gerar menções novas; não há chamada ao modelo, logo não há custo de IA.
7. **Não vira cartão de proposta:** a mensagem entregue é texto Markdown puro.

## Entregáveis

1. `shared`: DTO de entrada (nome pela skill `project20-dto-conventions`, p.ex. `MensagemDiretaRespostaIaEnviarDto`: `chatMensagemId`, destino — pessoa **ou**
   grupo, exclusivos —, `mensagemId`, `nota?`) e validador do destino exclusivo; saída reaproveita `MensagemDiretaEnviadaDto`.
2. `backend`: rota em `/api/v1/mensagem-direta` (controller fino) e método na `MensagemDiretaService` que valida a resposta de origem, o destino e grava a(s)
   mensagem(ns) pelo caminho de envio existente, publicando às pontas como hoje. Sem SQL novo se o repositório do Chat IA já expõe a leitura por id; senão, uma
   leitura no repository, com `is_deleted = false`.
3. `frontend`: botão "Enviar para colaborador" na resposta da IA do Chat IA (componente já existente de mensagem da IA), diálogo/painel com seletor de destino e
   nota, estados carregando e erro, confirmação ao enviar. Tela análoga: o seletor de "nova conversa" do popup do chat. A mensagem entregue usa a bolha `IA` que já existe,
   com o rótulo de sempre `IA · para <nome de quem enviou>` (para quem enviou, `IA · para você`). **Limite conhecido da decisão de modelagem:** sem coluna
   nova, o encaminhamento é indistinguível de uma resposta ao `@IA`; se o autor quiser um selo próprio ("enviada por"), isso pede a coluna (opção descartada em 2026-11-13).
4. `docs/SYSTEM.SPEC.md` §12 (linha `mensagem-direta`) com a regra nova; `docs/SCHEMA.md` só ganha a observação de que `chamada_por_usuario_id` também vale
   para o encaminhamento.

## Critérios de Aceite

1. Unitários `backend`: envia a um colega, a grupo e a canal; recusa mensagem que não é `IA`, de conversa de outra pessoa, inexistente ou excluída; recusa
   destino sem participação; nota opcional vira mensagem anterior do remetente; reenvio com o mesmo `mensagemId` não duplica; texto copiado é o do servidor
   mesmo que o cliente tente outro.
2. Unitários `shared` para o validador do destino exclusivo.
3. Teste de componente do botão e do seletor (estados vazio, carregando, erro, sucesso).
4. `npm run lint:tudo`, builds de `shared`, `backend` e `frontend`, `npm test`, `npm run test:integracao` (se o repository mudar) e `npm run repo:verificar`
   sem erro.
5. Ao vivo (skill `verify`), nos cinco formatos de desktop, temas claro e escuro: enviar a um colega, a um grupo, com e sem nota; abrir como o destinatário e
   conferir o selo. Relatório em `docs/specs/<estado>/329-.../verificacao.md`.

## Fora de Escopo

- Encaminhar a resposta de um colega, ou a IA do chat entre colaboradores, para outro lugar.
- Editar o texto da resposta antes de enviar (a nota cobre o comentário).
- Encaminhar propostas da IA como cartões acionáveis.
