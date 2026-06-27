# Task 73 — frontend: Remover ngModel do seletor-cor

## Objetivo

Eliminar o uso de `ngModel`/`FormsModule` no componente `seletor-cor`, alinhando 100% à
proibição de **template-driven forms** (`SYSTEM.SPEC.md` §8.2 / `CONVENTIONS.md`). O
componente é um `ControlValueAccessor` que embrulha o `p-colorpicker` do PrimeNG e hoje
dirige o picker via `[ngModel]`/`(ngModelChange)`; trocar por Reactive Forms interno
(`FormControl` + `[formControl]`), preservando o CVA consumido pelos pais.

> **Referência cruzada:** audit de consistência (C2). A `AUDITORIA.md` (task 44) afirmava
> "ngModel/template-driven (0)"; este uso foi adicionado depois (componente `seletor-cor`).

---

## Contexto

`seletor-cor` é um wrapper de controle de terceiros (PrimeNG `p-colorpicker`), exposto via
`NG_VALUE_ACCESSOR` para ser usado com **Reactive Forms** pelos formulários de
projeto/tag/calendário. Internamente, porém, ele liga o `p-colorpicker` por
`[ngModel]="cor()"` + `(ngModelChange)="atualizarDoPicker($event)"`, o que importa
`FormsModule` e é, literalmente, template-driven. A constituição proíbe template-driven
forms; a forma correta de embrulhar um controle de terceiros é um `FormControl` interno
ligado por `[formControl]` (ReactiveFormsModule).

---

## Escopo

### 1. Trocar o binding do `p-colorpicker`

**Arquivos:** `frontend/src/app/shared/components/seletor-cor/seletor-cor.component.ts` e `.html`

**Situação atual:**
- `.ts` importa `FormsModule` e usa um `signal` `cor` como fonte do valor.
- `.html` (`seletor-cor.component.html:6-7`):
  ```html
  [ngModel]="cor()"
  (ngModelChange)="atualizarDoPicker($event)"
  ```

**Correção esperada:**
- Trocar `FormsModule` por `ReactiveFormsModule` no `imports` do componente.
- Introduzir um `FormControl<string>` interno (ex.: `controleCor = new FormControl('#3b82f6', { nonNullable: true })`).
- No template, ligar o `p-colorpicker` por `[formControl]="controleCor"` (remover `[ngModel]`/`(ngModelChange)`).
- Sincronizar o CVA com o controle interno:
  - `writeValue(valor)` → `controleCor.setValue(valor ?? '#3b82f6', { emitEvent: false })`.
  - `controleCor.valueChanges` (no construtor/`ngOnInit`, com `takeUntilDestroyed`) → propaga via `aoMudar`/`aoTocar` (substitui `atualizarDoPicker`).
  - `setDisabledState` → `controleCor.disable()/enable({ emitEvent: false })` (mantém o `desabilitado` signal se ainda usado pelos botões de cor predefinida).
- Preservar o restante do componente (grade de cores predefinidas, `digitarHex`, `corSelecionada`) — esses já usam clique/eventos, não `ngModel`.
- Garantir que `selecionarPredefinida`/`digitarHex` atualizem o `controleCor` (e portanto o CVA) em vez do signal `cor` diretamente — manter uma única fonte de verdade.

### 2. Conferir ausência de regressão

- Os formulários que usam `<app-seletor-cor formControlName="cor">` (projeto, tag, calendário)
  continuam funcionando — o CVA não muda de contrato externo.
- Nenhum `[(ngModel)]`/`[ngModel]`/`(ngModelChange)` remanescente no componente.

---

## Atualização de Documentação (obrigatória)

1. `CONVENTIONS.md` (Estilos/Frontend ou seção Angular) — reforçar: "sem template-driven
   forms / sem `ngModel`"; ao embrulhar um controle de terceiros, usar `ControlValueAccessor`
   + `FormControl` interno (`[formControl]`), nunca `ngModel`.
2. `docs/AUDITORIA.md` — errata pontual: o achado "0 ngModel" foi posterior ao componente
   `seletor-cor`; corrigido por esta task (cruzar com a errata da task 69/D4).

---

## Verificação

1. `npm run build --workspace=frontend` OK (só warnings pré-existentes de budget/CommonJS).
2. `grep -rn "ngModel\|FormsModule" frontend/src` — nenhuma ocorrência (ou apenas usos legítimos não-form, se houver; idealmente zero).
3. Runtime: abrir o formulário de projeto/tag/calendário — selecionar cor pela paleta, pelo `p-colorpicker` e digitando hex; o valor reflete no Reactive Form do pai e salva corretamente.
4. `setDisabledState` desabilita o picker quando o controle do pai está `disabled`.

---

## NÃO implementar nesta task

- Tocar outros componentes/formulários (todos já são Reactive Forms).
- Mudar o contrato externo do `seletor-cor` (continua `ControlValueAccessor` via `formControlName`).
- Reconciliação documental (59), DTO core (63), constraints (60), `!`/JSDoc (61).
