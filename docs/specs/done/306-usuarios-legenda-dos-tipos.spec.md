# 306-usuarios-legenda-dos-tipos.spec.md

> Origem: pedido do autor em 2026-11-03. Independente da guarda-chuva `demanda-atividades-e-conexoes`.

## Objetivo

Na tela de Usuários, um lugar que explica **o que cada tipo de usuário é e o que pode fazer**: Desenvolvedor, Auxiliar, Gestor e Administrador.

## Fatos do código (2026-11-03)

- **Não existe descrição dos tipos no sistema.** A tabela `tipo_usuario` tem a coluna `descricao`, mas ela só repete o nome ("Gestor",
  "Auxiliar"…), preenchida pelas migrations 0025, 0029 e 0074. O que explica cada tipo está só em `docs/SYSTEM.SPEC.md` §14 (Acesso e
  Permissões) e nas funções por ação de `shared/src/utils/permissao-usuario.ts`.
- A tela (`usuario-listagem`) tem o filtro por tipo (Desenvolvedores, Auxiliares…) e só é aberta a quem tem permissão de gestor.

## Decisões do autor (2026-11-03)

1. **Onde (opções A + D):** botão **"Tipos de usuário"** (ícone `?`) no cabeçalho, ao lado de "Novo Usuário", que abre um **popover** com os quatro
   tipos; e o mesmo conteúdo **junto do ponto de decisão**: tooltip da tag do tipo na coluna Tipo da tabela e, no formulário de criar e editar
   usuário, um **bloco que muda conforme o tipo escolhido**.
2. **Quem vê:** só quem tem acesso à tela de Usuários (a ajuda mora nela e no formulário dela). Não há versão em Perfil nem em Configurações.
3. **Conteúdo de cada tipo:** "O que é" em uma frase e as listas curtas **Pode** e **Não pode**.
4. **Cores dos tipos:** as que o app já usa na tag do tipo, **sem cor nova**: Desenvolvedor azul (`info`), Auxiliar verde (`success`), Gestor
   âmbar (`warn`) e Administrador escuro (`contrast`), de `severidadeTipoUsuario` (`core/utils/tipo-usuario.ts`). O popover, o tooltip e o bloco do
   formulário usam essa função, para a cor nunca divergir da tabela.

## Decisões do agente

1. **Onde o texto mora:** constante no `shared` (por exemplo `DESCRICAO_TIPO_USUARIO`, ao lado de `TipoUsuarioEnum`: `queE`, `pode[]`, `naoPode[]`),
   usada pelo front. **Não** vai para a coluna `descricao` do banco (continua sendo o nome de exibição) nem exige migration.
2. **Coerência com a regra:** o texto não pode divergir de `SYSTEM.SPEC.md` §14. Teste de unidade que garante que todo valor de `TipoUsuarioEnum`
   tem descrição; mudar permissão obriga revisar a descrição (registrar no fecho).
3. **Um componente só** (`usuario-tipo-descricao`) desenha o conteúdo de um tipo, usado no popover, no bloco do formulário e (versão curta, só o
   "O que é") no tooltip.
4. Popover fecha com Esc e clique fora; abrir o formulário o fecha. Layout do popover em duas colunas, uma coluna em tela estreita.

## Referência visual

`306-usuarios-legenda-dos-tipos/mockup.html`: tela de Usuários com o popover aberto, tooltip na tag do tipo e o formulário com o bloco, claro e
escuro. Os **textos do mockup são rascunho**: o agente os revisa contra §14 e o autor aprova ao abrir a task. Pontos a conferir no texto: o que
o gestor **não** pode (o mockup diz criar, promover ou excluir administradores) e se "Configurações da IA" é só do administrador.

## Pontos em aberto

- Texto final de cada tipo (revisão do autor).
- Análogo para a verificação: o popover de ajuda mais próximo que já existe na aplicação (escolher e registrar ao abrir a task).

## Verificação

Teste de unidade da cobertura dos tipos; teste de componente (abre a ajuda, mostra os quatro tipos, o bloco do formulário troca com o tipo); `lint:tudo`; skill `verify` nos cinco formatos
e dois temas, comparando com o análogo escolhido.
