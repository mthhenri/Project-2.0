# 490-mencao-pia-junto-de-ia.spec.md

> Task solta, decidida pelo autor em 2026-11-24 junto da identidade da Piá (task 489).

## Objetivo

Nos grupos e canais do chat entre colaboradores, a IA passa a ser chamada por `@PIA` (a forma que o app mostra e
sugere), sem deixar de atender `@IA`. Quem digita `@Piá` ou `@Pia` também chama.

## Entregáveis

1. O reconhecimento da menção à IA aceita `@PIA`, `@Piá`, `@Pia` e `@IA` (sem diferenciar maiúsculas), no backend e no
   frontend, pela mesma regra pura (no `shared`, se hoje ela estiver duplicada).
2. A sugestão do `@` no compositor oferece `@PIA`, com o ícone da Piá (brilho Araucária, task 489).
3. O destaque de todas as grafias no texto da mensagem usa o ícone e a cor da Piá (task 489).
4. Os textos que ensinam a chamar a IA citam `@PIA`.

## Critérios de Aceite

- Teste da regra pura com as quatro grafias, com pontuação depois e no meio de frase; `@Piaui` e `@Piauí` não chamam.
- Verificação ao vivo: `@PIA`, `@Piá`, `@Pia` e `@IA` chamam a IA num grupo; o destaque sai em Araucária.

## Fora de Escopo

- Trocar "IA" por "Piá" nos demais textos do app (nome e artigo em aberto).
- As logos (task 489).

## Dependências

- Task 489 em `done/`.
- `docs/SYSTEM.SPEC.md` §12, linha `mensagem-direta` (regras do `@IA`), tasks 326–328.
