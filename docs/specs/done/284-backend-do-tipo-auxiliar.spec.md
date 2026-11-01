# 284-backend-do-tipo-auxiliar.spec.md

> Task da guarda-chuva `tipo-auxiliar.spec.md` (283–287). Redigida e concluída em 2026-11-01, depois da 283.

## Objetivo

Aplicar a matriz "Permissões por tela" no backend: o Auxiliar pode o que a matriz libera e é recusado no resto, **no backend**, e não só escondido na tela. Gestor, administrador e desenvolvedor não mudam de comportamento.

## Entregáveis

1. **Conferência linha a linha** das 113 ocorrências de checagem de tipo (`temPermissaoDeGestor`, `tipo === DESENVOLVEDOR`, `@GestorOnly`). Duas famílias: (a) o **escopo do desenvolvedor** (`tipo === DESENVOLVEDOR` → só vê o que é seu) vira `!temVisibilidadeTotal(tipo)`; (b) as **ações de gestor** são decididas uma a uma (tabela no fecho).
2. **Guard por ação:** `@ExigePermissao(podeX)` + `PermissaoGuard` (global), para a rota que o Auxiliar também faz; `@GestorOnly()` continua para o que é só do gestor.
3. **Ferramentas da IA:** nova permissão `'AUXILIAR'` (auxiliar, gestor e administrador) em `usuarioPodeUsar`; as ferramentas que o Auxiliar usa passam a ela.
4. **Testes:** `PermissaoGuard`, `usuarioPodeUsar`, os controllers (a permissão de cada rota convertida), e o Auxiliar nos testes de service de atividade, demanda, execução, projeto, ponto, usuário e do executor de registrar execução.
5. **Fecho:** `HISTORY.md`.

## Critérios de Aceite

- `npm run test --workspace=backend`, `npm run test:integracao`, `npm run build --workspace=backend` e `npm run lint` sem erro.
- Nenhum `tipo === DESENVOLVEDOR` sobra em código de produção do backend sobre o usuário logado.

## Fora de Escopo

- Visibilidade na tela, formulário de usuário e guards do frontend (286, 287).
- Atualizar `SYSTEM.SPEC.md` §14 (285).

## Dependências

- Task 283 (enum, migration e funções de permissão).

## Riscos e Mitigação

- **Troca mecânica que abre demais:** `tipo === DESENVOLVEDOR` e "só o gestor" são coisas diferentes. A troca mecânica deu ao Auxiliar a edição da descrição do cliente e a leitura de perfil alheio; os dois foram corrigidos para `temPermissaoDeGestor` e cobertos por teste. Cada ocorrência trocada foi relida.

## Resultado (2026-11-01)

Decisões por ação, além da visão total: **Auxiliar pode** — excluir e restaurar atividade (menu ⋯ da linha), registrar e excluir execução, ver e editar execução de qualquer um, ver o ponto de todos (`/ponto/todos`), conectar e desconectar demandas, o Controle de horas (`/demanda/planejamento`), criar/editar/excluir/restaurar tag, iniciar e pausar execução de outros, ligar plano a demanda, listar usuários (`GET /usuario`, que alimenta os seletores de membro e de executor). **Auxiliar não pode** — criar atividade para outra pessoa (o dono pedido é ignorado), descrição do cliente, excluir/restaurar demanda, perfil de outro usuário, usuários, calendário, relatórios, justificar ponto, projeto (criar/editar/volume), prioridades, modelagem, supervisão do chat. Gestor deixa de poder se tornar Auxiliar sem a trava de "rebaixar a si mesmo".
