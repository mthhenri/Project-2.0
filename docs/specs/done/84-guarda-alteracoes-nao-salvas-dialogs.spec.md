# 84 — Guarda de alterações não salvas ao fechar diálogos de editor

**Depende de:** 47/68 (padrão de dialogs PrimeNG), 77 (dirty-state `conteudoSalvo`/auto-save das anotações)

**Entrega:** ao **fechar** (X do cabeçalho, ESC ou botão Cancelar) qualquer diálogo de **editor de texto rico** cujo conteúdo foi editado mas ainda não persistido na base, o sistema abre um `p-confirmDialog` **"Alterações não salvas — Salvar / Descartar"**. **Salvar** persiste e fecha; **Descartar** fecha sem salvar. Sem alterações pendentes (ou em modo leitura), fecha direto, sem perguntar. Cobre os três pontos:

- **Anotações do usuário** — [usuario-anotacoes-dialog](../../../frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.ts)
- **Descrição técnica / descrição para o cliente / documentação da demanda** — nos **dois** diálogos que editam esses campos: [demanda-detalhe-dialog](../../../frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.ts) e [demanda-arvore-painel](../../../frontend/src/app/modules/demanda/components/demanda-arvore-painel/demanda-arvore-painel.component.ts) (descrição via context menu da árvore).

> **Frontend apenas.** Sem backend, sem shared, sem migration. Reaproveita os endpoints de `alterar` já existentes (`UsuarioService.alterar` p/ anotações; `DemandaService.alterar` p/ descrições).

---

## Contexto

Os três diálogos abrem um `p-editor` (Quill) em modal de tela cheia e salvavam **apenas** por botão "Salvar"/auto-save. Se o usuário digitava e fechava pelo X (ou ESC/Cancelar), a digitação não persistida era **perdida silenciosamente**. O pedido foi: em qualquer forma de fechar com alterações pendentes, **avisar e perguntar** se quer salvar.

- As **anotações** (task 77) já tinham `conteudoSalvo` (baseline), `temAlteracoesNaoSalvas` (computed) e auto-save de 30s; faltava a guarda no fechamento. O dialog já tinha `[closeOnEscape]="false"`/`[dismissableMask]="false"` (só o X fecha) e um `<p-confirmDialog key="anotacoes-limpar" />`.
- Os **dois dialogs de descrição** não tinham detecção de dirty nem confirm de fechamento. O `demanda-detalhe-dialog` já provia `ConfirmationService` + `<p-confirmDialog />` (usado na exclusão); o `demanda-arvore-painel` **não** tinha `ConfirmationService` nem `ConfirmDialogModule`.

---

## Decisões de escopo (registradas)

1. **"Fechar-e-perguntar", uniforme para X/ESC/Cancelar.** Em vez de "vetar" o fechamento mantendo o editor aberto, o diálogo **fecha de fato** e **em seguida** mostra o confirm. Motivo (PrimeNG 21): o `close()` interno do `p-dialog` seta `this._visible=false` imperativamente; como o valor do binding one-way (`signal()===true`) não muda, o Angular **não reescreve** o input e o diálogo fecha mesmo. Não dá para vetar sem desabilitar o close nativo — o que mataria o **ESC**, que faz parte do pedido. Trade-off aceito: o editor some da tela antes do confirm, mas nenhum dado é perdido (ver decisão 2).
2. **"Salvar" do confirm relê o `FormControl`**, que **persiste** após o editor desmontar. Verificado na fonte do `p-editor`: não há `ngOnDestroy` e `onModelChange` só é chamado em `source==='user'` — o teardown não zera o controle. Sem perda de dados.
3. **Baseline de dirty imune à normalização do Quill.** O `writeValue`→`setContents` do Quill usa `source==='api'`, ignorado pelo handler de `text-change`; logo o baseline (valor carregado do servidor) bate com o controle até o usuário digitar — **sem confirm espúrio** ao abrir+fechar sem editar.
4. **Estado coerente.** O handler chama `signal.set(false)` (fecha de fato) **antes** de abrir o confirm, evitando o bug de o signal ficar preso em `true` enquanto o PrimeNG já fechou (que impediria reabrir o mesmo campo).
5. **Modo leitura e caminho sem alterações fecham direto** (sem confirm). O botão "Fechar" (sem permissão de edição) e qualquer fechamento sem dirty não disparam a guarda.
6. **Semântica do DTO preservada.** `salvarDescricao` continua enviando `{ [campo]: valor ?? undefined }`; apenas passou a carimbar o baseline `descricaoConteudoSalvo` no sucesso.

---

## Frontend

### `usuario-anotacoes-dialog`

