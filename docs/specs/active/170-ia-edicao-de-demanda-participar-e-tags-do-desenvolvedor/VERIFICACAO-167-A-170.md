# Verificação ao vivo — tasks 167 a 170 (2026-10-19)

Conversa real com a IA (Anthropic, chave do ambiente de desenvolvimento), a aplicação rodando (backend em `:3000`, frontend em `:4200`) e o banco de dev conferido por SQL depois de cada Confirmar. Feita por Claude a pedido do autor, que ainda não tinha testado.

## Montagem e limpeza

- A IA estava desligada (versão 5 da configuração). Foi ligada pela rota `POST /configuracao-ia` com um administrador de teste (versão 7) e **desligada de novo** no fim (versão 8): o estado final é o de antes.
- Usuários de teste `verif.gestor`, `verif.dev` e `verif.admin`, projeto "VERIF IA" (VIA), quatro demandas, três atividades e duas tags, criados por API. Tudo foi excluído por soft delete ao final; as mensagens do chat desses usuários ficam no índice (o chat nunca apaga mensagem).
- A navegação foi feita em `http://[::1]:4200`, origem separada da sessão real do autor.
- Viewports: 1366×768 em todo o percurso; o chat com cartões também conferido em 1920×1080 e 1080×1920, sem quebra de layout.

## Resultado por task

| Task | Cenário (conversa real) | Cartão | Confirmar no banco | Desfazer |
|---|---|---|---|---|
| 167 | gestor: "conclui a demanda X e muda a previsão para 30/11/2026" | "Status: Planejada → Concluída", "Previsão: sem previsão → 30/11/2026" e o aviso de 2 atividades em aberto | status `CONCLUIDA`, previsão `2026-11-30` | voltou a `PLANEJADA`, sem previsão |
| 168 | gestor: "coloca o Verif Dev na demanda Y e marca a atividade Z com a tag VerifBug" | dois cartões (membro: "Entra na demanda"; tags: antes e depois) | linha em `demanda_usuario` e tag na atividade | não exercitado |
| 169 | gestor: "cria uma atividade para o Verif Dev…", "inicia a atividade … dele" e "pausa a execução do Verif Dev" | linha "Pessoa: Verif Dev" em criar, iniciar e pausar | atividade criada com `usuario_id` do dev; execução da atividade do dev (a do gestor não foi afetada); depois, `fim_data` preenchida | não exercitado |
| 170 | gestor: acrescentar documentação; mover demanda para uma de estrutura. Desenvolvedor: entrar na demanda por id; marcar a própria atividade com tag; sair sendo o único membro | "Acrescenta à documentação" com o texto; "Pai: topo da árvore → Estrutura de relatorios"; membro; tags | documentação acrescentada; `demanda_pai_id` gravado; desenvolvedor na demanda; tag na atividade | mover a partir do topo: aviso claro "desfaça pela tela de Demandas" (como projetado) |

Comportamentos corretos observados: a IA recusou mover para uma demanda de trabalho (só estrutura recebe filha); recusou tirar o **último membro**; o desenvolvedor não recebeu ferramentas de gestor; os botões de próximos passos mudam depois de Confirmar.

## Achados

1. **P-019 (aberto, task 170):** o desenvolvedor só consegue participar de uma demanda nova informando o **id**; por nome a IA diz que não achou, porque a leitura de demandas do projeto só devolve as dele. A spec 170 pede "quero participar da demanda X". Por isso a 170 **continua em `active/`**.
2. **Observações do modelo, sem item próprio:** (a) na mesma conversa, a IA reutilizou uma lista de demandas antiga e só achou a demanda criada depois quando foi mandada consultar de novo; (b) ela afirmou duas vezes que a inclusão de um membro "ainda aguardava confirmação" depois de o cartão já estar confirmado (a confirmação não vira nova mensagem para a IA).
3. **Não reproduzido:** na primeira abertura do chat, o painel de histórico mostrou "Erro interno" uma vez (a rota `GET /chat/conversas` respondeu 200 logo depois e nas aberturas seguintes). Pode ter sido a criação dos índices do OpenSearch; sem causa confirmada.

## Limites

- Desfazer foi exercitado só em 167 e no caso do topo (170); em 168 e 169 só o Confirmar foi visto.
- Sem gestor e desenvolvedor reais: a verificação usou contas de teste.
- O botão "Enviar" (P-018) não foi usado: todas as mensagens foram enviadas com Enter.
- Sem lint no projeto (P-001); nenhum código de produção foi alterado.
