# 220-mensagem-direta-responder.spec.md

> Pedido do autor em 2026-10-23: responder a uma mensagem específica no chat entre colaboradores (o "responder" do zap). **Rascunho para aprovação:
> mexe em armazenamento e em migration; não foi implementada.**

## Objetivo

Escolher uma mensagem da conversa, escrever a resposta e enviar com a citação dela no balão (autor e trecho), com clique que leva à original.

## Desenho proposto

1. **Dado:** a mensagem ganha `respondeA: { mensagemId, autorUsuarioId, trecho } | null`. O `trecho` é uma cópia do começo do texto (até ~200
   caracteres, sem bloco de código longo), gravada no envio, para a citação continuar legível mesmo quando a original estiver numa página antiga.
   O documento é imutável: o campo entra na gravação, nunca em alteração.
2. **Armazenamento:** campo novo no documento (`mensagem-direta.documento.ts`), no mapeamento do índice (OpenSearch e Elasticsearch, o mesmo
   código em `MensagemDiretaIndiceRepository`), e coluna `resposta_a_mensagem_id`, `resposta_a_autor_usuario_id` e `resposta_a_trecho` na tabela
   provisória `mensagem_direta` (migration `0052`, todas anuláveis, sem `DEFAULT`; **migration nova, nunca editar a `0051`**). A suíte de
   contrato única roda nos três.
3. **API:** `MensagemDiretaEnviarDto.respondeAMensagemId?` (UUID). A service valida que a mensagem existe **nesta conversa** (não aceita id de
   outra) e monta o `respondeA` no servidor; o cliente nunca envia o trecho.
4. **Front:** ação "Responder" em cada balão (ao lado de "Copiar"); o compositor mostra a barra "Respondendo a <nome>: <trecho>" com X para
   cancelar; o balão mostra a citação; clicar nela rola até a original quando carregada.
5. **Aviso:** a menção de resposta não gera aviso extra; a resposta é uma mensagem normal para os avisos.

## Pontos a decidir com o autor

- Citação com o trecho **copiado** (proposto) ou buscada na hora (mais simples, mas some se a original não estiver carregada)?
- A supervisão (task 214) mostra a citação também?

## Critérios de Aceite (a detalhar na aprovação)

Teste de contrato nos três armazenamentos, service (conversa errada recusada), componente (responder, cancelar, citação), verificação ao vivo.