- **`.html`:** `[(visible)]="visivel"` + `(onHide)="aoFecharDialog()"` → **`[visible]="visivel()"` + `(visibleChange)="aoTentarFechar($event)"`**. Acrescentado `<p-confirmDialog key="anotacoes-fechar" />` ao lado do `anotacoes-limpar`.
- **`.ts`:** removido `aoFecharDialog`; novos:
  - `aoTentarFechar(visivel)` — ignora abertura; captura `precisaConfirmar = temAlteracoesNaoSalvas()`, chama `fecharEfetivamente()` e, se pendente, abre o confirm (`accept: salvarEFechar`, `reject: noop`).
  - `fecharEfetivamente()` — `visivel.set(false)`; emite `aoAlterar` se `houveAlteracao` (recarrega a listagem / brilho de `temAnotacoes`); reseta `houveAlteracao`.
  - `salvarEFechar()` — salva (reusa `conteudoSalvo`/`houveAlteracao`/`anotacoesAlteracaoData`) e, no sucesso, `fecharEfetivamente()`. O botão "Salvar Anotações" manual e o auto-save de 30s seguem intactos.

### `demanda-detalhe-dialog` e `demanda-arvore-painel` (mesmo padrão nos dois)

- **`.html`:** dialog de descrição passou de `[(visible)]="mostrarDialogDescricao"` para **`[visible]="mostrarDialogDescricao()"` + `(visibleChange)="aoTentarFecharDescricao($event)"`**; botão **Cancelar** passou de `mostrarDialogDescricao.set(false)` para **`aoTentarFecharDescricao(false)`** (o botão "Fechar" do modo leitura segue fechando direto). `demanda-detalhe-dialog`: segundo `<p-confirmDialog key="descricao-fechar" />` (o default sem key segue na exclusão). `demanda-arvore-painel`: `<p-confirmDialog key="descricao-fechar" />` novo no fim do template.
- **`.ts`:**
  - Novo signal `descricaoConteudoSalvo` (baseline), setado em `abrirDialogDescricao`/`abrirDialogDescricaoPorId` (= `valores[campo] ?? ''`) e no sucesso de `salvarDescricao`.
  - `descricaoTemAlteracoesNaoSalvas()` — `(form.value.valor ?? '') !== descricaoConteudoSalvo()`.
  - `aoTentarFecharDescricao(visivel)` — ignora abertura; `precisaConfirmar = podeEditarDescricaoAtual() && descricaoTemAlteracoesNaoSalvas()`; `mostrarDialogDescricao.set(false)`; se pendente abre o confirm `key="descricao-fechar"` (`accept: salvarDescricao`, `reject: noop`).
  - `demanda-arvore-painel` ganhou no componente: import `ConfirmDialogModule`, `ConfirmationService` em `imports`/`providers`/injeção.

---

## Arquivos afetados

```
frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.ts    (aoTentarFechar/fecharEfetivamente/salvarEFechar)
frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.html  ([visible]/visibleChange + confirmDialog)
frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.ts        (dirty + guarda de fechamento)
frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.html      ([visible]/visibleChange + Cancelar + confirmDialog)
frontend/src/app/modules/demanda/components/demanda-arvore-painel/demanda-arvore-painel.component.ts          (dirty + guarda + wiring ConfirmationService)
frontend/src/app/modules/demanda/components/demanda-arvore-painel/demanda-arvore-painel.component.html        ([visible]/visibleChange + Cancelar + confirmDialog)
```

Sem backend, sem shared, sem migration.

---

## Verificação

1. `npm run build --workspace=frontend` OK (só warnings pré-existentes de budget/CommonJS); `grep aoFecharDialog frontend` → 0.
2. **Anotações:** abrir, digitar, fechar pelo X → confirm "Alterações não salvas"; **Salvar** persiste (toast/auto-save mantêm `anotacoesAlteracaoData`) e a listagem recarrega; **Descartar** fecha sem salvar. Abrir+fechar sem digitar → fecha direto.
3. **Descrição (detalhe e árvore):** abrir descrição técnica/cliente/documentação, digitar, fechar por **X / ESC / Cancelar** → confirm; **Salvar** persiste e recarrega a demanda/árvore; **Descartar** descarta. Modo leitura (sem permissão) → "Fechar" fecha direto.
4. Sem confirm espúrio ao abrir+fechar sem editar (baseline imune à normalização do Quill).

> **Não exercitado:** runtime no browser — validação por build estático + inspeção da fonte do PrimeNG (`p-dialog` `close()`, `p-editor` sem `ngOnDestroy`/`source==='user'`).

---

## NÃO implementar nesta task

- Manter o editor **aberto** atrás do confirm (exigiria desabilitar o close nativo e, com ele, o ESC — fora do trade-off escolhido).
- Estender a guarda a **outros** diálogos/formulários (edição de demanda, formulários de criação etc.) — só os três editores de texto rico pedidos.
- Qualquer mudança em **backend/shared/migration**.
