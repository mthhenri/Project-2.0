# Verificação das tasks 327 e 328 — saudação do `@IA` sozinho e menções da IA

Data: 2026-11-12. Specs: `../327-ia-responde-ao-arroba-ia-sozinho.spec.md` e `../328-ia-menciona-pessoas-e-todos.spec.md`. Capturas e saídas brutas em `.artifacts/327-328/` (ignorada pelo Git). A 328 não tem relatório próprio: este cobre as duas.

## Testes

| Gate | Resultado |
|---|---|
| `shared` (`mensagem-direta-ia.test.ts`) | 15 testes, 0 falhas (novos: saudação não encerra a espera, pedido depois da saudação encerra, prazo; `mencoesNoTextoDaIa` com nome completo, primeiro nome único e ambíguo, mais longo vence, `@todos`, código, e-mail, quem não é da conversa, `@IA`) |
| `backend` unitários | 1803, 0 falhas (novos no serviço da IA: saudação sem ferramentas e com a mensagem anterior, sem mensagem anterior, saudação não marca, pedido depois da saudação, grupo, orientação com a lista de nomes, menções de `@Nome` e `@todos`, quem saiu no meio do turno; no domínio: orientação e pedido da saudação) |
| `frontend` (Vitest, specs do módulo `mensagem-direta`) | 33 arquivos, 365 testes, 0 falhas (novos: o balão da IA destaca a menção e, sem `destaques`, não destaca nada) |
| `npm test` na raiz | `shared`, `backend`, `desktop` e scripts, 0 falhas |
| `npm run lint:tudo` | zero erros (um erro de nome curto no `sort` foi corrigido) |
| Builds `backend` e `frontend` | sem erro (avisos de orçamento de bundle e de SCSS preexistentes) |

Não rodei `npm run test:integracao`: nenhuma tabela, coluna, migration nem repository mudou (as menções usam a coluna `mencoes` que a mensagem já tinha, gravada pelo armazenamento sem alteração).

## Ao vivo (skill `verify`)

Stack real: PostgreSQL 16 local (`/tmp/pgdata`, porta 5433), API com `CHAT_ARMAZENAMENTO=postgres`, `ng serve` e Playwright com **duas sessões** (Ana, que chama a IA, e Davi, que lê). A IA foi um **servidor falso da API de mensagens da Anthropic** (`ANTHROPIC_BASE_URL`): ele devolve a saudação lendo o assunto da mensagem anterior no que o servidor enviou, e um texto com `@Davi Souza` ou `@todos` conforme o pedido. Isso prova a fiação, não o que um modelo real escreveria.

9 verificações por rodada, nos **cinco formatos** (1920×1080, 1366×768, 1080×1920, 720×1280, 960×1080) e nos dois temas (o escuro ligado de verdade pela chave `tema` do `localStorage`, conferido pela classe `app-escuro` no `<html>`; as rodadas claras de 1920, 1366 e 1080×1920 foram feitas antes dessa conferência, e o claro é o tema padrão): **todas passaram**.

- **Um a um:** Davi pergunta "Dá para criar a atividade de revisão do cadastro?"; Ana escreve só `@IA`; a IA responde na hora "Opa, chamou? Sobre “Dá para criar a atividade de revisão do cadastro”, quer que eu faça isso?" (o servidor falso registrou a chamada com **0 ferramentas**). A dica "A IA está esperando o seu pedido" aparece. A mensagem seguinte ("avisa o Davi que a revisão está pronta") é atendida como pedido; a resposta traz `@Davi Souza` **destacado**, o Davi a vê destacada na tela dele, e a linha gravada tem `mencoes = {3}` e `chamada_por_usuario_id = 2`.
- **Grupo ("Time", 4 membros):** `@IA` sozinho da Ana responde "Sobre “Quem pega o ajuste do relatório mensal”…" (a pergunta da Carla) para todos os membros; "chama todo mundo para a reunião das 15h" gera `@todos: reunião às 15h…` destacado, com `mencoes = {1,3,4}` (todos os membros **menos a Ana**, que chamou).
- A saudação grava `mencoes = {}` e sem propostas.
- Comparação com o análogo (a conversa um a um e o grupo já existentes: mesmo balão da IA, mesmo chip de menção das mensagens de pessoas): sem divergência.

### Achados do roteiro (não do sistema)

- O Esc para fechar a lista do `@` só pode ser enviado quando o texto termina em `@palavra`; nas outras mensagens ele fecha o popup. O Enter com a lista aberta escolhe a sugestão em vez de enviar.
- A primeira leva das rodadas "escuras" saiu clara: o tema do app é a chave `tema` do `localStorage`, não o `prefers-color-scheme`. As rodadas foram refeitas com a conferência do `<html>`. (Entrou na skill `verify`.)

## Cor da menção e malha do grupo (pedidos do autor, mesmo dia)

Nova rodada ao vivo (Ana roxo `#A23FD4`, Davi laranja `#F7931E`, Carla azul `#3F6FD0`), 7 verificações por rodada, **5 formatos × 2 temas, todas passaram**: "Ei, @Davi Souza e @Carla Dias, vocês fizeram aquela demanda?" mostra cada menção na cor da bolinha da pessoa (`--destaque-cor` conferido e cores de texto diferentes); a resposta da IA marca `@Davi Souza` em laranja; o avatar do grupo é a malha com 3 manchas do mesmo raio e a cor média por baixo. Frontend: 683 testes (módulo `mensagem-direta` e componentes compartilhados), 0 falhas. Limite: a legibilidade de cores muito claras (amarelo) foi pensada (texto misturado com o do tema) e não vista ao vivo.

## Limites (o que não foi verificado)

- **Provedor real de IA:** não houve chave. Se o modelo real segue a orientação (cumprimentar com o assunto certo, não fazer nada ainda, só marcar quando quem chamou pede, nunca por mensagem anterior) só se vê com um provedor real. A orientação é fixa no código e coberta por teste; a obediência é do modelo.
- **Aviso ao marcado:** a notificação ("mencionaVoce", furar o silêncio do chat) usa o campo `mencoes` que agora vem preenchido e a lógica que já existia para mensagens de pessoas; o que foi provado ao vivo é o campo gravado e o destaque, não o cartão de aviso nem a notificação do Windows (Project Desktop não exercitado).
- **OpenSearch e Elasticsearch reais:** só o armazenamento PostgreSQL rodou ao vivo; o documento da resposta da IA é o mesmo da 315 e 326 (o campo `mencoes` já existia).
- **Canal de demanda/projeto e conversa com mais de um tipo de leitor:** não vistos ao vivo; é o mesmo caminho do grupo, coberto por teste de serviço.
- **Contenção contra abuso de `@todos`:** é a orientação ao modelo mais a regra "só quem está na conversa"; não há limite por hora (fora de escopo da 328).
