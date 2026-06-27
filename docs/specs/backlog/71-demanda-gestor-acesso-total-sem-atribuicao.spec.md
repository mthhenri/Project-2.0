# 71 — Demanda: gestor com acesso total sem auto-atribuição + listagem de demandas (criação de atividade) só planejadas/pendentes

**Depende de:** 06 (usuario-module), 10 (demanda-crud), 14 (atividade-module), 46 (demanda-permissoes-visualizacao)
**Entrega:** dois ajustes relacionados ao acesso do gestor às demandas.

1. **Auto-atribuição:** ao criar uma demanda, **parar de gerar linhas em `demanda_usuario` para os gestores**. O gestor tem acesso completo a qualquer demanda e a qualquer projeto **por ser gestor** — não precisa (e não deve depender) de `demanda_usuario`. Apenas o **criador desenvolvedor** continua sendo atribuído (é assim que o acesso do desenvolvedor é derivado).
2. **Listagem de demandas na criação de atividade** (`GET /demanda/atribuidas`): passar a listar **somente demandas planejadas/pendentes** (`status IN ('PLANEJADA','PENDENTE')` — ou seja, **exclui `CONCLUIDA`**) e, como consequência da mudança 1, devolver ao **gestor todas** as demandas (não-concluídas) de todos os projetos, já que ele deixa de ter linhas em `demanda_usuario`.

> Backend apenas (service + repository de `demanda` e `atividade` + 1 ajuste no `DemandaAtribuicaoInserirDto` do `shared`). **Sem migration. Sem mudança de frontend.**

---

## Contexto / verificação do estado atual

Levantamento feito antes de escrever a spec:

- **Auto-atribuição atribui todos os gestores.** `DemandaService.criar()` chama `usuarioRepositorio.listarGestoresAtivos()` e passa `gestorIds` para `DemandaRepository.inserirComAtribuicao()`, que insere uma linha em `demanda_usuario` para o **criador** e para **cada gestor ativo** ([demanda.service.ts:94](../../../backend/src/modules/demanda/services/demanda.service.ts), [demanda.repository.ts:122](../../../backend/src/modules/demanda/repositories/demanda.repository.ts)). Isso é redundante: o gestor já enxerga tudo por ser gestor.
- **Acesso do gestor já é "tudo" em quase todo o módulo.** `listar()`/`recuperar()`/`alterar()`/`recuperarGrafo()` etc. usam `usuarioId = undefined` para gestor (sem filtro de `demanda_usuario`) — o gestor não depende da tabela ([demanda.service.ts:133](../../../backend/src/modules/demanda/services/demanda.service.ts)). **Exceções que hoje só funcionam por causa da auto-atribuição** (precisam ser corrigidas nesta task):
  - **`GET /demanda/atribuidas`** (`listarAtribuidas`) filtra **sempre** por `demanda_usuario` ([demanda.repository.ts:268](../../../backend/src/modules/demanda/repositories/demanda.repository.ts)). Sem a auto-atribuição, o gestor passaria a ver **nenhuma** demanda na criação de atividade. **Tem de devolver tudo para o gestor.**
  - **`AtividadeService.criar()`** valida `validarAcessoDemanda` para **todos** os usuários, inclusive gestor ([atividade.service.ts:52](../../../backend/src/modules/atividade/services/atividade.service.ts)). Sem a auto-atribuição, o gestor não conseguiria criar atividade em demanda nenhuma. **A checagem tem de ser apenas para desenvolvedor** (mesmo padrão de `recuperar`/`alterar`/`listarTags` do próprio service, que já gateiam só o desenvolvedor).
