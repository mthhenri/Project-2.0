# PROBLEMS.md — Problemas Conhecidos

> **O que entra aqui:** o que está **quebrado, degradado ou aceito como dívida agora**. Um item
> existe aqui enquanto o problema existe. Quando o problema é resolvido, o item **sai deste
> arquivo** — o relato da correção vive em [`HISTORY.md`](HISTORY.md), não aqui.
>
> **O que NÃO entra aqui:** feature que falta (isso é spec no `docs/specs/backlog/`), ideia (isso
> é [`IDEAS.md`](IDEAS.md)), e decisão consciente de design que está funcionando como desejado
> (isso é `CONTEXT.md`).
>
> **Estados:** `ABERTO` (dói e não tem contorno) · `CONTORNADO` (dói, mas existe um jeito de
> conviver — o contorno está descrito) · `ACEITO` (não vai ser corrigido; fica registrado para
> ninguém "descobrir" de novo).
>
> **Formato de entrada** — copie o bloco abaixo, numere sequencialmente e **não reaproveite
> número de item removido**:
>
> ```markdown
> ### P-0NN — <título curto> · `ABERTO|CONTORNADO|ACEITO` · <área>
>
> - **Sintoma:** o que se observa.
> - **Causa:** a raiz, se conhecida — ou "não investigada".
> - **Contorno:** como conviver, se houver.
> - **Correção:** o que resolveria de fato, se conhecido.
> - **Desde:** quando apareceu (task/commit/data).
> ```

---

## Ativos

### P-001 — Projeto sem lint · `CONTORNADO` · repositório

- **Sintoma:** não há ESLint nem Prettier em nenhum workspace; o gate de qualidade do `CLAUDE.md` pede lint e hoje a lacuna é só declarada no fecho de cada task.
  (A parte de **testes** deste item foi resolvida pelas tasks 171–187: ver `HISTORY.md`, bloco da 187, com a cobertura de partida e a final.)
- **Causa:** o projeto foi construído verificando por build, testes e execução manual; nunca se escolheu nem configurou um linter.
- **Contorno:** `npm test` na raiz, `npm run test:integracao`, build dos workspaces e verificação ao vivo (skill `verify`); revisão do diff pela skill `conventions-check`.
- **Correção:** escolher e configurar lint e acrescentar ao CI (`IDEAS.md` I-002).
- **Desde:** origem do projeto.

### P-011 — Desenvolvedor membro não atribui tags, mas `SYSTEM.SPEC.md` §14 diz que pode · `ABERTO` · backend/documentação

- **Sintoma:** a service recusa o desenvolvedor em `alterarTagsDemanda` mesmo quando ele é membro da demanda; §14 ("Tags")
  diz que o desenvolvedor atribui tag apenas em demandas das quais é membro.
- **Causa:** divergência entre documento e código: a task 170 decidiu recusar o desenvolvedor sempre. O documento vence o código (CLAUDE.md), mas a decisão foi deliberada.
- **Contorno:** só o gestor atribui tags.
- **Correção:** o autor decide: (a) corrigir o código (membro atribui; teste `todo: 'P-011'` vira normal) ou (b) corrigir
  §14 para "somente o gestor atribui tags" e trocar o teste por um de recusa.
- **Desde:** task 170 (achado na task 176).

### P-013 — O dialog "Nova Atividade" não pré-seleciona a demanda passada em `abrir(demandaId)` · `ABERTO` · frontend

- **Sintoma:** depois de `abrir(10)`, o input `demandaIdInicial` vale 10, mas o controle `demandaId` do formulário continua vazio
  (achado no teste de componente; **não confirmado ao vivo**).
- **Causa:** o `AtividadeFormularioComponent` é projetado dentro do `p-dialog` e instanciado na montagem; o `ngOnInit` aplica o
  `demandaIdInicial` uma única vez, com ele ainda nulo. O estado do formulário também persiste entre aberturas, ao contrário do
  que o comentário do componente afirma.
- **Contorno:** o usuário escolhe a demanda no seletor.
- **Correção:** reagir à mudança de `demandaIdInicial` (efeito) ou recriar o formulário a cada abertura. O `it.todo` em
  `atividade-nova-dialog.component.spec.ts` vira teste normal. Confirmar ao vivo antes de corrigir.
