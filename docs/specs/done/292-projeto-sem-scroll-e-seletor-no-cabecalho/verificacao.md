# Verificação — 292

Em 2026-10-31, stack de desenvolvimento, gestor, projeto "Agenda da Equipe". Frontend: 2393 testes em 192 arquivos, build e `repo:verificar` ok (sem lint, P-001).

Ao vivo, medindo a rolagem da área de conteúdo (`main`: `scrollHeight` contra `clientHeight`):

| Janela | Rolagem | Árvore (altura) |
|---|---|---|
| 1913×917 (a do autor) | nenhuma (851 = 851) | 529 px |
| 1920×1080 | nenhuma (1014 = 1014) | 692 px |
| 1366×768 | nenhuma (702 = 702) | 320 px (o mínimo; a Árvore encosta no rodapé da janela, usando a margem de baixo) |

O seletor aparece abaixo dos botões do cabeçalho em 1920×1080; a troca Demandas / Volume segue funcionando (clique real e `localStorage`).

Limites: 1080×1920 e o tema escuro não foram revisitados nesta alteração; em 1366×768 a Árvore fica baixa (320 px); o desenvolvedor só por teste.
