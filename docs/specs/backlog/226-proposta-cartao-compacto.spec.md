# 226-proposta-cartao-compacto.spec.md

> Task 3/8 (fase 3) da guarda-chuva [`chat-propostas.spec.md`](chat-propostas.spec.md): cartão compacto para mudança pequena e a linha de
> "feito" depois de confirmar. Origem: `IDEAS.md` I-026; antes e depois no canvas privado de
> [`chat-propostas/referencias.md`](chat-propostas/referencias.md).

## Objetivo

Mudança pequena ocupa uma linha no chat, em vez de um cartão grande, e o cartão confirmado vira uma linha verde com Desfazer.

## Entregáveis

1. **Cartão compacto** em `frontend/src/app/modules/chat/components/proposta-cartao/`: uma linha com ação, nome, chips de antes → depois e
   os botões ✓ (confirmar), lápis (ajustar) e × (recusar), todos com `pTooltip`.
2. **Regra de quando é compacto**, pura e testada (padrão da guarda-chuva): texto longo ou **mais de três campos** ficam no cartão
   grande. O limite de "texto longo" é um valor a confirmar com o autor ao abrir a task (**ponto em aberto**).
3. **Linha de "feito"**: depois de confirmar, sobra uma linha verde com **Desfazer** (reaproveita o prazo de 30 min e
   `shared/src/utils/prazo-para-desfazer-proposta.ts`; passado o prazo, a linha fica sem o botão).
4. O diff por palavra da 224 aparece no cartão grande (e no compacto, só quando couber em uma linha; senão o cartão é grande).
5. Todos os 16 tipos de hoje passam pela regra; conferir cada um no teste.

## Critérios de Aceite

- Testes: regra de compactação (por tipo, limite de campos, texto longo) e spec do `proposta-cartao` (compacto, grande, confirmado com
  Desfazer, prazo vencido, recusado, expirado).
- Verificação ao vivo com propostas reais de tipos pequenos e grandes, em 1920×1080, 1366×768 e 1080×1920, tema claro e escuro,
  comparando com o cartão atual e com o canvas; estados: pendente, carregando, confirmado, desfeito, erro.
- Builds e testes de `frontend` sem regressão.

## Fora de Escopo

- Grupo de propostas e "Confirmar todas" (227); autonomia e a linha azul de "faz e avisa" (228).
- Mudar o que cada proposta faz ou suas permissões.

## Dependências

224 (diff por palavra) e 225 (cartão sem recriar). Aplicar `gerenciamento-de-impacto` ao cartão compartilhado.

## Riscos e Mitigação

- Esconder informação que o usuário precisava ver antes de confirmar. Mitigação: a regra manda para o cartão grande na dúvida, e o lápis
  abre o detalhe.
