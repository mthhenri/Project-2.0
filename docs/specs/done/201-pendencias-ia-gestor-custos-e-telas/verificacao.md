# Verificação — task 201

Data: 2026-10-20. Ambiente: PostgreSQL 16 local na 5433 (sem Docker), backend `ts-node` na 3000, Angular dev na 4200, Playwright/Chromium; `CHAT_ARMAZENAMENTO=postgres`.
Capturas em `.artifacts/201/` (ignorada pelo Git). Usuários: `gestor.inicial` (administrador) e `dev.teste`, com uma execução em andamento de 2 h, outra encerrada no mesmo dia e 38 linhas de `ia_uso`.

## Resultado

| Item | Resultado |
|---|---|
| 5 — overlay | **Controle:** salvar a cor de uma prioridade (PATCH sem feedback próprio, resposta atrasada em 1,5 s) liga o overlay (`app-loading-spinner` com conteúdo). **Alvo:** salvar o preço de um modelo (PUT atrasado) e o autosave do pad (`PUT /anotacao` atrasado em 2,5 s, texto gravado no banco) não ligam. Confirmar proposta: coberto por teste (`proposta-ia.service.spec.ts`: as quatro chamadas levam `SEM_OVERLAY_GLOBAL` e `ERRO_TRATADO_PELA_TELA`); **ao vivo não** exercitado porque a IA está desligada neste ambiente e não há chave do provedor. |
| 4 — Custos | Conferido nos três viewports (1920×1080, 1366×768, 1080×1920): totais, gráfico por dia, tabela por modelo com preço editável; salvar o preço grava no banco e recarrega. Achados e corrigidos na verificação: eixo do gráfico cortado com sufixo "US$" (saiu para o título); mês em "Outubro De"; cartão de tokens quebrando em duas linhas; tabela estourando o cartão em 1080 px (chamadas passaram para baixo do nome, botões viraram ícone). |
| 3 — Ponto/Execuções | Com uma execução encerrada e uma em andamento, o card de Ponto da equipe alinhava o nome da atividade em colunas diferentes (o cronômetro é mais largo que "05:00 –06:40"): corrigido com grade compartilhada. Medido por 9 s com o cronômetro virando de 09:59:59 para 10:00:00: largura do cronômetro e posição do vizinho constantes em todas as telas. **Não reproduzido:** nenhum tremor ou quebra com os dígitos mudando (Chromium no Linux). Se o defeito que o autor viu for outro, precisa de captura. |
| 2 — Esqueletos | Antes, as tabelas tinham colunas de largura igual e sem rótulo, número de colunas errado (Usuários 6 de 5, Atividades 7 de 9, Execuções 8 de 9) e cartões de 4 por linha onde a tela real tem 2. Depois, as capturas de carregamento de Usuários, Atividades, Execuções e Ponto mostram os rótulos reais e as larguras da tabela final. Projetos não mostra mais "0" nos contadores enquanto carrega. |
| 1 — Conversas dos desenvolvedores | Cobertas por testes (serviço: permissão, só desenvolvedor, só `CHAT`, cortes e limites; ferramentas: só gestor). **Ao vivo não** exercitado: depende da IA no ar. |

## Limites

- `npm run lint` não existe no projeto (P-001); build do backend e do frontend e as suítes inteiras passaram (números no HISTORY).
- Não visto: tema escuro da aba Custos e dos esqueletos (usam os tokens do tema), Calendário e Demandas com o esqueleto novo (Calendário só pelo teste de componente).
- A tabela de Atividades do gestor já passa da largura do conteúdo em 1366 px (1081 de 1030 px) e corta a coluna Ações; defeito anterior, fora desta task.
