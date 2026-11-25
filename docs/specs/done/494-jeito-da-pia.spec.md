# 494-jeito-da-pia.spec.md

> Task solta, decidida pelo autor em 2026-11-25. Discrição como na 491: os commits citam apenas "jeito da Piá".

## Objetivo

Dar variação às falas da Piá no chat entre colaboradores (um a um, grupos e canais).

## Entregáveis

1. **Saudação** (menção sozinha): a Piá abre com uma frase sorteada de uma lista no código (`SAUDACOES_DA_PIA`), com as
   frases do autor e as da implementação. Havendo assunto na mensagem anterior, a oferta sobre ele substitui a pergunta
   genérica da frase.
2. **Variação ocasional de tom:** a definida em `montarOrientacaoDoJeito`, com a chance de `CHANCE_DO_JEITO_CURITIBANO`.
3. Ela vale **só para o texto da resposta**: o que vai nas ferramentas sai como sempre.
4. Chat da IA, plano e check-in não mudam.

## Critérios de Aceite

- Testes das funções puras e da service.
- `npm run test --workspace=backend`, build e `npm run lint:tudo` sem erros.
- Ao vivo: a orientação enviada ao provedor traz a frase sorteada.

## Fora de Escopo

- Configuração em tela, mudança de modelo ou de custo.