- **Desde:** origem (achado na task 177).

### P-015 — Ponto diário cobra a meta cheia em fim de semana e dia não útil integral · `ABERTO` · backend

- **Sintoma:** `GET /ponto/diario` e `/ponto/todos` num sábado, domingo ou feriado integral devolvem `metaMinutos` igual à jornada (ex.: 480) e
  `saldoMinutos` negativo quando ninguém trabalhou. O mensal (`/ponto/mensal`) zera a meta desses mesmos dias, então o diário e o mensal discordam.
- **Causa:** `PontoService.montarPontoDiario` só trata a fração 0.5; no ramo "dias integrais" usa `metaMinutosCompleta` mesmo com `fracaoMeta = 0`.
  `SYSTEM.SPEC.md` §14 diz que fim de semana e dia não útil integral têm fração 0 e "não contam na meta".
- **Contorno:** a tela do card da equipe mostra o motivo no lugar do saldo em dia não útil, então o saldo errado quase não aparece; a IA
  (`consultar_ponto_do_dia`) devolve o `metaMinutos` e o `saldoMinutos` como vêm.
- **Correção:** meta 0 (descontada a justificativa, que então não deixa a meta negativa) quando `fracaoMeta === 0`; o saldo passa a ser só o
  trabalhado como extra, sem negativo. O `todo: 'P-015'` em `ponto.service.calculo.test.ts` vira teste normal. Confirmar com o autor se o saldo do
  dia não útil deve ser `0` ou o total trabalhado antes de corrigir.
- **Desde:** origem (achado na task 179).

### P-018 — O botão Enviar do chat e do check-in não dispara o envio · `ABERTO` · frontend

- **Sintoma:** no chat e na página do check-in (a mesma estrutura), no teste de componente, o clique em "Enviar" não chama `enviar()`; só o Enter (`aoTeclar`) e os botões de sugestão enviam. Em um navegador
  real o clique pode cair no submit nativo do `<form>` (recarregar a página) — **não confirmado ao vivo**.
- **Causa:** `chat.page.html` e `checkin.page.html` (linha 132) usam `<form (ngSubmit)="enviar()">` sem `[formGroup]`, e as duas páginas importam só `ReactiveFormsModule` (sem `FormsModule`/`NgForm`),
  então nenhuma diretiva emite o `ngSubmit`.
- **Contorno:** enviar com Enter ou por uma sugestão.
- **Correção:** `(click)="enviar()"` no botão (sem `type="submit"`), ou `[formGroup]` no formulário. Os `it.todo('P-018: ...')` em `chat.page.spec.ts` e `checkin.page.spec.ts` viram teste normal.
- **Desde:** origem da tela do chat; achado na task 185 (chat) e estendido na 186 (check-in).

### P-019 — A IA não acha, pelo nome, uma demanda em que o desenvolvedor ainda não está · `ABERTO` · backend

- **Sintoma:** como desenvolvedor, "quero participar da demanda Integracao com ERP" (projeto em que ele já tem outra demanda) recebe "não encontrei a demanda"; a IA só propõe a entrada se o usuário informar o **id**. A tela deixa o desenvolvedor abrir a demanda (`GET /demanda/:id` e o grafo do projeto respondem) e clicar em "Participar".
- **Causa:** `listar_demandas_do_projeto` chama `DemandaService.listar`, que para o desenvolvedor devolve só as demandas **dele** (`demanda_usuario`); nenhuma ferramenta lista as demais do projeto. A spec 170 pede "quero participar da demanda X".
- **Contorno:** informar o id da demanda na conversa (o cartão e a confirmação funcionam).
- **Correção:** uma leitura para o desenvolvedor que liste, nos projetos a que ele tem acesso, as demandas de trabalho com a marca "participa ou não" (a mesma visão do grafo), sem abrir a regra de `listar`.
- **Desde:** task 170; achado na verificação ao vivo de 2026-10-19 (`docs/specs/active/170-ia-edicao-de-demanda-participar-e-tags-do-desenvolvedor/VERIFICACAO-167-A-170.md`).
