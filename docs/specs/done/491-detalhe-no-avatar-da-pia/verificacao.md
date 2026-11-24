# Verificação — task 491

Data: 2026-11-24. Branch `claude/stoic-shannon-c8w7xi`, app real rodando a partir do checkout da branch.

## Gates

| Gate | Resultado |
|---|---|
| `npm run test --workspace=frontend` | 243 arquivos, 2984 testes, 0 falha (12 novos: regra dos toques, serviço e diretiva) |
| `npm run build --workspace=frontend` | sem erro; os avisos de orçamento são os de antes |
| `npm run lint:tudo` | 0 erro |

Na primeira montagem a animação ficou no `chat.page.scss` e o build parou no orçamento de erro (8 kB, passou por 240 bytes);
ela foi para uma classe global em `styles.scss` (`app-pia-cantando`).

## Ao vivo

`AudioContext` instrumentado no Playwright (conta os osciladores iniciados; o som não é ouvido na verificação). Chat da IA
com uma mensagem da IA, 5 formatos (`1920×1080`, `1366×768`, `1080×1920`, `720×1280`, `960×1080`) × 2 temas, sem erro de
página. Em todas as 10 combinações:

- 4 toques: 0 osciladores; 5 toques com 600 ms entre eles: 0.
- 5 toques rápidos (80 ms): 4 osciladores (três partes e a segunda voz), o avatar ganha `app-pia-cantando` e a perde quando
  o som termina.
- 5 toques rápidos no avatar do check-in: 0 (só o chat da IA tem a diretiva).
- Layout do chat igual ao de antes (capturas em `.artifacts/491-detalhe-no-avatar-da-pia/`, fora do Git).

## Limites

O som em si foi conferido na prévia (o que o navegador gera, espectrograma contra a referência), não nesta verificação.
