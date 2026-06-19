# 46 — Demanda: correção das permissões de visualização e escrita

**Depende de:** 10 (demanda-crud), 12 (demanda-grafo), 13 (demanda-tags-atribuicoes), 14 (atividade-module), 26 (frontend-demanda), 39 (demanda-desenvolvedor-editar-descricoes)
**Entrega:** ajustar o controle de acesso da demanda para o modelo final — **qualquer usuário com acesso ao projeto visualiza suas demandas**, mas as ações de escrita ficam distribuídas entre gestor e desenvolvedor conforme a matriz abaixo. Corrige tanto permissões hoje **excessivamente liberais** (desenvolvedor criando conexões; desenvolvedor criando demanda raiz sem pai) quanto hoje **excessivamente restritas** (desenvolvedor não atribui tags; não se inclui como membro; não enxerga as atividades das demandas das quais é membro).

> Backend (regras em `demanda.service` + `atividade.service` + 3 ajustes de `@GestorOnly` no controller) + frontend (gating de botões/abas + auto-inclusão de membro). Sem migration, sem novo DTO.

---

## Matriz de permissão alvo

| Ação | Gestor | Desenvolvedor |
|---|---|---|
| Visualizar demandas do projeto | ✅ | ✅ projeto acessível (já existe — task 39) |
| Ver atividades de uma demanda | ✅ todas | ✅ **somente das demandas das quais é membro** |
| Apagar demanda | ✅ | ❌ |
| Criar conexão | ✅ | ❌ |
| Atribuir/colocar **outros** como membro | ✅ | ❌ |
| Incluir/remover **a si mesmo** como membro | ✅ | ✅ qualquer demanda de projeto acessível (inclusive estrutural) |
| Atribuir tags | ✅ | ✅ **somente nas demandas das quais é membro** |
| Criar sub-demanda (com pai; pode ser estrutural) | ✅ | ✅ projeto acessível |
| Criar demanda **sem pai** (raiz) | ✅ | ❌ |
| Editar descrição técnica/documentação | ✅ | ✅ membro (task 39) |
| Editar descrição do cliente | ✅ | ❌ (task 39) |

> "Acesso ao projeto" continua **derivado de `demanda_usuario`** (não existe `projeto_usuario`): o desenvolvedor só passa a ter acesso a um projeto depois que um gestor o coloca em ao menos uma demanda dele. A auto-inclusão como membro vale apenas **dentro de projetos a que ele já tem acesso**.

---

## Verificação (estado atual)

Levantamento feito antes de escrever a spec:

- **Conexões — permissivo demais.** `POST /demanda/:id/conexao` **não** é `@GestorOnly` ([demanda.controller.ts:146](../../../backend/src/modules/demanda/controllers/demanda.controller.ts)) e `criarConexao()` permite explicitamente o desenvolvedor **membro** criar conexão ([demanda.service.ts:376](../../../backend/src/modules/demanda/services/demanda.service.ts)). Deve passar a ser **gestor-only**.
- **Criar demanda raiz — permissivo demais.** `criar()` não exige `demandaPaiId` do desenvolvedor ([demanda.service.ts:46](../../../backend/src/modules/demanda/services/demanda.service.ts)); hoje um dev com acesso ao projeto pode criar demanda **sem pai**. Deve ser bloqueado.
- **Tags — restrito demais.** `PUT /demanda/:id/tag` é `@GestorOnly` ([demanda.controller.ts:187](../../../backend/src/modules/demanda/controllers/demanda.controller.ts)); o desenvolvedor membro não consegue taguear. Deve liberar para o desenvolvedor **membro**.
- **Auto-inclusão como membro — inexistente.** `POST /:id/membro` e `DELETE /:id/membro/:usuarioId` são `@GestorOnly` ([demanda.controller.ts:226](../../../backend/src/modules/demanda/controllers/demanda.controller.ts), [:241](../../../backend/src/modules/demanda/controllers/demanda.controller.ts)); o desenvolvedor não tem como entrar/sair de uma demanda. Deve poder **incluir/remover a si mesmo**.
- **Atividades da demanda — restrito demais.** `AtividadeService.listar()` força `usuarioId = self` para o desenvolvedor ([atividade.service.ts:86](../../../backend/src/modules/atividade/services/atividade.service.ts)), então mesmo sendo membro ele só vê as atividades **próprias** da demanda. Deve ver **todas** as atividades da demanda da qual é membro.
- **Visualização da demanda — já correta.** `recuperar()` já libera o desenvolvedor a visualizar qualquer demanda de projeto acessível e devolve `podeEditar` (gestor sempre; dev só quando membro) — task 39. Reaproveitar essa flag.
- **Frontend** — no `demanda-detalhe-dialog` a aba **Atividades**, a aba **Membros** (botão Adicionar e remoção por linha) e o botão **Editar** das Tags são todos `@if (sessao.eGestor())`; a **Conexões** já é gestor-only (correto). O FAB "Nova Demanda" da `demanda-projeto` e o "Nova Sub-demanda" do detalhe são gestor-only.

