# Verificação — task 197 (volume de trabalho por projeto)

Data: 2026-10-19. Ambiente: stack local (backend `ts-node` na 3000, Angular dev na 4200, PostgreSQL local na 5433), navegador do app Claude.

## Cenário

Usuário de teste `dev.teste`, **promovido a gestor no banco de dev só para a verificação e devolvido a desenvolvedor no fim**. Dados plantados pela API
do gestor: projeto `VOLVERIF` com volume esperado de 2 h, uma demanda, uma atividade e três execuções registradas (5/10 1h30, 6/10 1h, 30/09 1h);
o `Projeto Demo` já existente recebeu volume 40 h. Tudo foi removido (soft delete) e o volume do Demo voltou a nulo ao final.

## Resultado

| Critério da spec | Resultado |
|---|---|
| 12 h de 40 h → "12h de 40h (30%)" | **Conferido com outros números**: Demo em outubro mostrou 15h 18min de 40h 0min (38%), igual à soma das 3 execuções encerradas do banco (918 min). O formato é o do pipe `tempoExibicao` ("15h 18min"), o mesmo do Planejamento. |
| Sem volume definido mostra só as horas | Conferido: `VOLVERIF` com o volume limpo mostrou "2h 30min · sem volume definido" e nenhuma barra. |
| Estouro (> 100%) destacado | Conferido: `VOLVERIF` 2h 30min de 2h 0min (125%), barra cheia e vermelha, borda vermelha e o aviso "acima do esperado". |
| Mês sem execução mostra 0h | Conferido em setembro para o Demo: 0h 0min (0%). |
| Execução fora do mês não conta | Conferido: a execução de 30/09 só aparece em setembro (`VOLVERIF` 1h 0min, 50%) e não soma em outubro. |
| Execução em andamento não entra | Coberto por teste de integração (`listarVolume`); não plantada ao vivo. |
| Desenvolvedor não acessa a rota nem vê a visão | Conferido ao vivo: `GET /projeto/volume` devolveu **403** e a listagem não mostra o alternador. |
| Campo no formulário | Conferido: o dialog de edição traz o volume salvo ("2 h por mês"); esvaziar e salvar gravou `null` (conferido por `GET /projeto/:id`). |
| Três viewports | 1366×768 (capturas) e 1920×1080 e 1080×1920 (medidas do DOM: sem rolagem horizontal, linhas dentro da tela; abaixo de 1100 px de largura a linha vira coluna única). As capturas de 1920 e 1080×1920 saíram cortadas pelo painel do navegador, por isso a conferência foi por medida do DOM e não por imagem. |

## Achado na verificação

O primeiro desenho do formulário pôs o volume numa linha própria, deixando um vazio sob "Status" ao lado do seletor de cor (que é alto). O campo foi
para a coluna de Status, empilhado sob ele.

## Limites

- Execução em andamento e execução na virada do mês (22:00 -03:00 = dia seguinte em UTC) não foram plantadas ao vivo; o critério de dia é `DATE(inicio_data)` no fuso da sessão, o mesmo
  de `listarParaRelatorio`, e o teste de integração cobre a execução de 31/10 às 22:00 (-03:00), que em UTC já é 1º de novembro, contando em outubro.
- Sem lint no projeto (`PROBLEMS.md` P-001).
- O toggle "Projetos / Volume do mês" usa `[ngModel]` (o `p-selectbutton` exige), como o filtro de status que já existia na mesma página.
