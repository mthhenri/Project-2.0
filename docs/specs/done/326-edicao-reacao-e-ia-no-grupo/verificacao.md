# Verificação da task 326 — edição, reação e `@IA` no grupo

Data: 2026-11-12. Spec: `../326-edicao-reacao-e-ia-no-grupo.spec.md`. Capturas e saídas brutas em `.artifacts/326-edicao-reacao-e-ia-no-grupo/` (ignorada pelo Git).

## Testes

| Gate | Resultado |
|---|---|
| `shared` | 356 testes, 0 falhas (novos: `GrupoMensagemEditarDto` e `GrupoMensagemReagirDto`, incluindo "o grupo vem da rota, não do corpo") |
| `backend` unitários | 1792, 0 falhas (novos: orientação do grupo, a IA no grupo — só membro chama, 30 mensagens, membros do fim do turno, canal, `@IA` sozinho entre membros, custo `@IA no grupo` —, resposta da IA no documento do grupo, as três rotas novas) |
| `npm run test:integracao` (PostgreSQL 16 local) | 527, 0 falhas (novos: edição, reação, `@IA` e proposta no `GrupoService` com banco real; reação de grupo no repository; `CHECK` de dono; suíte de contrato gravando a resposta da IA no grupo) |
| `frontend` (Vitest) | 237 arquivos, 2872 testes, 0 falhas (novo spec de componente da conversa do grupo, 16 testes: menu, edição, PATCH, reação, PUT, eventos, leitura por tipo, resposta da IA, "Ação oculta", "IA digitando…", opção IA no `@`, dica do `@IA` sozinho) |
| `desktop` / `repo:test` | 49 / 51 (1 `todo`/ignorado como antes), 0 falhas |
| `npm run lint:tudo` | zero erros |
| `npm run repo:verificar` | aprovado |
| Builds `backend` e `frontend` | sem erro (avisos de orçamento de SCSS preexistentes) |

Migration `0090`: aplicada no banco de teste (90 migrations) e o `DOWN` e o `UP` rodados em transação sobre ela, sem erro.

## Ao vivo (skill `verify`)

Stack real: PostgreSQL 16 local, API (`CHAT_ARMAZENAMENTO=postgres`), `ng serve`, Playwright com **três sessões** (administrador "Gestor Inicial", desenvolvedor "Dev de Teste" com acesso à demanda 2 e desenvolvedor "Davi Souza" sem acesso). A IA foi um **servidor falso da API de mensagens da Anthropic** (`ANTHROPIC_BASE_URL`): responde com texto e, para "cria uma atividade", com uma chamada de ferramenta `propor_criar_atividade` na demanda 2. Isso prova a fiação (laço de ferramentas, proposta, permissão, custo), não a qualidade da resposta de um modelo real.

23 verificações por rodada, em **cada um dos cinco formatos** (1920×1080, 1366×768, 1080×1920, 720×1280, 960×1080) e **nos dois temas** — 10 rodadas, **todas 23/23** (as rodadas claras de 1920, 1366, 1080×1920 e 720×1280 foram refeitas depois da correção abaixo):

- A mensagem do gestor chega aos dois membros; reação do desenvolvedor (menu → Reagir → atalho) aparece nas três telas; a segunda reação mostra a contagem 2 ao autor em tempo real; clicar na própria pílula remove.
- Editar: o autor tem "Editar"; a barra "Editando mensagem" aparece; o texto novo e "editada" chegam aos três **sem recarregar** (sentinela viva); os outros membros não têm "Editar" na mensagem do gestor.
- `@IA` com pedido: "IA digitando" para os outros membros; a resposta chega às três telas; quem chamou vê o cartão (a autonomia padrão de criar atividade é "Faz e avisa": "Feito pela IA" com **Desfazer**), o desenvolvedor com acesso vê o cartão só leitura e o sem acesso vê "Ação oculta por falta de acesso"; as ações só existem para quem chamou.
- `@IA` sozinho: a dica "A IA está esperando o seu pedido" só para quem chamou; a mensagem seguinte é atendida.
- Canal da demanda (API + captura): a orientação enviada ao modelo traz "chat da demanda 'Tela de login'" e o desenvolvedor sem acesso recebe 403 ao ler e ao escrever `@IA` no canal.
- Custo: a aba Custos (mensagens `USO_DE_IA`) mostra "@IA no grupo" em nome de **quem chamou** (usuário 1 nas chamadas do gestor, 2 na do desenvolvedor).
- IA desligada: a mensagem do sistema "A IA não pôde responder: a IA está desligada." entra no grupo.
- Comparação visual com o análogo (a conversa um a um: mesma faixa de reações, pílulas, balão da IA e barra de edição): sem divergência.

### Achados na verificação

- **Dica do `@IA` sozinho demorava até 30 s** (falhou em 1366×768, 1080×1920 e 720×1280 antes da correção). Causa: a regra pura recusa idade negativa e o relógio da dica só batia a cada 30 s; além disso a data do servidor chega alguns ms depois da local. Corrigido no componente do grupo (o "agora" nunca fica antes da mensagem mais recente) com teste; o **mesmo defeito na conversa um a um** (task 315) ficou registrado em `PROBLEMS.md` P-088, sem mexer na 315.
- Dois testes antigos codificavam a regra de antes (sem reação em grupo; IA recusada no armazenamento do grupo): atualizados para a regra nova.

## Limites (o que não foi verificado)

- **Provedor real de IA:** não houve chave; a IA foi simulada. O que o modelo escreve de fato no grupo (e se respeita a orientação de não expor dados) só se vê com um provedor real.
- **OpenSearch e Elasticsearch reais** (`CHAT_INTEGRACAO=1`) não rodaram; a mensagem da IA no grupo foi provada na suíte de contrato do PostgreSQL e nos dublês de cliente dos índices (o documento é o mesmo da 315).
- **Project Desktop (Electron real)** não foi exercitado; a janela de chat é a mesma página `/chat-popup`, mas a notificação do sistema para reação e para a resposta da IA no grupo não foi vista.
- **A supervisão do grupo** (`/supervisao-chat`) não foi aberta ao vivo: o template é o mesmo que já mostra a resposta da IA na conversa um a um, e o `GrupoSupervisaoService` não mudou.
- **Duas instâncias da API:** a trava de "uma chamada por conversa" continua por instância (fora de escopo, como na 315).
- O gestor que só **lê** o canal por tipo (sem ser membro) não reage, não edita e não chama a IA: coberto por teste de componente e de service, não visto ao vivo.