---

## Backend

### `demanda.service.ts`

**`criar()`** — exigir pai do desenvolvedor. Logo no início (antes ou junto da verificação de acesso ao projeto), adicionar:

```ts
if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR && dto.demandaPaiId === undefined) {
  throw new UnauthorizedAccessException('Desenvolvedor só pode criar sub-demandas (é obrigatório informar a demanda pai)');
}
```

- Manter as regras existentes (acesso ao projeto; pai no mesmo projeto; pai `isEstrutural`). O desenvolvedor **pode** criar sub-demanda estrutural — não filtrar `isEstrutural`.
- Gestor segue sem restrição (pode criar raiz).

**`criarConexao()`** — remover o caminho do desenvolvedor membro (linhas ~376–386): a ação passa a ser gestor-only (garantida pelo `@GestorOnly` no controller). Pode-se manter o parâmetro `usuarioAtivo` apenas se ainda usado; caso contrário, simplificar a assinatura para não recebê-lo (o controller deixa de repassá-lo).

**`alterarTagsDemanda()`** — passar a receber `usuarioAtivo: JwtPayload` e aplicar o gate de membro para o desenvolvedor, no mesmo molde de `alterar()`:

```ts
if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
  const eMembro = await this.demandaRepositorio.validarMembro({ demandaId, usuarioId: usuarioAtivo.sub });
  if (!eMembro) {
    throw new UnauthorizedAccessException('Você só pode atribuir tags em demandas das quais é membro');
  }
}
```

**`atribuirMembro()`** — passar a receber `usuarioAtivo` e diferenciar gestor de desenvolvedor:

- **Gestor**: comportamento atual (atribui qualquer `dto.usuarioId`).
- **Desenvolvedor**: só pode atribuir **a si mesmo** (`dto.usuarioId === usuarioAtivo.sub`) e desde que tenha **acesso ao projeto** da demanda. Caso contrário, `UnauthorizedAccessException('Desenvolvedor só pode incluir a si mesmo como membro')`.
  - Recuperar a demanda já acontece no método; usar `validarAcessoProjeto({ projetoId: demandaEncontrada.projetoId, usuarioId: usuarioAtivo.sub })` para a checagem de acesso.
- Manter a verificação de duplicidade (`validarMembro` → "já está atribuído").

**`removerMembro()`** — passar a receber `usuarioAtivo` e diferenciar:

- **Gestor**: comportamento atual (remove qualquer `usuarioId`).
- **Desenvolvedor**: só pode remover **a si mesmo** (`usuarioId === usuarioAtivo.sub`); senão `UnauthorizedAccessException`.
- Manter a regra do "último membro" (`contarMembrosDemanda <= 1` → `BusinessException`).

### `demanda.controller.ts`

- `POST /:id/conexao` (`criarConexao`): **adicionar** `@GestorOnly()`. Remover `@ActiveUser()`/repasse de `usuarioAtivo` se a assinatura do service deixou de exigi-lo.
- `PUT /:id/tag` (`alterarTagsDemanda`): **remover** `@GestorOnly()`; adicionar `@ActiveUser() usuarioAtivo` e repassar ao service.
- `POST /:id/membro` (`atribuirMembro`): **remover** `@GestorOnly()`; adicionar `@ActiveUser() usuarioAtivo` e repassar.
- `DELETE /:id/membro/:usuarioId` (`removerMembro`): **remover** `@GestorOnly()`; adicionar `@ActiveUser() usuarioAtivo` e repassar.
- `POST /:id` (`criar`), `DELETE /:id` (`excluir`), `DELETE /:id/conexao/:conexaoId`: **sem mudança** (excluir/excluirConexao permanecem `@GestorOnly`).

### `atividade.service.ts`

**`listar()`** — desenvolvedor membro vê todas as atividades da demanda. Substituir a regra atual (que sempre força `usuarioId = self`) por:

```ts
let filtrosEfetivos = filtros;
if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
  const eMembroDaDemanda =
    filtros.demandaId !== undefined &&
    await this.atividadeRepositorio.validarAcessoDemanda({
      demandaId: filtros.demandaId,
      usuarioId: usuarioAtivo.sub,
    });

  filtrosEfetivos = eMembroDaDemanda
    ? filtros                                   // membro: todas as atividades da demanda
    : { ...filtros, usuarioId: usuarioAtivo.sub }; // sem demandaId ou não-membro: só as próprias
}
```

- Quando o filtro **não** tem `demandaId` (ex.: autocomplete do seletor de execução), o desenvolvedor continua restrito às próprias atividades — comportamento atual preservado.
- `criar()`, `recuperar()`, `alterar()`, `alterarTags()` permanecem como estão (já gateiam por acesso/autoria à demanda).

---

## Frontend

### `demanda-detalhe-dialog` (`.ts` + `.html`)

Introduzir um `computed` de membresia reaproveitando a flag do backend:

```ts
readonly eMembro = computed(() => this.sessao.eGestor() || !!this.demanda()?.podeEditar);
```

