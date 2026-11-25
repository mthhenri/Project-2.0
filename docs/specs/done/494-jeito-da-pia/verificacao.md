# Verificação — task 494

Data: 2026-11-25. Stack isolado com IA de mentira.

- Testes das funções puras e da service (a instrução entra com sorteio abaixo de 5% e não entra acima).
- Ao vivo: 8 menções sozinhas num grupo levaram ao provedor frases diferentes da lista na orientação.
- Modelo real (chave da Anthropic do ambiente, pelo app, sorteio fixado só na verificação): a frase sai literal; com
  assunto, a oferta sobre ele aparece; a variação de tom aparece na saudação e no pedido, com os dados corretos.

## Limites

- Amostra pequena; o texto é do modelo e varia. Ele costuma tirar a pergunta genérica quando há assunto, mas nem
  sempre (uma vez em cinco na última rodada).
