# 86 — Execução: encerramento automático ("auto-stop") na virada do dia

**Depende de:** 15 (execucao backend), 75 (datas timestamptz + fuso da aplicação)
**Entrega:** backend apenas — sem shared, sem frontend, sem migration

---

## Problema

Uma execução iniciada (`POST /execucao`) fica aberta (`fim_data IS NULL`) até o usuário
encerrá-la manualmente (`PATCH /execucao/:id/encerrar`) ou até um gestor registrá-la
retroativamente. Se o usuário esquecer de encerrar, a execução **atravessa a virada do dia**
e continua "rodando" no dia seguinte — o que é semanticamente errado (uma execução de
atividade não deveria abranger dois dias de calendário) e distorce os cálculos do módulo
`ponto` (`COALESCE(fim_data, NOW())` conta a duração até agora, inflando o dia seguinte caso
o usuário só encerre horas depois).

O sistema precisa **encerrar automaticamente, no servidor, todas as execuções abertas às
23:59:59 do dia** (no fuso da aplicação), sem depender de nenhuma ação do usuário. Isso também
resolve de graça o caso em que o usuário tentaria iniciar uma nova execução no dia seguinte e
seria bloqueado pela regra "não pode haver duas execuções ativas simultaneamente" (`SYSTEM.SPEC.md`
§14) por causa de uma execução esquecida do dia anterior.

---

## Contexto técnico (mapeado nesta sessão)

- Tabela `execucao` (`docs/SCHEMA.md`): `inicio_data`/`fim_data` são `TIMESTAMPTZ`; `fim_data`
  nullable enquanto em andamento; índice `ix_execucao_ativa` cobre `WHERE fim_data IS NULL`.
- `ExecucaoRepository.recuperarAtiva` e `validarSobreposicao`
  (`backend/src/modules/execucao/repositories/execucao.repository.ts`) já usam
  `fim_data IS NULL`/`COALESCE(fim_data, ...)` como padrão para "execução em andamento" — a
  query de encerramento em massa segue o mesmo padrão de filtro.
- `ConfigService.obter().aplicacao.fusoHorario` (`backend/src/config/config.service.ts`) já expõe
  `APP_TIMEZONE` (default `America/Sao_Paulo`) e é a **fonte única** do fuso da aplicação — já
  usado para fixar a sessão do banco (`database.provider.ts`, `SET TIME ZONE`) e no `relatorio.service.ts`.
  O agendamento desta task **reaproveita o mesmo valor** — nenhuma env var nova.
- **Não existe nenhuma infraestrutura de agendamento hoje** (`grep` por `schedule`/`cron`/`job` em
  `backend/src/` não retorna nada; `@nestjs/schedule` não está instalado). Esta task introduz a
  primeira dependência de scheduler do projeto.

---

## Decisões de escopo (registradas)

1. **Encerrar, não continuar.** O auto-stop apenas fecha a execução aberta com `fim_data` no
   fim do dia. **Não** cria uma execução nova no dia seguinte "continuando" o trabalho — se o
   usuário ainda estiver trabalhando à meia-noite, inicia uma nova execução manualmente no dia
   seguinte. Pedido do usuário é evitar que a execução "atravesse" o dia, não preservar o tempo.
2. **Todos os usuários, uma única passada.** O job é global (não por usuário): a cada disparo,
   encerra **todas** as execuções com `fim_data IS NULL` no sistema, não só de um usuário.
