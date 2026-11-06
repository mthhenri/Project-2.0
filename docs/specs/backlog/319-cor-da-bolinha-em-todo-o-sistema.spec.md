# 319 — Cor da bolinha nos demais avatares do sistema

> Pedido do autor em 2026-11-06, ao fechar a 316: o escopo da cor escolhida pela pessoa vai além do chat. Depende da **316** (coluna `usuario.cor_avatar`, regras `ehCorValida` e `corDoTextoSobre`).
> **Estado: só a spec**, no backlog.

## O que muda para o usuário

Todo avatar com iniciais de uma pessoa passa a usar a cor escolhida por ela (ou o acento de hoje, se não escolheu): atividades (listagem, detalhe, diálogos de execução), demandas (membros, cabeçalho de
membros, controle de horas, painel de atividades), cartão de usuário, Ponto, "Execução agora" e login. Sem tempo real: vale na próxima carga.

## Modelagem

Nenhuma nova. Reaproveita `usuario.cor_avatar`. Falta só que os DTOs dessas telas que hoje trazem o nome da pessoa (por exemplo membros de demanda, atividade, execução, ponto) tragam também `corAvatar`; a
lista exata sai de `npm run impacto` sobre os DTOs de pessoa, e cada acréscimo é conferido antes de aplicar (skill `gerenciamento-de-impacto`).

## Implementação

Um componente de avatar compartilhado (hoje há um por tela, com `--app-avatar-fundo`/`--app-avatar-cor` repetidos em ~12 SCSS), ou o `app-mensagem-direta-avatar` generalizado e movido para `shared/`. A escolha
entre os dois é registrada ao abrir a task, depois de ver o impacto. Os SCSS repetidos migram para o componente.

## Testes e verificação

Testes de componente dos avatares com e sem cor; ao vivo, uma pessoa com cor própria vista em cada tela listada, nos cinco formatos e dois temas. `npm run lint:tudo`, `npm run repo:verificar`.

## Fora de escopo

Foto de perfil; cor por contato; tempo real.
