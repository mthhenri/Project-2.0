# Task 169 — IA: gestor e administrador agem por outro usuário

> Origem: teste do autor em 2026-10-18 ("cria uma atividade para ele naquela demanda da tela de login"): a IA recusou, dizendo que só cria atividade para quem conversa com ela. Guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 11; princípio: a IA faz o que o usuário faz, sempre com confirmação.

## Objetivo

Hoje todas as ferramentas de ação da IA atuam só sobre o **próprio** usuário do token. Pelas telas, o gestor e o administrador podem criar atividade para outro usuário (`AtividadeCriarDto.usuarioId`, usado por `AtividadeService.criar` quando o tipo tem poder de gestor), iniciar e encerrar a execução de **qualquer** atividade (`ExecucaoService.iniciar/encerrar`) e corrigir qualquer execução. A IA passa a fazer o mesmo **em nome de uma pessoa nomeada**, com o alvo sempre explícito no cartão.

## Entregáveis

1. **Criar atividade para outro usuário:** `propor_criar_atividade` ganha `usuarioId` opcional (só vale para GESTOR/ADMINISTRADOR; a service já ignora o campo para desenvolvedor, e a ferramenta o recusa com mensagem clara). O cartão e o executor mostram e usam "Pessoa: Fulano"; sem `usuarioId`, é o próprio usuário (comportamento de hoje).
2. **Iniciar e pausar a execução de outro usuário:** `propor_iniciar_execucao` e `propor_pausar_execucao` passam a lidar com o **dono da atividade**, não com quem conversa. A regra de uma execução ativa é do dono; "pausa antes a execução em andamento" lê a do dono. Para isso, uma leitura da execução ativa **por usuário** na `ExecucaoService` (hoje `recuperarAtiva` só lê a do token; o gestor já pode ler a de outro pelo repository, e a service confere o tipo). Pausar de outro usa `usuarioId` (ou `atividadeId`) e o gestor pode encerrar a execução de qualquer um (`encerrar` já permite). O cartão mostra a pessoa.
3. **Descrever execução** (check-in) continua só do próprio desenvolvedor: fora desta task.
4. **Leituras do gestor por pessoa:** `consultar_execucao_ativa` e `listar_minhas_atividades` aceitam `usuarioId` **somente para o gestor** (outros tipos recebem erro de permissão); `listar_execucoes_da_equipe_no_dia` já cobre as execuções do dia. A IA usa `listar_usuarios` (task 164) para achar o `usuarioId` pelo nome; nome ambíguo leva a perguntar.
5. **Desfazer** de cada proposta reverte o efeito sobre o **dono** (criação: excluir a atividade; início: excluir a execução; pausa: reabrir), com as mesmas travas de hoje.
6. Instruções de uso no `descricao` das ferramentas (a IA só passa `usuarioId` quando o usuário nomeia outra pessoa; nunca inventa) e no prompt `CONVERSA`, se ele tratar de "só para a pessoa com quem converso".
7. Testes: gestor cria para outro (e a service decide o dono), desenvolvedor com `usuarioId` é recusado, iniciar para outro pausa a execução **do dono** (não a do gestor), a trava de uma execução ativa do dono vale, pausar de outro, desfazer, e as leituras com `usuarioId` só para o gestor.

## Critérios de Aceite

- "Cria uma atividade para o Matheus na demanda Tela de login" gera um cartão "Pessoa: Matheus Henrique"; confirmar cria a atividade **dele**; desfazer a exclui.
- "Inicia a atividade X do Matheus" propõe a execução na atividade dele; se ele já tem uma ativa, o cartão avisa que **ela** será pausada (não a do gestor); a execução pertence ao Matheus e o gestor continua com a própria ativa, se tinha.
- Um desenvolvedor não consegue nada disso (ferramenta recusa e a service também).
- Testes de `backend` (node:test) e builds de `backend` e `frontend` passam; frontend sem lint (P-001), declarado no fecho.
- Cartões verificados ao vivo em `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, com o cartão de `INICIAR_EXECUCAO` como análogo (estados vazio, carregando, cheio e erro).

## Fora de Escopo

- Descrever execução e check-in de outra pessoa; ajustar o pad de outro usuário.
- Excluir atividade ou execução.
- Mudar regra de permissão das services.

## Dependências

`145` (propostas de atividade e execução), `159` (a IA cria projetos e demandas), `164` (`listar_usuarios`), `165` e `166` (propostas de alteração e correção, que já valem para o gestor sobre atividade e execução alheias).

## Riscos e Mitigação

- **Alvo errado:** a IA pode confundir pessoas de nomes parecidos. Mitigação: `usuarioId` só vem de `listar_usuarios`, o cartão mostra o nome da pessoa em destaque e nome ambíguo leva a perguntar.
- **Quem pausa o quê:** `recuperarAtiva` hoje lê a execução do token; reusá-la para o dono daria a pausa errada. Mitigação: método por usuário na service, usado só quando o chamador é gestor, e teste cobrindo gestor com execução própria ativa.