- **`listarAtribuidas` não filtra por status.** Hoje devolve a demanda esteja ela `PENDENTE`, `PLANEJADA` **ou `CONCLUIDA`** — não há `WHERE ... status` ([demanda.repository.ts:268](../../../backend/src/modules/demanda/repositories/demanda.repository.ts)). Resposta à verificação pedida: **não**, a listagem de demandas da criação de atividade **não** está restrita a planejadas/pendentes hoje.
- **Status de demanda (estado real do banco).** O enum de negócio é `PENDENTE`, `PLANEJADA`, `CONCLUIDA` ([demanda-status.enum.ts](../../../shared/src/enums/demanda-status.enum.ts)); o CHECK no banco é `('PENDENTE','PLANEJADA','CONCLUIDA')` (migration `20240013_alterar_status_demanda`). Portanto "planejadas/pendentes" = `status IN ('PLANEJADA','PENDENTE')` = **tudo que não é `CONCLUIDA`**.
  > Obs.: o `SCHEMA.md` ainda descreve o CHECK antigo (`'PLANEJADA','EM_DESENVOLVIMENTO','CONCLUIDA'`) — divergência pré-existente, **fora do escopo** desta task corrigir.

---

## Backend

### `shared` — `DemandaAtribuicaoInserirDto`

O DTO atual modela "criador + lista de gestores":

```ts
export class DemandaAtribuicaoInserirDto {
  criadorId: number;
  gestorIds: number[];
}
```

Como gestor não é mais atribuído, o conceito vira simplesmente "quais usuários atribuir à demanda na criação". Trocar por uma lista única:

```ts
export class DemandaAtribuicaoInserirDto {
  usuarioIds: number[];
}
```

- Pode ser `[]` (demanda criada por gestor → nenhuma atribuição) ou `[idDoCriadorDesenvolvedor]`.
- Não é alias/re-export de outro DTO (mantém a regra §23).

### `demanda.service.ts` — `criar()`

- **Remover** a chamada a `this.usuarioRepositorio.listarGestoresAtivos()` e o cálculo de `gestorIds`.
- Montar a lista de atribuição **apenas com o criador desenvolvedor**:

```ts
const usuarioIds =
  usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR ? [usuarioAtivo.sub] : [];
```

- Chamar `this.demandaRepositorio.inserirComAtribuicao(dados, { usuarioIds })`.
- Se `this.usuarioRepositorio` deixar de ser usado em qualquer outro método do service, remover a injeção (verificar antes — `atribuirMembro` ainda usa `usuarioRepositorio.recuperar`, então provavelmente **permanece**).
- Manter intactas todas as validações já existentes de `criar()` (dev exige `demandaPaiId`; acesso ao projeto do dev; pai no mesmo projeto; pai `isEstrutural`).

### `demanda.repository.ts` — `inserirComAtribuicao()`

Ajustar a assinatura e o corpo para a lista única, mantendo a transação atômica:

```ts
async inserirComAtribuicao(
  dados: DemandaCriarDados,
  dto: DemandaAtribuicaoInserirDto,
): Promise<DemandaCriadaDto> {
  return this.conexaoBancoDados.transaction(async (transacao) => {
    const demandaCriada = await this.inserir(dados, transacao);
    for (const usuarioId of dto.usuarioIds) {
      await this.inserirDemandaUsuario({ demandaId: demandaCriada.id, usuarioId }, transacao);
    }
    return demandaCriada;
  });
}
```

- `inserirDemandaUsuario()` permanece como está.
- Com `usuarioIds = []` (criação por gestor) a demanda é inserida **sem** nenhuma linha em `demanda_usuario`.

### `demanda.repository.ts` — `listarAtribuidas()`

Hoje recebe `usuarioId: number` e filtra **sempre** por `demanda_usuario`, sem status. Passar a:

1. **Filtrar por status** (planejadas/pendentes) em todos os casos.
2. Aceitar o caso **gestor = ver tudo** (sem join em `demanda_usuario`).

