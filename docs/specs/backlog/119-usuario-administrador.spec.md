# Task 119 — Usuário administrador

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 1 (segunda de duas
> tasks).

## Objetivo

Introduzir o tipo **`ADMINISTRADOR`**: um gestor com mais permissões, que cria outros
administradores. O `gestor.inicial` passa a ser o administrador inicial e a regra "sempre existe
ao menos um administrador ativo" substitui a guarda atual de "último gestor ativo" (P-002). A tela
de Configurações da IA, exclusiva do administrador, nasce no bloco 4; esta task entrega apenas o
tipo, a regra e o que o usuário vê dele.

## Entregáveis

### 1. Shared

- `TipoUsuarioEnum.ADMINISTRADOR`.
- `temPermissaoDeGestor` (task 118) passa a retornar `true` também para `ADMINISTRADOR`, com o caso
  novo no teste. Acrescentar `temPermissaoDeAdministrador(tipo)` com o seu teste.
- DTOs de usuário (`UsuarioCriarDto`, `UsuarioAlterarDto`, saídas): o `@IsEnum` já cobre o valor
  novo; ajustar exemplos do Swagger e conferir a skill `project20-dto-conventions` se algum DTO novo
  for preciso.

### 2. Migration `0029`

Seguir a skill `sql-migrations` (seções `-- UP`/`-- DOWN`, sem `DEFAULT`, `INSERT ... SELECT`):

- `INSERT` de `ADMINISTRADOR` em `tipo_usuario` (`descricao` "Administrador").
- A coluna legada `usuario.tipo VARCHAR(20)` convive com `tipo_usuario_id` e tem a constraint
  `usuario_tipo_check CHECK (tipo IN ('DESENVOLVEDOR','GESTOR'))` (migration `0025`): recriá-la
  incluindo `ADMINISTRADOR`. Confirmar, antes, o que ainda lê essa coluna.
- Converter o `gestor.inicial` (seed da `0015`) em `ADMINISTRADOR`, nas duas representações
  (`tipo` e `tipo_usuario_id`).
- `DOWN`: reconverter administradores em `GESTOR`, restaurar a constraint e remover o seed
  (migration já aplicada nunca é editada: só esta é nova).

### 3. Backend

- `UsuarioService`: a regra **"sempre existe ao menos um administrador ativo e não excluído"**
  substitui `validarPermanenciaDeGestorAtivo`, em `alterar` (rebaixar ou inativar) e `excluir`.
  Gestor deixa de ser obrigatório. `UsuarioRepository.listarGestoresAtivos` vira
  `listarAdministradoresAtivos`.
- Quem cria e altera tipos: ver "Decisões em aberto". Mensagens: "O sistema deve ter ao menos um
  administrador ativo".
- Atualizar `usuario.service.test.ts` (fixtures `GESTOR_LOGADO`/`GESTOR_ATIVO`): rebaixar, inativar e
  excluir o último administrador falha; havendo outro, passa; gestor ativo único não bloqueia nada.
- **Sessões já abertas:** o JWT carrega o `tipo`. Depois da migration, o administrador inicial segue
  com o token de gestor até novo login. Definir e registrar no fecho a conduta (ver decisões).

### 4. Frontend

- `UsuarioSessaoService.eAdministrador` (via `temPermissaoDeAdministrador`); `eGestor` já cobre o
  administrador pela regra da 118.
- `usuario-formulario-dialog` ganha a opção "Administrador" nos tipos permitidos a quem loga; a
  listagem de usuários ganha o filtro e a cor da tag do novo tipo; rótulos de tipo em
  `usuario-perfil-dialog`, `demanda-membro-lista` e no menu do perfil da topbar passam de binário
  (Gestor/Desenvolvedor) para os três tipos.
- Quem é administrador e tem permissão de gestor continua vendo toda a navegação de gestor.

### 5. Documentação

- `docs/SCHEMA.md` (seed de `tipo_usuario`, constraint), `docs/SYSTEM.SPEC.md` §14 (tipos de usuário e
  a nova regra de permanência), `docs/context/PROBLEMS.md` (P-002 resolvida/substituída) e o
  `HISTORY.md`, conforme `task-flow`.

## Decisões em aberto (precisam do autor)

1. **Quem cria o quê.** A guarda-chuva diz que o administrador cria administradores, gestores e
   desenvolvedores. Proposta: o **gestor continua criando gestores e desenvolvedores como hoje**, mas
   não cria, promove, rebaixa, inativa nem exclui administradores. Alternativa mais restrita: só o
   administrador gerencia gestores.
2. **Sessões abertas.** Proposta: aceitar novo login do `gestor.inicial` após a migration, anotado no
   fecho. Alternativa: o backend recarrega o tipo do banco em cada requisição.
3. **Auto-rebaixamento.** Hoje "um gestor não pode rebaixar a si mesmo". Proposta: manter para
   gestor; para administrador vale a regra de permanência (pode se rebaixar havendo outro
   administrador).

## Critérios de Aceite

- Após `db:migrate`, `gestor.inicial` é `ADMINISTRADOR`, entra e acessa tudo o que acessava; `db:rollback`
  e novo `db:migrate` rodam sem erro.
- Com um único administrador ativo, rebaixar, inativar ou excluir esse usuário é recusado pelo
  backend (e a tela mostra o motivo); com dois, é permitido. Um único gestor ativo pode ser inativado.
- Administrador faz tudo o que o gestor faz, em todas as telas e rotas gestor-only.
- Fluxos verificados ao vivo com os três perfis (administrador, gestor, desenvolvedor).
- Testes de `shared` e `backend` e builds passam; lacuna do frontend sem testes declarada.

## Fora de Escopo

- A tela de Configurações da IA e o decorator/guard `administrador-only` (bloco 4, que traz o primeiro
  consumidor).
- Qualquer coisa de IA, chat ou prompts.
- Remover a coluna legada `usuario.tipo`.
- Separar mais o papel de administrador do de gestor (ideia futura da guarda-chuva).

## Dependências

Depende da **118**. Fontes: `docs/SYSTEM.SPEC.md` §14, `docs/SCHEMA.md`, `docs/context/PROBLEMS.md`
(P-002) e a guarda-chuva (seção "Usuário administrador").
