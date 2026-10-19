# Task 188 — Nível real e tokens do turno no chat

> Task 1/4 da guarda-chuva [`chat-duvidas-de-codigo.spec.md`](chat-duvidas-de-codigo.spec.md). Corrige `PROBLEMS.md` P-017.

## Objetivo

A resposta do chat grava e mostra o **nível mais alto de IA usado no turno**, contando as chamadas que as ferramentas fazem
por baixo, e soma os tokens dessas chamadas aos da mensagem. Hoje toda resposta sai como "rápido" e os tokens das ferramentas
se perdem.

## Entregáveis

1. **Coleta do turno num ponto só.** Toda chamada a `IaService.gerar`/`transmitir` feita durante um turno do chat (a conversa e
   as ferramentas que ela chama) é registrada no turno com nível, modelo e tokens. A coleta não exige mudar cada ferramenta: um
   único ponto em `IaService` (por exemplo, um contexto de turno com `AsyncLocalStorage` do Node, aberto pelo chat e lido pelo
   `IaService`). Fora de um turno do chat, `IaService` se comporta como hoje.
2. **Nível gravado.** A mensagem da IA grava o maior nível do turno na ordem `RAPIDO < PADRAO < ANALITICO` (regra pura com
   teste) e o `modelo` da chamada desse nível; sem ferramenta que chame a IA, continua `RAPIDO`. Vale para os contextos que usam
   o mesmo laço (chat e check-in) e para a retomada.
3. **Tokens gravados.** `tokensEntrada`, `tokensSaida` e `tokensCache` da mensagem passam a somar também as chamadas das
   ferramentas. Chamada que falhou não soma.
4. **Tela.** O selo do chat (`chat__nivel`) já lê `mensagem.nivel`; conferir que mostra "padrão" e "analítico" quando vierem, sem
   mudança de layout. A sugestão de próximas mensagens (`sugerirProximasMensagens`) não entra na conta do turno.
5. **Documentação.** A seção do chat em `docs/SYSTEM.SPEC.md` diz que o selo é o maior nível do turno; P-017 sai de
   `PROBLEMS.md` e o relato vai a `HISTORY.md`.

## Critérios de Aceite

- Testes de `chat.service`: turno sem ferramenta grava `RAPIDO`; turno em que uma ferramenta chamou o analítico grava
  `ANALITICO` com os tokens somados; ferramenta que falhou não soma; duas ferramentas em níveis diferentes gravam o maior.
- Teste de `IaService` para a coleta: dentro do turno registra, fora não; turnos simultâneos de usuários diferentes não se
  misturam.
- `npm run test --workspace=backend`, `npm run build --workspace=backend` e `npm run build --workspace=frontend` verdes.
- Ao vivo (skill `verify`): pedir no chat algo que use uma ferramenta do analítico (descrever demanda) e ver o selo
  "analítico"; uma conversa simples continua "rápido". Telas em 1920×1080, 1366×768 e 1080×1920.

## Fora de Escopo

- Escalada de nível da conversa em si (`IDEAS.md` I-007).
- Mostrar tokens ou custo na tela.
- Gravar nível e tokens das chamadas de IA fora do chat (relatório, assistente, executores de proposta).

## Dependências

Nenhuma. Fonte de verdade: `rework-chat-ia.spec.md` ("Escolha automática de modelo por nível": "cada resposta exibe o nível
usado").

## Riscos e Mitigação

- **Contexto vazando entre requisições.** O turno é por requisição; o teste de turnos simultâneos é obrigatório.
- **Mudar a assinatura de `IaService` afeta todos os chamadores** (ferramentas, executores, relatório, assistente, prompt):
  aplicar `gerenciamento-de-impacto`; a preferência é não mudar a assinatura pública.
