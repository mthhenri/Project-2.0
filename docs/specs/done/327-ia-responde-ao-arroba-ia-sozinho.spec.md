# 327-ia-responde-ao-arroba-ia-sozinho.spec.md

> Task 327, pedido do autor em 2026-11-12 (conversa de trabalho). Sem decisão de modelagem: nenhuma tabela, coluna, DTO nem enum muda.

## Objetivo

Hoje um `@IA` sozinho (sem pedido) não recebe resposta: a IA só espera a próxima mensagem de quem chamou (task 315). Passa a **responder na hora**, como
alguém que foi chamado: um cumprimento curto ("Opa, chamou?") e, olhando a **mensagem anterior** da conversa, "sobre <assunto>, quer que eu faça isso?".
Vale na conversa um a um, no grupo e no canal.

## Decisões

1. **Quem fala é o modelo (nível rápido), sem ferramentas.** A resposta cita o assunto da mensagem anterior, o que exige entendê-la. Sem ferramentas e sem
   proposta: a pergunta só oferece, quem confirma é a pessoa na mensagem seguinte.
2. **A mensagem anterior** é a última mensagem de pessoa antes do `@IA` (de quem chamou ou de outro membro; a da IA e a do sistema não). Sem ela, ou sem nada que a
   IA possa fazer, a resposta só pergunta em que pode ajudar.
3. **A próxima mensagem continua sendo o pedido** (até 10 minutos depois do `@IA`): a resposta da IA ao `@IA` sozinho **não** encerra a espera. A regra pura
   `pedidoPendenteDaIa` passa a enxergar que a resposta da IA a um `@IA` sozinho é a saudação; a resposta a um pedido de verdade continua encerrando.
4. Mesmas travas de sempre: só membro chama, uma chamada por conversa por vez (instância), IA desligada ou fora do ar e falhas viram mensagem do sistema, custo em
   nome de quem chamou, sem menção a ninguém na saudação.

## Entregáveis

1. `shared/src/utils/mensagem-direta-ia.ts`: `pedidoPendenteDaIa` com a regra da decisão 3 (a dica "A IA está esperando o seu pedido" da tela usa a mesma função e
   volta a aparecer depois da saudação, sem mudar a tela).
2. `backend/src/modules/mensagem-direta/domain/mensagem-direta-ia.ts`: `montarOrientacaoDaSaudacao` e `montarPedidoDaSaudacao` (mensagem anterior incluída, cortada).
3. `MensagemDiretaIaService`: `pedidoDaMensagem` devolve `SAUDACAO` para o `@IA` sozinho; `atender` conduz o turno sem ferramentas, com teto de tokens menor, e grava a
   resposta como mensagem `IA` sem propostas.
4. `docs/SYSTEM.SPEC.md` §12 (linha `mensagem-direta`, trecho do `@IA`) atualizado.

## Critérios de Aceite

1. Unitários `shared`: `pedidoPendenteDaIa` (saudação não encerra a espera; resposta a pedido encerra; passou de 10 minutos; outra pessoa no meio).
2. Unitários `backend`: `@IA` sozinho chama o modelo sem ferramentas, com a mensagem anterior no que vai ao modelo, grava a resposta `IA` publicada às pontas, cobra
   o uso; sem mensagem anterior; a mensagem seguinte vira pedido; vale no grupo; IA desligada gera mensagem do sistema.
3. `npm run lint:tudo`, builds de `shared`, `backend` e `frontend`, `npm test`, `npm run repo:verificar` sem erro.
4. Ao vivo (skill `verify`), se houver ambiente com provedor de IA: relatado com os limites na verificação.

## Fora de Escopo

- Nova versão do prompt `CONVERSA` (a orientação nova é fixa no código, como a da 315).
- Responder a `@IA` repetido enquanto há uma resposta em andamento (continua o aviso do sistema).
