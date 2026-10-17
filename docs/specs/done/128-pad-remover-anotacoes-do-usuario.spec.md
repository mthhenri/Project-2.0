# Task 128 — Pad: remover `usuario.anotacoes` e fechar o bloco 8

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 8 (4 de 4).

## Objetivo

Depois que a tela e o backend usam as cinco seções, remover o texto único antigo do `usuario` e tudo que
dependia dele. Também deixa de existir a exceção que deixava o desenvolvedor gravar o pad pelo
`PUT /usuario/:id`: o pad tem rota própria, e a edição de usuário volta a ser só de gestor e administrador.

## Entregáveis

### 1. Migration `0032`

- Antes de remover, uma **conferência dentro da própria migration** garante que nenhum usuário tem
  `usuario.anotacoes` com texto e `PESSOAL` vazia (a 126 copiou); se houver, a migration para com erro claro
  em vez de perder dado.
- `DROP COLUMN anotacoes` e `DROP COLUMN anotacoes_alteracao_data` de `usuario`. O `DOWN` recria as colunas
  (nullable, sem `DEFAULT`) e devolve o texto de `PESSOAL` para `anotacoes`.

### 2. Backend e shared

- Remover `anotacoes` e `anotacoesAlteracaoData` de `UsuarioAlterarDto`, `UsuarioInternoAlterarDto`,
  `UsuarioAlteradoDto` e `UsuarioRecuperadoDto`, do model `Usuario`, dos `SELECT`/`UPDATE` do
  `UsuarioRepository` e do `mapearParaRecuperado`.
- `UsuarioService.alterar`: sai `validarSomenteAnotacoesDoProprio`. Quem não é gestor não altera usuário
  nenhum, nem o próprio perfil (a rota do pad, da 125, é a única que o desenvolvedor usa). Atualizar os
  testes.
- `backend/src/database/scripts/converter-descricoes.ts`: tirar `usuario.anotacoes` dos `ALVOS` (a coluna
  deixa de existir); o conversor e o restante do script ficam.

### 3. Frontend

- `UsuarioService.alterar` deixa de aceitar `anotacoes`; remover o parâmetro que existia só para o pad
  (`true`) se ele ficar sem uso.
- Conferir por busca que nada mais lê `usuario.anotacoes` ou `anotacoesAlteracaoData` (perfil, listagem,
  topbar, deep-link).

### 4. Documentação

- `docs/SCHEMA.md` e `docs/SYSTEM.SPEC.md` (campos do `usuario` e regra de permissão do `PUT /usuario/:id`),
  `docs/context/` (incluindo o fim do bloco 8), `HISTORY.md` e a tabela da guarda-chuva.

## Critérios de Aceite

- `db:migrate` aplica a `0032` (e falha com mensagem clara num banco de teste em que a conferência não
  passa); `db:rollback` e novo `db:migrate` rodam sem erro e devolvem o texto de "Pessoal".
- `grep` por `anotacoes` e `anotacoesAlteracaoData` em `backend/src`, `frontend/src` e `shared/src` só
  encontra o módulo novo do pad e os nomes das seções.
- Desenvolvedor recebe 403 em qualquer `PUT /usuario/:id` e continua lendo e gravando o próprio pad pela
  rota do pad; gestor e administrador alteram usuários normalmente.
- Verificação ao vivo do fluxo completo do pad (abrir, editar, "Enviar para", fechar, listagem de usuários)
  com gestor e desenvolvedor.
- Testes de `shared` e `backend` e builds passam.

## Fora de Escopo

- A IA lendo e escrevendo no pad (blocos 5 e 6) e o modo só leitura com a IA ligada (blocos 4 e 10).
- Qualquer mudança na estrutura das cinco seções.

## Dependências

Depende da **125**, da **126** e da **127**. Fecha o bloco 8.
