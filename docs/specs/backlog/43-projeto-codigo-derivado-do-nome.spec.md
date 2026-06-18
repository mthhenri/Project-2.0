# 43 — Projeto: código derivado automaticamente do nome

**Depende de:** 25 (frontend-projeto)
**Entrega:** no formulário de criação de projeto, o campo **Código** é preenchido
automaticamente a partir do **Nome** (mesmo texto, formatado como código), poupando
o gestor de digitar as duas coisas — que na prática quase sempre são a mesma. O campo
permanece **editável**: se o gestor digitar um código próprio, a sincronização automática
para de sobrescrevê-lo.

> Somente frontend. Sem backend, sem DTO novo, sem migration.

---

## Princípio de UX

Nome e código de projeto normalmente representam a mesma coisa, só que o código segue
um formato técnico (maiúsculas, sem espaços/acentos). Digitar os dois separadamente é
trabalho redundante. A solução é o padrão consagrado de "slug derivado do título":

- Enquanto o gestor digita o **Nome**, o **Código** acompanha, derivado e formatado.
- No instante em que o gestor **edita o Código manualmente**, ele assume o controle —
  o Nome para de sobrescrever o que foi digitado.
- Se o gestor **apagar todo o Código**, a derivação automática **volta a valer** (a forma
  de "pedir o padrão de volta").

Nenhum dado some: o Código continua sendo um campo normal do formulário, validado e
enviado ao backend como hoje. A única mudança é o auto-preenchimento.

---

## Contexto

Hoje, em [`ProjetoFormularioPage`](../../frontend/src/app/modules/projeto/pages/projeto-formulario/),
o formulário tem `nome` e `codigo` como campos independentes e obrigatórios. O código
é exibido em maiúsculas só visualmente (CSS `text-transform: uppercase` em
`&__input-codigo`) e normalizado com `.toUpperCase()` ao montar o `ProjetoCriarDto`.

O `codigo` **só existe na criação** — `ProjetoService.alterar` (backend) ignora o
campo (`ProjetoAlterarDto` nem o declara, "Código não pode ser alterado"). Portanto
esta task atua **exclusivamente** no formulário de criação. Não há mudança na edição
do projeto.

A validação de unicidade do código no backend (`validarCodigo` → `BusinessException`
"Código de projeto já está em uso") permanece intacta: se a derivação gerar um código
já existente, o gestor verá o erro normal e poderá ajustar manualmente.

---

## Frontend

### Helper puro em [`projeto.model.ts`](../../frontend/src/app/modules/projeto/models/projeto.model.ts)

Função pura, sem dependência de Angular, no mesmo espírito dos helpers de outros models
(`segundosDecorridos`, `formatarDataIso`, etc.):

```typescript
/**
 * Deriva um código de projeto a partir do nome: maiúsculas, sem acentos,
 * caracteres não-alfanuméricos viram hífen. Limitado a 50 caracteres
 * (MaxLength do campo no ProjetoCriarDto).
 *
 * Ex.: 'Sistema de Gestão' → 'SISTEMA-DE-GESTAO'
 */
export function gerarCodigoDoNome(nome: string): string {
  return nome
    .normalize('NFD')                 // separa letras de seus diacríticos
    .replace(/[\u0300-\u036f]/g, '') // remove os acentos
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')      // qualquer sequência não-alfanumérica → um hífen
    .replace(/^-+|-+$/g, '')          // remove hífens das pontas
    .slice(0, 50)                     // respeita o limite do campo
    .replace(/-+$/g, '');             // remove hífen que tenha sobrado no corte dos 50
}
```

### `ProjetoFormularioPage` (`.ts`)

1. **Flag de controle** — novo signal `codigoEditadoManualmente = signal<boolean>(false)`.

2. **Nome → Código** — no construtor (ou `ngOnInit`), assinar
   `formulario.get('nome')!.valueChanges`: enquanto `!codigoEditadoManualmente()`,
   atualizar o controle `codigo` com `gerarCodigoDoNome(nome ?? '')` usando
   `setValue(..., { emitEvent: false })` — o `emitEvent: false` evita disparar o
   `valueChanges` do próprio `codigo` (que marcaria edição manual e criaria laço).

3. **Edição manual do Código** — assinar `formulario.get('codigo')!.valueChanges`
   (que, graças ao `emitEvent: false` acima, só dispara em digitação do usuário):
   - se o novo valor estiver **vazio** (`''`/só espaços), `codigoEditadoManualmente.set(false)`
     — a derivação automática volta a valer e o próximo caractere do nome repreenche o código;
   - caso contrário, `codigoEditadoManualmente.set(true)` — o gestor assumiu o campo.

4. As assinaturas devem ser encerradas no destroy do componente — usar
   `takeUntilDestroyed(this.destroyRef)` (`inject(DestroyRef)`), padrão do projeto para
   `valueChanges`, sem `Subject` manual.

5. `salvar()` permanece como está (já faz `.toUpperCase()` no `codigo` ao montar o DTO);
   nenhuma regra de envio muda.

### `ProjetoFormularioPage` (`.html`)

- O input de `codigo` continua com `formControlName="codigo"`. **Não** adicionar handler
  de `(input)` — a detecção de edição manual já vem do `valueChanges` do controle.
- Ajustar o `placeholder` do código para refletir o novo comportamento, ex.:
  `placeholder="Gerado a partir do nome"`.
- Opcional (UX): um `<small>` discreto sob o campo, do tipo
  "Preenchido automaticamente pelo nome — edite se quiser um código próprio",
  exibido apenas enquanto `!codigoEditadoManualmente()`.

### `ProjetoFormularioPage` (`.scss`)

- Sem mudança obrigatória; `&__input-codigo` (uppercase visual) permanece. Se o
  `<small>` opcional for adicionado, reaproveitar o estilo de dica/erro existente.

---

## Arquivos afetados

```
frontend/src/app/modules/projeto/models/projeto.model.ts                              (gerarCodigoDoNome)
frontend/src/app/modules/projeto/pages/projeto-formulario/projeto-formulario.page.ts  (sync nome→codigo + flag)
frontend/src/app/modules/projeto/pages/projeto-formulario/projeto-formulario.page.html (placeholder / dica opcional)
```

Sem backend, sem DTO, sem migration.

---

## Critérios de aceite

- Digitar "Sistema de Gestão" no nome (sem tocar no código) → código vira `SISTEMA-DE-GESTAO`.
- Continuar digitando o nome atualiza o código em tempo real.
- Editar o código manualmente (ex.: `PROJ-001`) → digitar mais no nome **não** sobrescreve
  mais o código.
- Apagar todo o código depois de editado → a derivação automática volta a acompanhar o nome.
- Salvar continua enviando o código em maiúsculas; a validação de código duplicado do
  backend segue funcionando.

---

## NÃO implementar nesta task

- Tornar o código editável na alteração do projeto (continua imutável após a criação).
- Geração/sugestão de código no backend ou verificação de unicidade em tempo real
  (a checagem de duplicado permanece no submit, como hoje).
- Aplicar o mesmo padrão a outras entidades (ex.: tags) — escopo é só projeto.
- Garantir unicidade automática anexando sufixos numéricos ao código derivado.
