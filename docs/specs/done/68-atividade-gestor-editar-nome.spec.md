# 68 — Atividade: gestor edita o nome no dialog de visualização (inline)

**Depende de:** 14 (atividade-module — `alterar` já aceita `nome`), 47 (`AtividadeVisualizarDialogComponent`), 46 (matriz de permissão de atividade — `alterar` libera gestor)

**Entrega:** no dialog de **visualização de uma atividade** ([atividade-visualizar-dialog](../../../frontend/src/app/modules/atividade/components/atividade-visualizar-dialog/atividade-visualizar-dialog.component.ts)), o **gestor** passa a poder **editar o nome** da atividade — para corrigir um nome que o usuário (desenvolvedor) tenha digitado errado. A edição é **inline no título** do dialog: ícone de lápis ao lado do nome (visível só para gestor); ao clicar, o título vira um `input` com botões salvar/cancelar.

> **Frontend apenas.** Sem backend, sem shared, sem migration. O `AtividadeService.alterar` (backend) já aceita `nome` e já libera gestor (spec 46), e `AtividadeAlterarDto.nome` já existe com `@MinLength(3) @MaxLength(255)`. Nada a mudar fora do frontend.

---

## Contexto

O dialog [atividade-visualizar-dialog.component.ts](../../../frontend/src/app/modules/atividade/components/atividade-visualizar-dialog/atividade-visualizar-dialog.component.ts) hoje:

- Mostra o nome **somente no header** do `p-dialog` (binding `[header]="atividadeVisualizada()?.nome || 'Atividade'"`), read-only.
- Já tem `FormBuilder`, `MessageService`, `AtividadeService` injetados e já chama `atividadeService.alterar(id, dto)` para salvar a **descrição** (`salvarDescricao()`), atualizando o signal `atividadeVisualizada` com a resposta. **Esse é o padrão a espelhar** para o nome.
- É aberto por 4 telas (`abrir(atividadeId)`): listagem de atividades, histórico de execução e ponto (2×). Nenhuma assina output algum hoje.

O backend ([atividade.service.ts](../../../backend/src/modules/atividade/services/atividade.service.ts) `alterar`) só restringe o **desenvolvedor** (autor ou membro da demanda); **gestor é sempre liberado**. Como o lápis só aparece para gestor (e o backend é a fonte da verdade), nenhuma checagem adicional de permissão é necessária no fluxo.

O `UsuarioSessaoService` ([usuario-sessao.service.ts](../../../frontend/src/app/core/services/usuario-sessao.service.ts)) expõe o computed `eGestor`.

---

## Decisões de escopo (registradas)

1. **Inline no título** (não campo no corpo, não sub-dialog) — escolhido na fase de brainstorming. Mantém o resto do dialog intacto; o nome corrigido reflete no próprio header ao salvar.
2. **Somente gestor edita.** O ícone de lápis é renderizado só `@if (sessao.eGestor())`. Desenvolvedor/membro continua vendo apenas o nome (read-only), exatamente como hoje.
3. **Refresh só na listagem de atividades.** O dialog ganha um output `aoAlterar` emitido ao salvar o nome; apenas [atividade-listagem.page.html](../../../frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html) o assina (`buscarAtividades()`). Histórico de execução e ponto **não** são alterados nesta task — exibem o nome novo só ao reentrar na tela. (Decisão do brainstorming.)
4. **Validação espelha o DTO:** `required`, `minLength(3)`, `maxLength(255)`. Trim antes de enviar.
5. **Sem mudança de descrição.** O fluxo de `salvarDescricao()`/aba Descrição permanece intocado.

---

## Frontend

### `AtividadeVisualizarDialogComponent` (`.ts`)

**Imports/injeções novos:**
- `output` de `@angular/core`; `Validators` de `@angular/forms`.
- `InputTextModule` (primeng) nos `imports` do componente, para o `pInputText` do título.
- Injetar `UsuarioSessaoService` numa propriedade pública `sessao` (acesso no template a `sessao.eGestor()`), no padrão dos demais componentes.

**Estado novo:**
```typescript
readonly editandoNome   = signal<boolean>(false);
readonly salvandoNome   = signal<boolean>(false);

readonly formularioNome = this.formBuilder.group({
  nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
});

readonly aoAlterar = output<void>();
```

**Métodos novos:**
```typescript
/** Entra no modo de edição do nome (só gestor), preenchendo o form com o nome atual. */
iniciarEdicaoNome(): void {
  const atividade = this.atividadeVisualizada();
  if (!atividade) return;
  this.formularioNome.reset({ nome: atividade.nome });
  this.editandoNome.set(true);
}

/** Sai do modo de edição sem salvar. */
cancelarEdicaoNome(): void {
  this.editandoNome.set(false);
}

/** Salva o novo nome (gestor). Atualiza o header, emite aoAlterar, fecha o modo de edição. */
salvarNome(): void {
  const atividade = this.atividadeVisualizada();
  if (!atividade || this.formularioNome.invalid) return;

  const nome = (this.formularioNome.value.nome ?? '').trim();
  this.salvandoNome.set(true);
  const dto: AtividadeAlterarDto = { nome };
  this.atividadeService
    .alterar(atividade.id, dto)
    .pipe(finalize(() => this.salvandoNome.set(false)))
    .subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          const alterada = resposta.dados;
          this.atividadeVisualizada.update((atual) => (atual ? { ...atual, nome: alterada.nome } : atual));
          this.editandoNome.set(false);
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Nome alterado' });
          this.aoAlterar.emit();
        }
      },
    });
}
```

