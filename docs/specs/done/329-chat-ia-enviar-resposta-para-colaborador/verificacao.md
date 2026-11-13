# 329 — Verificação

Task 329: botão "Enviar para colaborador" no Chat IA. Evidências brutas em `.artifacts/329-chat-ia-enviar-resposta-para-colaborador/` (ignorada pelo Git).

## Testes e gates (rodados nesta tarefa)

| Gate | Resultado |
|---|---|
| `shared` (`node:test`) | 362 de 362; novo: `destinoDaRespostaDaIaValido` |
| `backend` (unitários) | 1809 testes; os da 329 passam (7 cenários na service, 1 no controller); o teste de rotas do controller foi atualizado (19 rotas) |
| `frontend` (Vitest) | 238 arquivos aprovados, inclusive o spec novo do diálogo (6 testes) |
| `desktop` / `repo:test` | 49 e 50 aprovados |
| `npm run lint:tudo` | zero erros (Prettier aplicado só nos dois HTML alterados) |
| `build` backend e frontend | compilam; os avisos de orçamento de SCSS são preexistentes |
| Integração (`test:integracao`) | **não rodada**: nenhum repository mudou |

## Ao vivo (PostgreSQL 16 local, `CHAT_ARMAZENAMENTO=postgres`, seed de desenvolvimento)

Cenário: `dev.teste` com uma resposta da IA gravada direto em `chat_mensagem` (sem provedor de IA); destinatário `gestor.inicial`.

- Botão com o ícone de envio aparece ao lado de "Copiar" ao passar o mouse na resposta; o diálogo lista as pessoas, marca a escolhida, aceita nota e só habilita "Enviar" com destino.
- Enviar grava em `mensagem_direta` duas linhas na conversa `1-2`: a nota (`USUARIO`, autor 2) e depois a resposta (`IA`, sem autor, `chamada_por_usuario_id = 2`).
- O destinatário recebe o contador no topo, a lista mostra "IA: Valide o CPF…" e a conversa mostra a nota e a bolha da IA com o rótulo `IA · para Dev de Teste`.
- Diálogo conferido em 1920×1080, 1366×768 (claro e escuro), 1080×1920, 720×1280 e 960×1080; olhados pessoalmente 1920×1080, 1366×768 (claro e escuro) e 720×1280.

## Limites e pendências

- **Grupo e canal não foram exercitados ao vivo** (o seed só tem dois usuários); a rota e a service do grupo têm teste unitário do repasse, e o ramo do grupo só é coberto por leitura de código (reaproveita `carregarContexto`, `entrarNoCanal` e `enviarMensagem`). Fica aberto para o autor conferir com um grupo real.
- **Estados de erro e de carregando** foram provados nos testes de componente, não ao vivo.
- **Rótulo:** sem coluna nova, a mensagem encaminhada aparece como `IA · para <remetente>`, igual a uma resposta ao `@IA`. Decisão do autor (2026-11-13); um selo "enviada por" pediria a coluna.
- Resposta de mais de 10 000 caracteres é recusada com mensagem clara (o limite da mensagem do chat).
