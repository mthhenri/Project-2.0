# Verificação ao vivo — tasks 330, 331, 332, 333, 334 e 340 (e a prioridade da listagem de atividades)

Data: 2026-11-19. Aplicação real: backend NestJS em `:3000`, SPA em `:4200` pelo proxy (`/api/v1/execucao/ativa` respondeu `application/json`), PostgreSQL 16 local com as 90 migrations, `CHAT_ARMAZENAMENTO=postgres`, IA ligada (`NO_AR`, sem chave: só o estado importa). Navegador: Chromium do Playwright (`/opt/node-tools`), viewport `1920×1080`, tema claro. Tempo (60 s, 3 min, 30 s) avançado com `page.clock`; requisições contadas por `page.on('request')`.

Cenário por API: `gestor.live` (gestor), `dev.live` (desenvolvedor), projeto, demanda e atividade; para o check-in, uma execução iniciada pela API com `inicio_data` 2 h atrás.

## Resultado

| Task | Critério | Resultado |
|---|---|---|
| Prioridade | trocar a prioridade na linha recarrega a listagem | `PUT /atividade/1` seguido de `GET /atividade`, sem recarregar a página (sentinela viva) |
| 331 | 3 focos seguidos geram no máximo 1 `GET /execucao/ativa` | 1 |
| 331 | voltar de aba oculta sem execução: 1 `GET /execucao/ativa` e nenhum `GET /checkin/situacao` | 1 e 0 |
| 330 | controle: 3 min visível geram ~3 `GET /ia/disponibilidade` | 3 |
| 330 | 3 min com a aba oculta não geram `GET /ia/disponibilidade` | 0 |
| 330 | ao voltar sai uma | 1 |
| 332 | 2 min com `ia/disponibilidade`, `execucao/ativa` e `usuario/:id` respondendo 500 (e focos): nenhum toast | 0 toasts |
| 332 | contraprova: erro de uma tela pedida pelo usuário (`GET /execucao` com 500 ao abrir Execuções) mostra toast | 1 toast |
| 333 | 2 min com o diálogo do check-in aberto: ~4 `GET /checkin/situacao` (antes ~40) | 4 |
| 333 | execução encerrada por fora é percebida pela rede de segurança | o diálogo fechou em até 45 s |
| 334 | uma consulta de execução por `GET /checkin/situacao` | o log do PostgreSQL mostra 2 instruções: o usuário do token e **uma** `SELECT` de `execucao` com os 3 JOINs; a resposta traz atividade, demanda, projeto e minutos (120) |
| 340 A | gestor rebaixado por fora, sessão aberta: o clique em Usuários dá 403, o menu perde "Usuários" e a tela vai para `/ponto`, sem recarregar | sim (2 reconferências de `GET /usuario/:id`, sentinela viva) |
| 340 B | promovido abre `/usuario` direto com o tipo antigo guardado: fica em `/usuario` | sim |
| 340 B | contraprova: sem o `sessaoConferidaGuard` (arquivo restaurado depois) | cai em `/ponto` |
| 340 C | `GET /usuario/:id` travado na abertura: a casca abre | 3,8 s (teto de 3 s da conferência) |

## Limites

- Só `1920×1080` e tema claro: a verificação é de tráfego e comportamento, não de layout (nenhuma tela mudou de aparência; a única visual é a janelinha do check-in, já existente).
- Project Desktop (Electron) não foi exercitado: o ramo `ProjectDesktopService.oculto` das tasks 330 e 333 só tem teste de componente.
- Task 487 (processo principal do Desktop) segue pendente e fora desta rodada.
- O "antes" do 334 (COUNT, SUM e SELECT da listagem) vem da leitura do código da spec, não foi medido de novo.
- Capturas em `.artifacts/revisao-requisicoes-e-permissoes-correcoes/` (ignorada pelo Git).
