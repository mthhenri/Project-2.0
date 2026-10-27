# 252-execucoes-em-andamento-fora-da-tabela.spec.md

> Task solta, pedido do autor sobre a tela Execuções (2026-10-26). A linha "Em andamento" dentro da tabela confunde: o natural é a tabela ser só
> histórico fechado. O autor aprovou o POC visual em `.artifacts/poc-execucao-ativa/index.html` (execução ativa **acima** da tabela).

## Objetivo

A execução ativa sai da tabela e vai para um bloco **"Em andamento agora"** acima dela. A tabela passa a listar só execuções encerradas, em ordem
cronológica; ao encerrar, a linha entra no fim da tabela. O desenvolvedor sem nada em andamento ganha um atalho **"Iniciar atividade"** que o leva
ao chat com uma mensagem pronta.

## Decisões (autor, 2026-10-26)

1. **Posição:** o bloco fica **acima** da tabela.
2. **Desenvolvedor, sem execução ativa:** estado vazio com o botão "Iniciar atividade", que abre o **Chat** com uma mensagem padrão **já digitada,
   não enviada** (ex.: "O que temos pra fazer?" ou "De onde paramos?"). Com a **IA desligada**, o botão leva a **Atividades**.
3. **Gestor** pode pausar e encerrar a execução de **qualquer** atividade (regra já vigente, `SYSTEM.SPEC.md` §14); o estado vazio dele **não** tem o botão de iniciar.

## Comportamento (conforme o POC)

- **Cartão da execução ativa:** atividade (link), caminho `Projeto › Demanda`, descrição, cronômetro grande, "desde HH:MM" e botões Pausar e
  Encerrar (no lugar da lixeira da tabela). Com mais de um usuário (gestor sem filtro), o bloco é uma **grade de cartões compactos** com avatar e
  nome, e o título conta os ativos ("Em andamento agora · N de M usuários").
- **Total do dia** continua somando a execução ativa; o subtítulo da página ganha "· N em andamento" (a nota "inclui execução em andamento" no rodapé da
  tabela foi descartada na verificação: alargava a tabela e fazia a coluna Duração quebrar em 1080×1920).
- **Estado vazio** mantém o bloco (a altura da tela não pula quando alguém inicia ou encerra).
- Tabela: sem a linha "Em andamento"; a coluna Fim nunca fica vazia.

## Entregáveis

1. `execucao-historico.page`: separar `execuções ativas` de `encerradas` (regra pura em `execucao.util.ts`, com teste), o bloco "Em andamento agora" e o
   total que soma a ativa. Reaproveitar o cronômetro e as ações do `execucao-timer` e os serviços de pausar/encerrar existentes, sem duplicar regra.
2. Atalho "Iniciar atividade": o Chat lê a mensagem inicial por `queryParam` (no molde do `?plano=` da `chat.page`), preenche o campo e foca, sem enviar;
   o rótulo escolhido (ex.: "De onde paramos?" quando já houve execução hoje, senão "O que temos pra fazer?") fica numa função pura testada.
   Com a IA desligada, navega para Atividades.
3. Testes: util puro, componente (ativa fora da tabela, vazio com e sem botão, total somando a ativa, grade do gestor) e a leitura do `queryParam` no chat.

## Critérios de Aceite

- Testes e build do `frontend` verdes. Ao vivo (skill `verify`), em `1920×1080`, `1366×768` e `1080×1920`: dev com ativa, dev sem ativa (e com IA
  desligada), gestor sem filtro com vários ativos, gestor filtrado, gestor sem ninguém; iniciar, pausar e encerrar atualizam bloco, tabela e total.
  Comparar com o POC e com a tela atual (análogo aprovado).

## Pontos em aberto, resolvidos na implementação (2026-10-26; o autor mandou executar)

- **Execução ativa de outro dia:** o bloco mostra o que a listagem do dia traz. Num dia passado **sem** execução ativa ele não aparece (o estado vazio é do
  "agora"); a API não devolve a ativa de outro dia e não se criou chamada extra.
- **Mensagem padrão:** "De onde paramos?" quando já há execução encerrada no dia listado, senão "O que temos pra fazer?" (`mensagemInicialDoChat`).
- **Pausar** é encerrar com a descrição (a mesma rota `PATCH /execucao/:id/encerrar` do chip da barra superior): o cartão abre um popover com a descrição,
  obrigatória para desenvolvedor e opcional para o gestor, que pausa a execução de qualquer um.
- **Cronômetro:** reaproveita o `app-execucao-timer` (ganhou o tamanho `medio`); ele já corre sozinho por `setInterval`.

## Fora de Escopo

- Iniciar atividade direto da tela Execuções; mudar o relatório de execuções; mudar regra de execução (uma ativa por dono da atividade).

## Dependências

- Tela de Execuções e `execucao-timer` existentes; a 253 (campo do chat formatado) é independente, mas o preenchimento por `queryParam` vale para o campo novo.
