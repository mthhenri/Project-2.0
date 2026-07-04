# 92 — Corrigir `iniciar` execução: gestor inicia qualquer atividade; validação recai sobre o dono

**Depende de:** 15/41 (execução + duração), 71 (gestor acesso total sem atribuição via `demanda_usuario`), 86 (auto-stop na virada do dia)

**Entrega:** corrige dois bugs no `POST /execucao` (`ExecucaoService.iniciar`) que impedem o **gestor** de iniciar execução — tanto **de outros usuários** quanto **a sua própria**. A causa é a mesma: `iniciar` valida acesso e execução ativa contra **quem dispara** (`usuarioAtivo.sub`) usando `demanda_usuario`, mas **gestores não têm linha em `demanda_usuario`** e a execução pertence sempre ao **dono da atividade**, não ao disparador.

> Backend apenas: módulo `execucao` (`services/execucao.service.ts`, método `iniciar`). **Sem** mudança de contrato (DTO/rota), **sem** frontend, **sem** shared, **sem** migration. O frontend já libera o play para o gestor em qualquer atividade e já reflete execução de terceiros — nada a mudar lá.

---

## Contexto / causa raiz

Uma `execucao` **não tem coluna de usuário**: o dono é derivado por `execucao → atividade.usuario_id`. Logo, "iniciar para outro usuário" é simplesmente iniciar **na atividade daquele usuário** — o `atividadeId` já identifica o dono. O endpoint não precisa (e não deve) receber usuário-alvo.

