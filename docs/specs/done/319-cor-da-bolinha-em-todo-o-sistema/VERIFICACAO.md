# 319 — Verificação

Data: 2026-11-10. App real: backend e frontend de desenvolvimento, PostgreSQL 16 local (porta 5433), seed de desenvolvimento.

## Cenário

- `gestor.inicial` com cor `#B91C1C` (vermelho) e `dev.teste` com `#1E3A8A` (azul).
- Uma execução aberta do desenvolvedor na atividade "Montar o formulário" (pelo `POST /api/v1/execucao`).
- Navegação como gestor, login pela tela (o que também grava o usuário lembrado).

## Telas percorridas (Playwright, Chromium) e resultado

| Tela | O que se viu |
|---|---|
| Barra de cima (todas as telas) | bolinha vermelha com "GI" |
| Atividades (listagem, gestor) | coluna Usuário com a bolinha azul "DD" |
| Atividade (detalhe) | executor no cabeçalho e execuções recentes em azul |
| Usuários | cartão de cada pessoa na sua cor |
| Ponto (equipe, hoje) | cartão de cada pessoa na sua cor |
| Execuções | "Em andamento agora" com a bolinha azul |
| Demandas, Árvore | membro "Dev de Teste" na cor própria |
| Demandas, Controle de horas | "Executando agora" na cor própria |
| Login (usuário lembrado) | bolinha vermelha (antes da correção saía azul; ver HISTORY) |

Formatos: 1920×1080, 1366×768, 1080×1920, 720×1280 e 960×1080, cada um nos temas claro e escuro. Sem texto cortado nem sobreposição nas bolinhas; a barra lateral recolhe como antes no 720×1280.

## Diálogo "Cor da minha bolinha" (ajuste do mesmo dia)

Aberto pelo perfil da barra de cima nos cinco formatos e nos dois temas: seletor, "No chat" (4 prévias) e "No resto do sistema" (6 prévias) lado a lado a partir de 960px; em 720×1280 o diálogo vira coluna e rola. Todas as bolinhas da pessoa mudam com a cor em escolha.

## Limites

- Não percorridos ao vivo: diálogos de iniciar, registrar e encerrar execução, painel de atividades dentro da demanda aberta e a lista de membros da demanda; só cobertos por build e testes de componente (o diálogo de iniciar e o de registrar usam o mesmo componente e o mesmo mapeamento da listagem).
- Gestor sem cor escolhida não foi capturado ao vivo (coberto por teste de componente: sem estilo próprio, vale o acento do tema).
- Evidência bruta em `.artifacts/319/` (ignorada pelo Git).