- **Aba Atividades** (botão "Ver Atividades"): exibir apenas quando `eMembro()`. Para desenvolvedor não-membro, ocultar a aba (ou seu conteúdo) — ele não acessa as atividades da demanda.
- **Tags → botão "Editar"**: trocar `@if (sessao.eGestor())` por `@if (eMembro())` (gestor sempre; dev membro pode taguear). A dialog/salvamento de tags já existe; o backend agora autoriza o dev membro.
- **Nova Sub-demanda** (botões nos painéis de Sub-demandas): trocar `@if (sessao.eGestor())` por exibir **sempre** (gestor e desenvolvedor podem criar sub-demanda; o backend exige projeto acessível, que o usuário já tem por estar visualizando). O dialog (`demanda-formulario-dialog`) é aberto com `demandaPaiIdInicial` preenchido, garantindo o pai.
- **Editar** (edição completa) e **excluir** a demanda: permanecem `@if (sessao.eGestor())`.

### `demanda-membro-lista` (`.ts` + `.html`)

Auto-inclusão/auto-remoção do desenvolvedor:

- Computar `souMembro = computed(() => this.membros().some(m => m.usuarioId === this.sessao.id()))`.
- **Gestor**: mantém o botão "Adicionar" (multi-select) e o "X" de remoção por linha.
- **Desenvolvedor** (não-gestor):
  - Se **não** é membro: exibir botão "Participar" → `atribuirMembro(demandaId, { usuarioId: sessao.id()! })` → recarrega.
  - Se **é** membro: exibir botão "Sair" → `confirmarRemocao` de si mesmo → `removerMembro(demandaId, sessao.id()!)` → recarrega.
  - **Não** exibir o "X" de remoção nas linhas dos outros membros (continua gestor-only).
- Os métodos do `DemandaService` (`atribuirMembro`/`removerMembro`) já aceitam `usuarioId` arbitrário — sem mudança no service do frontend.

### `demanda-arvore-item` (`.ts`)

O menu de contexto da árvore hoje mostra todos os itens para qualquer usuário. Tornar o menu sensível à sessão (injetar `UsuarioSessaoService`; reconstruir `itensMenu` como **propriedade direta**, nunca getter — ver convenção de ContextMenu):

- **Visualizar** e as três descrições (Desc. Técnica/Cliente/Documentação): mantidas para todos (a edição segue gateada na dialog — task 39).
- **Nova Sub-demanda** (quando `isEstrutural`): manter para todos (gestor e dev criam sub-demanda).
- **Editar** e **Tags**: exibir **somente para gestor** na árvore. O desenvolvedor faz edição/tags pela dialog de detalhe, onde a membresia da demanda é conhecida (`podeEditar`). Evita expor ações que dependem de membresia em um contexto (árvore) onde o nó não carrega essa informação.

### `demanda-projeto` (`.html`)

- FAB **"Nova Demanda"** (cria demanda **raiz**, sem pai): manter `@if (sessao.eGestor() && projetoId())` — o desenvolvedor não cria demanda sem pai.

### Conexões

- `demanda-conexao-lista` já é gestor-only no frontend (botões dentro de `@if (sessao.eGestor())`) — **sem mudança**. Apenas o backend tightening (`@GestorOnly` no endpoint) é necessário.

---

## Arquivos afetados

```
backend/src/modules/demanda/services/demanda.service.ts        (criar: exige pai p/ dev; criarConexao: remove dev; alterarTagsDemanda/atribuirMembro/removerMembro: gate por tipo)
backend/src/modules/demanda/controllers/demanda.controller.ts  (conexao→GestorOnly; tag/membro: tira GestorOnly + @ActiveUser)
backend/src/modules/atividade/services/atividade.service.ts    (listar: membro vê todas as atividades da demanda)

frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.ts    (computed eMembro)
frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.html  (gating Atividades/Tags/Nova Sub-demanda)
frontend/src/app/modules/demanda/components/demanda-membro-lista/demanda-membro-lista.component.ts        (souMembro + auto-incluir/remover)
frontend/src/app/modules/demanda/components/demanda-membro-lista/demanda-membro-lista.component.html      (botões Participar/Sair)
frontend/src/app/modules/demanda/components/demanda-arvore-item/demanda-arvore-item.component.ts          (menu sensível à sessão)
```

---

## NÃO implementar nesta task

- Tabela `projeto_usuario` ou qualquer outra forma de acesso a projeto além de `demanda_usuario` — o modelo de acesso derivado permanece.
- Permitir desenvolvedor remover **outros** membros, criar conexão, excluir demanda ou editar descrição do cliente — seguem gestor-only.
- Mudança em DTO, repositório ou migration.
- Listagem inline das atividades dentro da aba Atividades do detalhe (continua sendo o botão "Ver Atividades" que navega para o módulo de atividades, agora já filtrado/autorizado pelo backend).
- Gating por membresia **por nó** na árvore (a árvore não carrega `podeEditar`/membresia de cada item) — por isso Editar/Tags na árvore ficam gestor-only e o desenvolvedor opera pela dialog de detalhe.
```
