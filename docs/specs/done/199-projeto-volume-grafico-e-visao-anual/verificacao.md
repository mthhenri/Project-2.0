# Verificação — task 199 (gráfico de barras e visão anual do volume)

Data: 2026-10-19. Ambiente: stack local (backend `ts-node` na 3000, Angular dev na 4200, PostgreSQL local na 5433), navegador do app Claude.

## Cenário

Usuário de teste `dev.teste` **promovido a gestor no banco de dev só para a verificação** (com autorização do autor) e devolvido a desenvolvedor no fim.
Dados plantados pela API do gestor: projeto `GRAFVERIF` (cor `#e11d48`, volume 3 h/mês) com execuções encerradas em julho (2h30), setembro (1h) e outubro
(1h30 + 2h = 3h30) de 2026 e uma em dezembro de 2025; o `Projeto Demo` recebeu volume 40 h (suas execuções de outubro somam 15h 18min). Tudo removido (soft
delete) e o volume do Demo voltou a nulo.

## Resultado

| Critério da spec | Resultado |
|---|---|
| Mensal: duas categorias, a de estouro com a barra de gastas vermelha acima da de esperadas | Conferido (1366×768, captura): DEMO 15h 18min × 40h 0min e GRAFVERIF 3h 30min (vermelha) × 3h 0min. |
| Anual: barras só nos meses com execução e linha tracejada do esperado | Conferido: GRAFVERIF com barras em Jul (2h30), Set (1h) e Out (3h30, acima da linha de 3 h); os outros 9 meses em 0; DEMO só em Out, com a linha em 40 h. A execução de dezembro de 2025 não aparece em 2026. |
| Linha tracejada some sem volume esperado | Coberto por teste de componente (`projeto-volume.component.spec.ts`); ao vivo os dois projetos tinham volume. |
| Filtro Mensal \| Anual e seletores | Conferido: o seletor muda de mês (`10/2026`) para ano (`2026`), com anterior, próximo e "Ano atual"/"Mês atual". |
| Desenvolvedor não vê a visão nem acessa a rota anual | Rota coberta pelo teste do controller (`@GestorOnly`); o alternador só aparece ao gestor (teste da listagem). O 403 ao vivo foi conferido na 197 para a rota mensal; a anual usa o mesmo decorator. |
| Três viewports | 1366×768 (capturas) e 1920×1080 e 1080×1920 (medidas do DOM): sem rolagem horizontal, gráfico dentro do cartão (742 de 784 px no anual lado a lado em 1920; 702 de 744 px em 1080; 1542 de 1584 px no mensal em 1920), 12 barras por projeto no anual e 4 no mensal. |

## Achado na verificação

O projeto de teste tinha cor vermelha e a barra "acima do esperado" ficou indistinguível das outras barras dele. Solução: contorno escuro e valor em
vermelho na barra do estouro (`destaque`), além do vermelho. Também o rótulo "esperado por mês" ficava sobre a barra de outubro e foi para o lado esquerdo.

## Limites

- As capturas de 1920×1080 e 1080×1920 saem cortadas pelo painel do navegador; por isso a conferência foi por medida do DOM e não por imagem.
- O estado "sem volume definido" no mensal e a linha de referência ausente no anual foram vistos só por teste de componente.
- Sem lint no projeto (`PROBLEMS.md` P-001).