Hoje, [execucao.service.ts:89-100](../../../backend/src/modules/execucao/services/execucao.service.ts#L89-L100) faz duas validações contra o **disparador**:

```typescript
const temAcesso = await this.atividadeRepositorio.validarAcessoDemanda({
  demandaId: atividadeEncontrada.demandaId,
  usuarioId: usuarioAtivo.sub,            // ← o gestor, não o dono
});
if (!temAcesso) throw new UnauthorizedAccessException(...);

const execucaoAtiva = await this.execucaoRepositorio.recuperarAtiva({
  usuarioId: usuarioAtivo.sub,            // ← o gestor, não o dono
});
if (execucaoAtiva) throw new BusinessException('Você já tem uma execução em andamento...');
```

`validarAcessoDemanda` ([atividade.repository.ts:315](../../../backend/src/modules/atividade/repositories/atividade.repository.ts#L315)) exige linha em `demanda_usuario`. Mas, por decisão vigente, **o gestor NÃO é atribuído a `demanda_usuario` por ser gestor** — ver o comentário em [demanda.repository.ts:121-125](../../../backend/src/modules/demanda/repositories/demanda.repository.ts#L121-L125) (só o criador desenvolvedor e membros selecionados recebem linha). Isso contradiz o texto antigo do `CLAUDE.md` ("auto-assigns the creator and all active gestores"), que está **desatualizado**.

Consequências:

1. **Gestor não inicia atividade de outro usuário** → `403` "Usuário não tem acesso à demanda desta atividade" (gestor sem linha em `demanda_usuario` daquela demanda); **ou**, se tiver a própria execução ativa, `400` "Você já tem uma execução em andamento".
2. **Gestor não inicia a própria atividade** → mesmo `403`: sua própria atividade vive numa demanda onde ele também não é membro de `demanda_usuario`.
3. **Bug latente de invariante**: como a checagem de execução ativa usa o disparador, o **dono** poderia acabar com **duas execuções ativas** simultâneas — violando "sem duas execuções ativas por usuário".

O padrão correto de autorização já existe nos irmãos `encerrar`/`alterar`/`recuperar` ([execucao.service.ts:184-189](../../../backend/src/modules/execucao/services/execucao.service.ts#L184-L189)): **gestor = acesso total; desenvolvedor = apenas as próprias** (via dono da atividade). `iniciar` deve seguir o mesmo padrão. O `listar` também já trata gestor **sem** filtro por `demanda_usuario` ([execucao.service.ts:232-233](../../../backend/src/modules/execucao/services/execucao.service.ts#L232-L233)).

---

## Decisões de escopo (registradas)

1. **Sem usuário-alvo no contrato.** `ExecucaoIniciarDto` permanece `{ atividadeId, descricao? }`. O dono é o de `atividade.usuario_id`. Não há novo DTO nem rota.
2. **Autorização por tipo, igual aos irmãos.** Gestor inicia qualquer atividade; desenvolvedor **só** as próprias (`atividadeEncontrada.usuarioId === usuarioAtivo.sub`). Remove-se a checagem por `demanda_usuario` do `iniciar` (ela nunca foi o critério certo aqui — a posse da atividade é).
3. **Invariante recai sobre o dono.** `recuperarAtiva` passa a consultar `atividadeEncontrada.usuarioId` (dono), não `usuarioAtivo.sub`. Assim o gestor pode ter a própria execução ativa e ainda iniciar/gerir a de outro; e o dono nunca fica com duas ativas.
4. **Mensagem contextual.** Quando o dono é o próprio disparador → "Você já tem uma execução em andamento…"; quando é outro usuário → "O usuário desta atividade já tem uma execução em andamento…".
5. **`descricaoObrigatoria` inalterada.** Já deriva do **tipo do dono** da atividade ([execucao.service.ts:374-377](../../../backend/src/modules/execucao/services/execucao.service.ts#L374-L377)) — correto para todos os casos.
6. **Status executável inalterado.** Continua exigindo `PLANEJADA`/`DESENVOLVENDO`.

---

## Backend — módulo `execucao`

### `services/execucao.service.ts` → `iniciar`

Substituir o bloco [linhas 89-100](../../../backend/src/modules/execucao/services/execucao.service.ts#L89-L100) por autorização baseada em posse + invariante sobre o dono. Forma pretendida:

```typescript
// Autorização: gestor inicia qualquer atividade; desenvolvedor apenas as próprias.
// A execução pertence sempre ao dono da atividade (execucao → atividade.usuario_id),
// então "iniciar para outro usuário" é iniciar na atividade daquele usuário — o
// atividadeId já identifica o dono, e o gestor não precisa de linha em demanda_usuario.
if (
  usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR &&
  atividadeEncontrada.usuarioId !== usuarioAtivo.sub
) {
  throw new UnauthorizedAccessException(
    'Desenvolvedor não pode iniciar execução em atividade de outro usuário',
  );
}

// A regra "sem duas execuções ativas por usuário" recai sobre o DONO da atividade,
// não sobre quem dispara — o gestor pode ter a própria execução ativa e ainda assim
// iniciar a de outro usuário.
const execucaoAtiva = await this.execucaoRepositorio.recuperarAtiva({
  usuarioId: atividadeEncontrada.usuarioId,
});
if (execucaoAtiva) {
  throw new BusinessException(
    atividadeEncontrada.usuarioId === usuarioAtivo.sub
      ? 'Você já tem uma execução em andamento. Encerre-a antes de iniciar outra'
      : 'O usuário desta atividade já tem uma execução em andamento. Encerre-a antes de iniciar outra',
  );
}
```

- `usuarioAtivo.tipo` e `TipoUsuarioEnum` já disponíveis no arquivo (mesmo padrão de `encerrar`).
- A chamada a `atividadeRepositorio.validarAcessoDemanda` **sai** do `iniciar`. O método permanece no repositório (não removê-lo — pode ter outros usos); apenas deixa de ser chamado aqui.
- Atualizar o JSDoc do método `iniciar` (linhas 67-70): ele descreve "para o usuário autenticado" e "acesso via demanda_usuario" — reescrever para refletir que inicia para o **dono da atividade**, com autorização gestor-total/dev-próprio.

Nenhuma mudança no repositório de execução: `recuperarAtiva({ usuarioId })` já aceita qualquer usuário.

---

## Arquivos afetados

```
backend/src/modules/execucao/services/execucao.service.ts   (método iniciar: autorização + invariante sobre o dono + JSDoc)
```

Sem shared, sem frontend, sem migration, sem mudança de rota/DTO.

---

## Verificação

1. `npm run build --workspace=backend` sem erros novos.
2. **Gestor inicia a própria atividade** (status PLANEJADA/DESENVOLVENDO) → `201`, execução criada com `fim_data = NULL`. (Antes: `403`.)
3. **Gestor inicia atividade de um desenvolvedor** → `201`; a execução pertence ao desenvolvedor (aparece na listagem/ponto do dev). (Antes: `403`.)
4. **Gestor com a própria execução ativa** inicia atividade de outro usuário → `201` (a execução do gestor não bloqueia). (Antes: `400` "Você já tem…".)
5. **Invariante do dono:** com o desenvolvedor já tendo execução ativa, tentar iniciar **outra** atividade **dele** (via gestor ou via o próprio dev) → `400` "…já tem uma execução em andamento", com a mensagem contextual conforme o disparador.
6. **Desenvolvedor tentando iniciar atividade de outro usuário** → `403` "Desenvolvedor não pode iniciar execução em atividade de outro usuário".
7. **Desenvolvedor inicia a própria** → `201` (inalterado).
8. **Status não-executável** (ex.: CONCLUIDA) → `400` inalterado; **atividade inexistente** → `404` inalterado.
9. **Descrição:** dono desenvolvedor sem descrição → `400` "A descrição é obrigatória"; dono gestor sem descrição → `201` (inalterado).
10. **Ponta a ponta (frontend):** como gestor, clicar play numa atividade de outro usuário na listagem → inicia sem erro; o card de ponto daquele usuário passa a mostrar execução ativa; encerrar soma a duração corretamente.

---

## NÃO implementar nesta task

- **Usuário-alvo explícito no DTO/rota** — desnecessário; o dono é o da atividade.
- **Registro manual de execução encerrada** — já existe em `POST /execucao/registro` (`registrar`), fora desta task.
- **Reintroduzir gestores em `demanda_usuario`** ou mudar o modelo de acesso — a decisão vigente (gestor = acesso total sem atribuição) é mantida; aqui só se alinha o `iniciar` a ela.
- **Qualquer mudança de frontend/shared/schema.**
- **Corrigir o texto desatualizado do `CLAUDE.md`** sobre auto-atribuição de gestores — registrar à parte (não é código).