Como o repositório não deve receber primitivos soltos (§16 #21) e precisa diferenciar gestor de desenvolvedor, introduzir um DTO interno em `shared` para a chamada — por exemplo `DemandaAtribuidasListarDto`:

```ts
// shared/src/dtos/demanda/DemandaAtribuidasListarDto.ts
export class DemandaAtribuidasListarDto {
  usuarioId: number;
  apenasAtribuidas: boolean; // true → desenvolvedor (filtra por demanda_usuario); false → gestor (todas)
}
```

E o método:

```ts
async listarAtribuidas(dto: DemandaAtribuidasListarDto): Promise<DemandaAtribuidaDto[]> {
  const joinAtribuicao = dto.apenasAtribuidas
    ? `INNER JOIN demanda_usuario
         ON demanda_usuario.demanda_id = demanda.id
         AND demanda_usuario.usuario_id = :usuarioId
         AND demanda_usuario.is_deleted = false`
    : '';

  return this.executarConsulta<DemandaAtribuidaDto>(
    `SELECT demanda.id,
            demanda.nome,
            projeto.id   AS "projetoId",
            projeto.nome AS "nomeProjeto"
     FROM demanda
     ${joinAtribuicao}
     INNER JOIN projeto
       ON projeto.id = demanda.projeto_id
       AND projeto.is_deleted = false
     WHERE demanda.is_deleted = false
       AND demanda.status IN ('PLANEJADA', 'PENDENTE')
     ORDER BY projeto.nome ASC, demanda.nome ASC`,
    { usuarioId: dto.usuarioId },
  );
}
```

- Manter os parâmetros nomeados; `usuarioId` continua presente no objeto mesmo quando o join não é usado (inofensivo).
- O filtro de status pode usar os valores literais `'PLANEJADA','PENDENTE'` (mesmo estilo do `recuperarGrafo`/CTEs do arquivo) ou os membros de `DemandaStatusEnum` interpolados via parâmetro — preferir parâmetros nomeados se for trivial; literais são aceitáveis por seguirem o CHECK do banco. **Nunca** usar interpolação de variável de runtime.

### `demanda.service.ts` — `listarAtribuidas()`

Passar a diferenciar o tipo do usuário e montar o DTO:

```ts
async listarAtribuidas(
  usuarioAtivo: JwtPayload,
): Promise<StandardResponse<DemandaAtribuidaDto[]>> {
  const demandas = await this.demandaRepositorio.listarAtribuidas({
    usuarioId: usuarioAtivo.sub,
    apenasAtribuidas: usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR,
  });

  return {
    sucesso: true,
    dados: demandas,
    mensagem: 'Demandas atribuídas listadas com sucesso',
  };
}
```

### `atividade.service.ts` — `criar()`

A checagem de acesso à demanda deve valer **somente para desenvolvedor** (gestor tem acesso total e não tem mais linha em `demanda_usuario`). Envolver a verificação existente:

```ts
if (usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR) {
  const temAcesso = await this.atividadeRepositorio.validarAcessoDemanda({
    demandaId: dto.demandaId,
    usuarioId: usuarioAtivo.sub,
  });
  if (!temAcesso) {
    throw new UnauthorizedAccessException('Usuário não tem acesso à demanda informada');
  }
}
```

- O cálculo de `executorId` (gestor pode informar `dto.usuarioId`; desenvolvedor é sempre o próprio) permanece **inalterado**.
- Isso alinha `criar()` ao padrão já usado em `recuperar()`/`alterar()`/`listarTags()` do mesmo service, que só gateiam o desenvolvedor.

### Swagger / docstrings

- Ajustar o `@ApiOperation` do `POST /demanda` ([demanda.controller.ts:35](../../../backend/src/modules/demanda/controllers/demanda.controller.ts)) — hoje diz "auto-atribui criador e gestores ativos"; passar para algo como "auto-atribui o criador desenvolvedor (gestor tem acesso total sem atribuição)".
- Ajustar o `@ApiOperation` do `GET /demanda/atribuidas` ([demanda.controller.ts:95](../../../backend/src/modules/demanda/controllers/demanda.controller.ts)) para refletir "planejadas/pendentes; gestor vê todas".
- Atualizar a docstring de `DemandaService.criar()` e `inserirComAtribuicao()` (não mencionar mais "todos os gestores ativos").

---

## Efeitos colaterais esperados (e aceitáveis)

- A **lista de membros** (`GET /demanda/:id/membro`) de demandas criadas por gestor passa a vir **vazia** (ou só com desenvolvedores que entrarem depois) — coerente com "gestor tem acesso por ser gestor, não por membresia". A auto-inclusão/saída do desenvolvedor (task 46) continua funcionando.
- O desenvolvedor **criador** de uma sub-demanda continua membro (atribuído na criação), preservando seu acesso de edição (`podeEditar`, tasks 39/46).
- A regra de "último membro" e os fluxos de `atribuirMembro`/`removerMembro` permanecem como na task 46 — **sem mudança**.

---

## Atualização documental obrigatória

Esta task **altera regra de negócio documentada**. Atualizar, na mesma sessão de implementação:

- **`docs/SYSTEM.SPEC.md` §14 "Demandas"** — a frase "o sistema auto-atribui automaticamente o criador (desenvolvedor ou gestor) e **todos os gestores ativos** via `demanda_usuario`" deve passar a refletir: auto-atribui **apenas o criador desenvolvedor**; gestor tem acesso total a qualquer demanda/projeto independentemente de `demanda_usuario`.
- **`docs/SYSTEM.SPEC.md` §13 "DemandaUsuario"** — a nota sobre derivação de acesso deve deixar claro que a tabela deriva acesso **do desenvolvedor**; o gestor não depende dela.
- **`docs/CONTEXT.md`** — registrar a task concluída e mover o estado conforme o workflow.

---

## Arquivos afetados

```
shared/src/dtos/demanda/DemandaAtribuicaoInserirDto.ts     (criadorId/gestorIds → usuarioIds)
shared/src/dtos/demanda/DemandaAtribuidasListarDto.ts       (novo — usuarioId + apenasAtribuidas)
shared/src/dtos/demanda/index.ts (barrel)                   (exportar o novo DTO, se houver barrel)

backend/src/modules/demanda/services/demanda.service.ts     (criar: só criador-dev; listarAtribuidas: por tipo)
backend/src/modules/demanda/repositories/demanda.repository.ts (inserirComAtribuicao: lista única; listarAtribuidas: status + gestor vê tudo)
backend/src/modules/demanda/controllers/demanda.controller.ts  (textos Swagger)
backend/src/modules/atividade/services/atividade.service.ts (criar: validarAcessoDemanda só p/ desenvolvedor)

docs/SYSTEM.SPEC.md  (§13 DemandaUsuario, §14 Demandas)
docs/CONTEXT.md
```

---

## Verificação

1. `npm run build --workspace=shared` — compila sem erros.
2. `npm run build --workspace=backend` (ou `tsc --noEmit`) — compila sem erros.
3. **Gestor cria demanda** → nenhuma linha em `demanda_usuario` (`SELECT * FROM demanda_usuario WHERE demanda_id = <nova>` → vazio).
4. **Desenvolvedor cria sub-demanda** → exatamente **1** linha em `demanda_usuario` (ele mesmo).
5. **Gestor** chama `GET /demanda/atribuidas` → recebe **todas** as demandas não-concluídas de todos os projetos; demandas `CONCLUIDA` **não** aparecem.
6. **Desenvolvedor** chama `GET /demanda/atribuidas` → recebe só as demandas atribuídas a ele **e** não-concluídas.
7. **Gestor cria atividade** em qualquer demanda (sem ter linha em `demanda_usuario`) → sucesso (não recebe mais 403 "sem acesso à demanda").
8. **Desenvolvedor** tenta criar atividade em demanda da qual não é membro → segue recebendo 403.

---

## NÃO implementar nesta task

- Mudança em migration ou no schema do banco (apenas o filtro de status na query; o CHECK já existe).
- Filtrar a listagem por `is_estrutural` ou qualquer outro critério além de **status** — o pedido é apenas "planejadas/pendentes".
- Alterar o fluxo de `atribuirMembro`/`removerMembro`/regra do último membro (task 46 permanece).
- Qualquer alteração de frontend — o `atividade-listagem.page.ts` consome `listarAtribuidas()` sem conhecer o filtro; o comportamento muda só no backend.
- Corrigir a divergência do `SCHEMA.md` sobre o CHECK de status (`EM_DESENVOLVIMENTO`) — fora do escopo.
