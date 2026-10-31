# Verificação — 291

Em 2026-10-31, stack de desenvolvimento, gestor, projeto "Agenda da Equipe" (código `DEV-AGENDA`).

- **Testes:** frontend 2393 em 192 arquivos; backend 1587 unitários; builds dos dois ok; `repo:verificar` ok. Sem lint (P-001).
- **Ao vivo (1366×768, claro):** o seletor aparece entre o cabeçalho e o corpo; clicar em Volume mostrou o gráfico anual do projeto (Mensal/Anual, ano, esperado tracejado), escondeu as demandas sem desmontá-las e guardou `VOLUME` no `localStorage`. `GET /api/v1/relatorio/execucao/download?projetoId=3&periodoTipo=MENSAL&ano=2026&mes=10&formato=CSV` respondeu 200 com `filename="dev-agenda-relatorio-2026-10.csv"`.
- **Limites:** o download pelo botão da tela (que grava o arquivo no navegador) não foi acionado, só a resposta da rota; 1920×1080 e 1080×1920 não revisitados nesta alteração; desenvolvedor só por teste.