3. **Fuso dinâmico via `ConfigService`, nunca `process.env` direto** (§16 #10). Como o decorator
   `@Cron(expressao, { timeZone })` do `@nestjs/schedule` é avaliado na definição da classe —
   antes da injeção de dependência — **não é possível** passar `this.configService...` a ele
   diretamente. A solução é registrar o cron **dinamicamente** em `onModuleInit()` via
   `SchedulerRegistry.addCronJob(...)`, momento em que o `ConfigService` já foi injetado.
4. **`fim_data` é o instante real de disparo (`NOW()`), não um valor calculado.** O cron é
   agendado para disparar exatamente em `23:59:59` no fuso configurado (expressão cron com
   segundos: `59 59 23 * * *`); o `UPDATE` usa `NOW()` (mesmo padrão de `ExecucaoRepository.encerrar`,
   que usa `fimData: new Date()`), então `fim_data` fica, na prática, ~23:59:59 daquele dia.
5. **Sem catch-up para downtime.** Se o servidor estiver fora do ar exatamente às 23:59:59, o
   job simplesmente não dispara naquele dia — a execução esquecida é fechada no próximo disparo
   (dia seguinte). Não há verificação de "disparos perdidos" no boot. Aceito como risco residual
   (fora de escopo desta task).
6. **Sem alteração de `descricao`.** O auto-stop só define `fim_data` (+ `updated_date`) — o
   texto da descrição, gravado ao iniciar/atualizar, permanece intocado.
7. **Sem endpoint HTTP novo.** O job é 100% interno (chamado pelo scheduler); não há rota para
   disparo manual nesta task.

---

## Backend

### Dependências (`backend/package.json`)

Adicionar:
```json
"@nestjs/schedule": "^4.0.0",
"cron": "^3.1.0"
```

### `backend/src/app.module.ts`

Registrar o módulo de agendamento uma única vez, na raiz:
```typescript
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    // ...módulos existentes
    ScheduleModule.forRoot(),
  ],
})
export class AppModule {}
```

### `backend/src/modules/execucao/repositories/execucao.repository.ts`

**Novo método — `encerrarTodasAbertas(): Promise<ExecucaoEncerradaDto[]>`** (com JSDoc,
zero parâmetros — não há primitivo na assinatura porque não há parâmetro nenhum):

```typescript
/**
 * Encerra em massa todas as execuções em andamento do sistema (fim_data = NOW()),
 * usadas pelo job de auto-stop na virada do dia. Retorna as execuções encerradas
 * para fins de auditoria/log.
 */
async encerrarTodasAbertas(): Promise<ExecucaoEncerradaDto[]> {
  return this.executarConsulta<ExecucaoEncerradaDto>(
    `UPDATE execucao
     SET fim_data     = NOW(),
         updated_date = NOW()
     WHERE fim_data IS NULL
       AND is_deleted = false
     RETURNING
       id,
       atividade_id AS "atividadeId",
       descricao,
       inicio_data  AS "inicioData",
       fim_data     AS "fimData",
       EXTRACT(EPOCH FROM (fim_data - inicio_data))::int / 60 AS "duracaoMinutos"`,
  );
}
```

Reaproveita `ExecucaoEncerradaDto` já existente (`shared/src/dtos/execucao/`) — mesmo formato
de retorno de `encerrar()`; nenhum DTO novo no shared.

### `backend/src/modules/execucao/services/execucao.service.ts`

`ExecucaoService` passa a implementar `OnModuleInit` e injeta `SchedulerRegistry` (de
`@nestjs/schedule`) e `ConfigService` (se ainda não injetado no módulo).

**Novo — `onModuleInit(): void`** (com JSDoc): registra o cron dinamicamente com o fuso
resolvido do `ConfigService`:

```typescript
onModuleInit(): void {
  const fusoHorario = this.configService.obter().aplicacao.fusoHorario;
  const job = new CronJob('59 59 23 * * *', () => this.encerrarExecucoesAbertas(), null, true, fusoHorario);
  this.schedulerRegistry.addCronJob('execucao-auto-stop-virada-dia', job);
}
```

**Novo — `async encerrarExecucoesAbertas(): Promise<void>`** (com JSDoc — método público de
service, exigido por §16 #17): chama o repositório e loga o resultado via `Logger` do NestJS
(sem lançar `BusinessException` — não há requisição HTTP nem usuário associado a este fluxo):

```typescript
async encerrarExecucoesAbertas(): Promise<void> {
  const execucoesEncerradas = await this.execucaoRepositorio.encerrarTodasAbertas();
  this.logger.log(`Auto-stop: ${execucoesEncerradas.length} execução(ões) encerrada(s) na virada do dia`);
}
```

`private readonly logger = new Logger(ExecucaoService.name);` como propriedade da classe
(padrão NestJS — `Logger` é mecanismo genérico, nome da classe em inglês/técnico, sem violar §4).

> **Import:** `CronJob` vem do pacote `cron` (dependência direta, não só transitiva de
> `@nestjs/schedule`); `SchedulerRegistry` vem de `@nestjs/schedule`.

---

## Atualização de Documentação (obrigatória ao implementar)

1. **`docs/SYSTEM.SPEC.md` §14** (Regras de Negócio Fundamentais → subseção "Execuções") —
   acrescentar: *"Toda execução aberta (`fim_data IS NULL`) é encerrada automaticamente pelo
   servidor às 23:59:59 (fuso `APP_TIMEZONE`) — uma execução nunca atravessa a virada do dia."*
2. **`docs/SYSTEM.SPEC.md` §12** (tabela de módulos) — linha do módulo `execucao`: mencionar o
   job de auto-stop na virada do dia.
3. **`README.md`** — linha da variável `APP_TIMEZONE`: atualizar a descrição para deixar claro
   que ela também determina o horário local do disparo do auto-stop (hoje descrita só como fuso
   da sessão do banco).
4. **`docs/CONTEXT.md`** — ao concluir: mover a spec para `done/`, registrar a task em
   "Implementado", registrar a dependência nova (`@nestjs/schedule`/`cron`) em "Decisões Tomadas"
   (primeira infra de scheduler do projeto) e atualizar "Próxima Task".

---

## Arquivos afetados

```
backend/package.json                                              (+ @nestjs/schedule, cron)
backend/src/app.module.ts                                         (+ ScheduleModule.forRoot())
backend/src/modules/execucao/repositories/execucao.repository.ts  (+ encerrarTodasAbertas)
backend/src/modules/execucao/services/execucao.service.ts         (+ OnModuleInit, onModuleInit, encerrarExecucoesAbertas)

docs/SYSTEM.SPEC.md   (§12 tabela de módulos + §14 regras de negócio)
README.md             (descrição de APP_TIMEZONE)
docs/CONTEXT.md        (ao concluir a task)
```

---

## Verificação

1. `npm run build --workspace=backend` sem erros.
2. Subir a API (`npm run db:up` + backend) e criar manualmente uma execução aberta (`POST /execucao`).
3. **Teste de unidade/manual do job sem esperar até 23:59:59:** chamar
   `ExecucaoService.encerrarExecucoesAbertas()` diretamente (ex.: via teste unitário isolado, ou
   temporariamente por um script/REPL) e confirmar que a execução aberta criada no passo 2 recebe
   `fim_data = NOW()` e some de `GET /execucao/ativa` (passa a retornar `null`).
4. Confirmar no log da aplicação a linha `Auto-stop: N execução(ões) encerrada(s) na virada do dia`
   quando o job roda com `N ≥ 1`; com `N = 0` (nenhuma execução aberta) o job não falha.
5. Confirmar, inspecionando `SchedulerRegistry` (ou via log no `onModuleInit`), que o cron
   `execucao-auto-stop-virada-dia` foi registrado com o fuso de `APP_TIMEZONE` (não o fuso do SO
   do processo) — alterar `APP_TIMEZONE` no `.env` e reiniciar deve mudar o horário local de
   disparo sem mudar código.
6. Tentar iniciar uma nova execução (`POST /execucao`) imediatamente após o auto-stop fechar a
   execução do dia anterior — deve funcionar (a regra "duas execuções ativas" não bloqueia mais,
   pois a antiga já foi encerrada pelo job).
7. Conformidade: método de repositório com JSDoc e sem parâmetro primitivo; UPDATE com
   `is_deleted = false` e sem `VALUES`/`DEFAULT`; nenhum `process.env` direto no código do
   `ExecucaoService` (fuso sempre via `ConfigService`).

---

## NÃO implementar nesta task

- **Notificação/toast no frontend** avisando o usuário que a execução foi encerrada
  automaticamente — o frontend continua "eventually consistent" (só reflete o encerramento na
  próxima chamada a `GET /execucao/ativa`); um refresh proativo (ex.: `@HostListener('document:visibilitychange')`,
  já usado em `PontoPage`/`ExecucaoHistoricoPage`) fica de follow-up, se desejado.
- **Criar execução de continuação** no dia seguinte — decisão de escopo #1 acima.
- **Catch-up de disparos perdidos** por downtime do servidor — decisão de escopo #5.
- **Endpoint HTTP para disparo manual do auto-stop** — job é 100% interno ao processo.
- **Qualquer mudança de schema/migration** — nenhuma coluna nova; reaproveita `fim_data` existente.
