# 199-projeto-volume-grafico-e-visao-anual.spec.md

> Task solta, pedido do autor sobre a 197 (2026-10-19): "na tela deveria ter o filtro anual e o filtro mensal, também deveria ser um gráfico de barras".
> A 197 está em `done/` e não é reescrita; esta task a corrige.

## Objetivo

A visão "Volume do mês" passa a se chamar **"Volume"**, com filtro **Mensal | Anual** e **gráfico de barras** no lugar das barras de progresso.

## Decisões (confirmadas pelo autor em 2026-10-19)

- **Mensal:** um gráfico de barras agrupadas com uma categoria por projeto e duas barras: horas **gastas** (cor do projeto, vermelha acima do esperado) e **esperadas**
  (cinza); projeto sem volume definido mostra só a barra de gastas e o rótulo "sem volume".
- **Anual:** escolhido o ano, **cada projeto** vira um cartão com 12 barras (uma por mês) de horas gastas e uma **linha tracejada** no volume esperado por mês;
  mês acima do esperado fica vermelho.
- **Biblioteca:** d3, que já está instalado (escalas); o desenho é SVG do próprio Angular, sem dependência nova.
- **Estouro:** além do vermelho, a barra ganha contorno escuro e o valor em vermelho (decisão minha, a confirmar): um projeto de cor vermelha ficava igual ao estouro.

## Entregáveis

1. `shared`: `ProjetoVolumeAnualListarDto { ano }` e `ProjetoVolumeAnualResumoDto { projetoId, nome, codigo, cor, volumeEsperadoHorasMes | null, minutosGastosPorMes: number[12] }`
   (índice 0 = janeiro); `ProjetoVolumeMesDto` (linha interna do repository). O intervalo de datas reaproveita o `ProjetoVolumeFiltrarDto` da 197 (mesma forma).
2. Backend: `GET /projeto/volume/anual?ano` (**só gestor**, declarada antes de `:id`); SQL no repository (`generate_series(1, 12)` × projeto, `LEFT JOIN` das
   execuções encerradas agrupadas por mês, mesmo critério de dia da 197: `inicio_data` no fuso da sessão); a service agrupa as linhas por projeto (função pura testada).
3. Frontend: `app-grafico-barras` (shared) desenhado com escalas do d3, responsivo à largura, com eixo em horas, rótulos de valor, linha de referência opcional, tooltip nativo
   (`<title>`) e cores do tema claro e escuro; filtro Mensal | Anual na visão (Reactive Forms); no Anual, seletor de ano (anterior, datepicker, próximo, "Ano atual").
4. Rótulos de valor respeitam "Tempos em dias" (`formatarTempoExibicao`); o eixo fica sempre em horas.
5. `SYSTEM.SPEC.md` (rota nova), `CONTEXT.md`, `HISTORY.md` e o número livre em `CLAUDE.md`/`AGENTS.md`.

## Critérios de Aceite

- Mensal com Demo 15h 18min de 40h e outro projeto 2h 30min de 2h: duas categorias, a segunda com a barra de gastas vermelha acima da de esperadas.
- Anual de 2026: projeto com execuções em setembro e outubro mostra barras só nesses meses e os outros 11 em 0; a linha tracejada aparece quando há volume esperado e some quando não há.
- Mês sem execução = barra de altura 0, sem erro. Ano sem nenhum projeto = estado vazio.
- Desenvolvedor recebe 403 em `GET /projeto/volume/anual` e não vê a visão.
- Testes: agrupamento por projeto (service), SQL anual (integração: mês, execução em andamento e excluída fora, virada de mês pelo fuso), controller (`@GestorOnly`,
  rota listada), gráfico (nº de barras, linha de referência, vermelho no estouro), visão (alterna Mensal/Anual, pede o endpoint certo).
- Verificação ao vivo nos três viewports com execuções em dois projetos.

## Fora de Escopo

- Exportar o gráfico, filtro por projeto ou por pessoa, anos sem limite de futuro (o ano segue o teto do ano atual), alertas de estouro, ferramenta da IA.

## Dependências

`197-projeto-volume-de-trabalho` (em `done/`).
