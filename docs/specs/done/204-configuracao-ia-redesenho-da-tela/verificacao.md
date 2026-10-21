# Verificação — 204 (redesenho da tela de Configurações da IA)

Verificação ao vivo em 2026-10-21, no app real (`localhost:4200`, backend `localhost:3000`, banco de desenvolvimento) com um administrador de teste (`verificacao.204`, criado só para isto e removido por
soft delete ao terminar; as versões da configuração da IA não foram alteradas: a última continua a 21). Capturas ficaram só na sessão (não versionadas); este texto é o registro.

## O que foi visto

- **1366×768 (notebook), tema claro:** aba Provedor e modelos com os três cartões (padrão, 1º e 2º fallback), "Chave configurada" no padrão, modelos do cartão aberto e esforço na linha do título dos modelos;
  histórico na coluna à direita, barra de salvar na base. A página cabe sem rolagem (`main` 702 px, conteúdo 702–703 px) nas abas Provedor e Comportamento. **Achado só da verificação:** a primeira versão tinha
  seção de esforço separada, parágrafo de ajuda e uma coluna de histórico sem limite de altura (`height: 100%` num pai sem altura), e passava de 1500 px; o esforço foi para o cabeçalho dos modelos, a ajuda virou
  tooltip e o histórico ganhou `max-height` com rolagem interna.
- **Fluxo:** "+ adicionar" no 1º fallback listou os provedores com o Anthropic desabilitado; escolher o Google mostrou "Sem chave" (o ambiente só tem a chave da Anthropic), abriu os modelos dele, liberou o
  cartão do 2º fallback e a barra passou a dizer "Salvar cria a versão 22". "Salvar nova versão" com os modelos do Google vazios mostrou os três erros da regra do shared, marcou a aba com o ícone de erro e não enviou nada.
- **Aba Comportamento** (check-in, rigor, chat) em duas colunas; **aba Custos** com o histórico ao lado.
- **1920×1080 e 1080×1920:** layout coerente; na vertical o histórico desce para baixo das abas.
- **Tema escuro:** cartões, cartão aberto (destaque do primário sobre a superfície), selects, botões de esforço e tooltip legíveis (cor do texto e do fundo conferidas por `getComputedStyle`).
- **Atividades:** o administrador vê "Alterar prioridades"; o dialog mostrou as 5 prioridades com selo ao vivo, seletor, código e "Salvar cor"; "Fechar" fecha.
- **Tooltip PrimeNG:** na aba Volume dos Projetos (mesmo `app-grafico-barras` de Custos) o tooltip aparece com seta, centrado na barra e encostado no topo dela, com o texto completo ("Projeto Demo: 15h 18min
  gastas de 20h 0min (77%)") e sem nenhum `<title>` no SVG. **Achado só da verificação:** com `pTooltip` direto no `<rect>` o tooltip saía centrado na borda esquerda da barra (o PrimeNG mede `offsetWidth`, que SVG
  não tem) e o texto quebrava no meio de "15h 18min"; o tooltip passou para áreas HTML sobre as barras e ganhou `max-width: 24rem` (global, o tooltip vai para o `<body>`).

## Limites

- A aba Custos não tinha barras para apontar (nenhum preço de modelo cadastrado: o custo estimado é US$ 0); o tooltip foi conferido no volume dos projetos, que usa o mesmo componente.
- O hover real do mouse não disparou o tooltip no painel (o painel do navegador estava em segundo plano); o evento `mouseenter` disparado por script mostrou o tooltip posicionado corretamente. Os testes de
  componente cobrem o mesmo caminho.
- O desenvolvedor e o gestor não foram logados ao vivo; a ausência do botão "Alterar prioridades" para eles está coberta por teste de componente.
- Chamada real ao Gemini e à OpenAI continua sem verificação (sem chave), como na 203.
- Tamanhos mobile não são verificados neste projeto.
