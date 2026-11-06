# chat-colaboradores-evolucao.spec.md

> Guarda-chuva da evolução do chat entre colaboradores (tasks 205–221 em `done/`), pedida pelo autor em 2026-11-06. Reserva as tasks **310–317**;
> cada uma ganha o seu `NNN-*.spec.md` ao ser aberta. As decisões abaixo são do autor (respondidas em 2026-11-06 sobre a análise de cada item).

## Tasks e ordem

| Task | O que | Modelagem? | Estado |
|---|---|---|---|
| 310 | Endereço solto vira link (no visualizador de Markdown, vale para todo o sistema) | não | feita (`done/`) |
| 311 | Dois cliques na mensagem respondem a ela | não | feita (`done/`) |
| 312 | Barra de bolinhas: com uma conversa aberta, a lista vira uma coluna de avatares | não | feita (`done/`) |
| 313 | Editar mensagem | sim | reservada |
| 314 | Reações nas mensagens e seletor de emoji | sim | reservada |
| 315 | `@IA` no chat entre colaboradores | sim | reservada, spec própria antes de qualquer código |
| 316 | Cor da bolinha escolhida pela pessoa (só no chat por ora; ideia de baixa prioridade) | sim | reservada, junto com a 317 se o autor confirmar |
| 317 | Volume do aviso do chat de 1 a 5 (3 é o atual) e, depois, escolher o som | sim (preferência do usuário) | pedido em 2026-11-06, a especificar |

## Decisões do autor

**Editar (313).** Só o autor edita, até 1 hora depois do envio. A mensagem editada mostra "editada". O texto original é guardado só para a
supervisão (gestor e administrador não perdem a auditoria); o contrato de armazenamento ganha o método de alterar mensagem nas três
implementações (OpenSearch, Elasticsearch, PostgreSQL).

**Reações (314).** Ficam numa tabela do PostgreSQL (mensagem, usuário, emoji), não no documento da mensagem; falta ver como a consulta junta
as reações às mensagens do índice no OpenSearch/Elasticsearch. Uma reação por pessoa por mensagem. O autor da mensagem recebe um aviso:
"<PESSOA> reagiu à sua mensagem com <EMOJI>". O seletor de emoji para escrever é independente das reações.

**`@IA` (315).** A IA atende só quem a chamou e só ao pedido dessa pessoa (a mensagem atual ou a seguinte), e executa **uma** ação por chamada. A
resposta aparece para as duas pessoas da conversa; quem não tem acesso ao que a IA fez vê "Ação oculta por falta de acesso". Vale o fluxo de
propostas já existente (cartões, Aceitar/Descartar), com as mesmas permissões do chat da IA, e o custo entra na aba Custos como uso da IA.

**Volume (317).** Pedido: nível de 1 a 5, o 3 é o som de hoje, cada ponto sobe ou desce uma porcentagem do volume; mais tarde, trocar o som.
Perguntas abertas ao autor: onde a preferência vive (a tabela `mensagem_direta_preferencia` já guarda os avisos por usuário, então a
proposta é uma coluna nova nela) e a porcentagem de cada nível.

## Fora de escopo

- Grupos (guarda-chuva `chat-grupos.spec.md`, tasks 246–250).