> Ao reabrir o dialog (`abrir`), garantir que `editandoNome` volte a `false` (resetar em `abrir()`, junto dos demais `reset/set`).

### `AtividadeVisualizarDialogComponent` (`.html`)

O `p-dialog` deixa de usar `[header]` string e passa a usar um **template de header** (`<ng-template #header>` ou `pTemplate="header"`, conforme a versão do PrimeNG já usada no projeto):

- **Modo leitura** (`@if (!editandoNome())`): o nome (`atividadeVisualizada()?.nome || 'Atividade'`) + botão lápis ao lado, renderizado só `@if (sessao.eGestor() && atividadeVisualizada())`, chamando `iniciarEdicaoNome()`. Estilo de botão-ícone discreto (`p-button` `text`/`rounded` `pi pi-pencil`, ou `<button>` BEM resetado).
- **Modo edição** (`@else`): `form [formGroup]="formularioNome"` com `input pInputText formControlName="nome"` (autofocus) + botão ✔ (`pi pi-check`, `(click)="salvarNome()"`, `[loading]="salvandoNome()"`, `[disabled]="formularioNome.invalid || salvandoNome()"`) + botão ✗ (`pi pi-times`, `(click)="cancelarEdicaoNome()"`). Mensagem de erro abaixo quando `nome` inválido e `touched/dirty` (mín. 3 / obrigatório).

> Cuidado: o template de header substitui o título padrão — manter o botão de fechar (X) do `p-dialog` intacto (ele é separado do template de header no PrimeNG; não removê-lo).

### `AtividadeVisualizarDialogComponent` (`.scss`)

Classes BEM novas (português): `&__header`, `&__titulo`, `&__editar-nome` (botão lápis), `&__nome-form`, `&__nome-acoes`, `&__nome-erro`. Layout com flex (Tailwind nas utilidades). Cores via tokens `surface-*`/`primary` conforme convenção (compatível com tema claro/escuro).

### `AtividadeListagemPage` (`.html`)

Em [atividade-listagem.page.html](../../../frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html#L415):
```html
<app-atividade-visualizar-dialog #visualizarDialog (aoAlterar)="buscarAtividades()" />
```
> Confirmar o nome do método de recarga da listagem (`buscarAtividades`/equivalente) e usar o existente. As demais telas (ponto, execução-histórico) **não** são tocadas.

---

## Arquivos afetados

```
frontend/src/app/modules/atividade/components/atividade-visualizar-dialog/atividade-visualizar-dialog.component.ts    (estado/métodos/output/injeção)
frontend/src/app/modules/atividade/components/atividade-visualizar-dialog/atividade-visualizar-dialog.component.html  (header inline editável)
frontend/src/app/modules/atividade/components/atividade-visualizar-dialog/atividade-visualizar-dialog.component.scss  (classes BEM do header/edição)
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html                              (assina aoAlterar)
```

Sem backend, sem shared, sem migration.

---

## Verificação

1. `npm run build --workspace=frontend` OK (só warnings pré-existentes de budget/CommonJS).
2. **Gestor:** abre uma atividade na listagem → vê o lápis no título; clica → título vira input com o nome atual; altera e salva → toast "Nome alterado", header reflete o novo nome, e a **listagem recarrega** mostrando o nome corrigido.
3. **Validação:** nome com < 3 caracteres ou vazio → botão salvar desabilitado e mensagem de erro; cancelar (✗) sai do modo edição sem alterar.
4. **Desenvolvedor:** abre a mesma atividade (onde tem acesso) → **não** vê o lápis; só o nome read-only (comportamento atual preservado). Aba Descrição e demais campos inalterados.
5. **Outras telas:** abrir o dialog pelo histórico de execução/ponto continua funcionando (sem regressão); não precisam recarregar.
6. Linguagem/estilo: classes BEM em português, `.scss`, sem `style=""`/seletor de ID; nenhum DTO redefinido fora do `shared`.

---

## NÃO implementar nesta task

- Edição de **outros campos** no header (status, executor, tags) — só o nome.
- Refresh do **histórico de execução** e do **ponto** ao salvar o nome (decisão: só a listagem).
- Permitir **desenvolvedor/membro** editar o nome — é exclusivo de gestor no front (o backend já libera gestor; não afrouxar a regra do dev).
- Qualquer mudança em **backend/shared/migration** — o suporte a `nome` já existe ponta a ponta.
- Alterar o fluxo de **descrição** (`salvarDescricao`) ou a estrutura das abas.
