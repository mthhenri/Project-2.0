# 306-usuarios-legenda-dos-tipos.spec.md

> Origem: pedido do autor em 2026-11-03. Independente da guarda-chuva `demanda-atividades-e-conexoes`.

## Objetivo

Na tela de Usuários, um lugar que explica **o que cada tipo de usuário é e o que pode fazer**: Desenvolvedor, Auxiliar, Gestor e Administrador.

## Fatos do código (2026-11-03)

- **Não existe descrição dos tipos no sistema.** A tabela `tipo_usuario` tem a coluna `descricao`, mas ela só repete o nome ("Gestor",
  "Auxiliar"…), preenchida pelas migrations 0025, 0029 e 0074. O que explica cada tipo está só em `docs/SYSTEM.SPEC.md` §14 (Acesso e
  Permissões) e nas funções por ação de `shared/src/utils/permissao-usuario.ts`.
- A tela (`usuario-listagem`) tem o filtro por tipo (Desenvolvedores, Auxiliares…) e só é aberta a quem tem permissão de gestor.

## Decisões propostas (o autor confirma ao abrir a task)

1. **Onde:** um botão de ajuda ("Tipos de usuário") no cabeçalho da tela, ao lado de "Novo Usuário", que abre um **popover** ou diálogo com os quatro
   tipos. O mesmo texto aparece como ajuda ao escolher o tipo no formulário de criar e editar usuário (`usuario-formulario-dialog`).
2. **Conteúdo de cada tipo:** uma frase do que é e duas ou três listas curtas: "pode" e "não pode" (as que mais surpreendem), escritas para quem
   não conhece o sistema. Sem repetir a tabela inteira de §14: o texto aponta o essencial.
3. **Onde o texto mora:** constante no `shared` (por exemplo `DESCRICAO_TIPO_USUARIO`, ao lado de `TipoUsuarioEnum`), usada pelo front. **Não** vai
   para a coluna `descricao` do banco (continua sendo o nome de exibição) nem exige migration.
4. **Coerência com a regra:** o texto não pode divergir de §14. Teste de unidade que garante que todo valor de `TipoUsuarioEnum` tem descrição, e
   registro no fecho de que mudar permissão obriga revisar a descrição.

## Pontos em aberto

- Texto exato de cada tipo (o agente escreve a partir de §14 e o autor revisa).
- Popover, diálogo ou faixa fixa acima da tabela? Padrão proposto: popover, para não ocupar a tela.
- Mostrar a legenda também para o administrador ao alterar o tipo de um usuário (padrão proposto: sim, o mesmo componente).

## Verificação

Teste de unidade da cobertura dos tipos; teste de componente (abre a ajuda, mostra os quatro tipos); `lint:tudo`; skill `verify` nos cinco formatos
e dois temas, tendo como análogo os popovers de ajuda já existentes.
