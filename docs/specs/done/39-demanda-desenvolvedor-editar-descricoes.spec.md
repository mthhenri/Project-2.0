# 39 — Demanda: desenvolvedor edita descrição técnica e documentação

**Depende de:** 26 (frontend-demanda), 34 (atividade-descricoes-demanda)
**Entrega:** desenvolvedor atribuído passa a **visualizar todas as três descrições** (técnica, cliente e documentação) e a **editar a descrição técnica e a documentação** de uma demanda — tanto pela tela de demanda quanto pela tela de atividades. A **edição da descrição do cliente** permanece **exclusiva do gestor** (o desenvolvedor pode apenas visualizá-la).

> Backend (1 regra no service) + frontend (gating de botões + modo somente-leitura em duas telas). Sem migration, sem mudança de DTO.

---

## Verificação (estado atual)

Levantamento feito antes de escrever a spec — responde ao "verificar se o sistema está permitindo":

- **Backend** — `PUT /demanda/:id` ([demanda.controller.ts](../../../backend/src/modules/demanda/controllers/demanda.controller.ts) `alterar`) **não** é `@GestorOnly`. Em [demanda.service.ts](../../../backend/src/modules/demanda/services/demanda.service.ts) `alterar()`, o desenvolvedor já é autorizado a alterar demandas às quais está atribuído (via `recuperar({ id }, { usuarioId })`) e o UPDATE repassa as três descrições sem distinção. **Logo, hoje o backend permite que o desenvolvedor altere inclusive a `descricaoCliente`** — o que viola a regra desejada.
- **Frontend / tela de demanda** — em [demanda-detalhe-dialog.component.html](../../../frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.html) os botões "Desc. Técnica", "Desc. Cliente" e "Documentação" estão **todos** dentro de um único `@if (sessao.eGestor())` (junto de "Editar" e excluir). **Desenvolvedor não vê nem consegue visualizar nenhuma descrição.** Além disso, a dialog de descrição (`mostrarDialogDescricao`) **só tem modo edição** (`<textarea>` + `app-assistente-descricao` + "Salvar") — não há modo somente-leitura.
- **Frontend / tela de atividades** — em [atividade-listagem.page.ts](../../../frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts) os três botões de descrição já aparecem sempre e a dialog **já exibe o conteúdo em leitura** (`[innerHTML]`), portanto a **visualização das três descrições já funciona** para o desenvolvedor; o que está bloqueado é a **edição** — `podeEditarCampoDescricao()` exige `this.sessao.eGestor()`.

**Conclusão:** o sistema **não** permite hoje que o desenvolvedor edite descrição técnica/documentação (bloqueado no frontend nas duas telas) e, na tela de demanda, **sequer permite visualizar** as descrições. Inversamente, o backend **permite indevidamente** a edição da descrição do cliente pelo desenvolvedor. Esta task corrige os dois lados.

---

## Regra de negócio

- **Visualização** das três descrições (`descricaoTecnica`, `descricaoCliente`, `documentacao`): permitida a **gestor e desenvolvedor atribuído** à demanda.
- **Edição** de descrição técnica (`descricaoTecnica`) e documentação (`documentacao`): permitida a **gestor** e a **desenvolvedor atribuído à demanda**.
- **Edição** da descrição do cliente (`descricaoCliente`): **somente gestor**. O desenvolvedor pode apenas visualizá-la (modo somente-leitura).

---

## Backend

Em [demanda.service.ts](../../../backend/src/modules/demanda/services/demanda.service.ts) `alterar()`:

- Após recuperar a demanda (mantendo a verificação de acesso por `usuarioId` que já existe), adicionar a regra: se `usuarioAtivo.tipo === UsuarioTipoEnum.DESENVOLVEDOR` **e** `dto.descricaoCliente !== undefined`, lançar `UnauthorizedAccessException('Apenas gestores podem alterar a descrição do cliente')`.
  - Usar `!== undefined` (não truthiness) para barrar inclusive tentativa de limpar o campo (`''` ou `null`).
  - Manter intactas as demais alterações: o desenvolvedor continua podendo enviar `descricaoTecnica`, `documentacao`, `nome`, `status`, etc., desde que tenha acesso à demanda.
- Nenhuma mudança no controller (continua sem `@GestorOnly` — o gating fino é por campo, no service) e nenhuma mudança no repositório.

---

## Frontend — tela de demanda (`demanda-detalhe-dialog`)

Objetivo: desenvolvedor passa a **visualizar as três descrições** e a **editar técnica/documentação**; a descrição do cliente abre em **somente-leitura** para ele.

Em [demanda-detalhe-dialog.component.html](../../../frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.html), bloco `__cabecalho-acoes` hoje envolto por `@if (sessao.eGestor())`:

- Os **três** botões de descrição ("Desc. Técnica", "Desc. Cliente", "Documentação") passam a ser exibidos **sempre** (também para desenvolvedor) — são o ponto de entrada da visualização.
- "Editar" (edição completa via `demanda-edicao-dialog`) e o botão de excluir permanecem **somente gestor** (`@if (sessao.eGestor())`).
- Reorganizar o markup para os botões "sempre visíveis" ficarem fora do `@if` e os "somente gestor" dentro, sem alterar estilo/alinhamento de `__cabecalho-acoes`.

Em [demanda-detalhe-dialog.component.ts](../../../frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.ts):

- Adicionar `podeEditarDescricao(campo: CampoDescricao): boolean` → `this.sessao.eGestor() || campo !== 'descricaoCliente'` (técnica/documentação sempre editáveis; cliente só gestor). Pode-se expor também um `computed` `podeEditarDescricaoAtual` derivado de `campoDescricaoEditando()` para uso no template.
- Em `salvarDescricao()`, retornar cedo se `!this.podeEditarDescricao(campo)` (defesa em profundidade — o botão Salvar não aparece nesse caso).

Na dialog de descrição (`mostrarDialogDescricao`, ~linha 285 do HTML), introduzir **modo somente-leitura** quando `!podeEditarDescricaoAtual`:

- **Editável** (gestor, ou técnica/documentação): mantém o comportamento atual — `<textarea>` + `app-assistente-descricao` + footer "Cancelar"/"Salvar".
- **Somente-leitura** (desenvolvedor + `descricaoCliente`): exibir o conteúdo do campo como texto (ex.: bloco com o valor preservando quebras de linha, ou `<textarea readonly>`), **sem** `app-assistente-descricao`; footer apenas com "Fechar". Quando vazio, mostrar "Sem conteúdo".

Sem mudança em `abrirDialogDescricao()` (continua abrindo a dialog para qualquer campo) — o que muda é o conteúdo renderizado conforme a permissão.

---

## Frontend — tela de atividades (`atividade-listagem`)

Em [atividade-listagem.page.ts](../../../frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts):

- `podeEditarCampoDescricao()`: **remover** a exigência de `this.sessao.eGestor()`. Passa a retornar `!!campo && this.camposEditaveis.includes(campo)`.
  - `camposEditaveis` já é `['descricaoTecnica', 'documentacao']` — portanto `descricaoCliente` continua **não editável** nesta tela para todos (comportamento atual mantido; a edição do cliente, exclusiva do gestor, segue pela tela de demanda).
- `atualizarFlagDescricao()` já trata apenas `descricaoTecnica`/`documentacao` — sem mudança.
- Os três botões de descrição continuam aparecendo sempre (comportamento da task 34); apenas o botão "Editar" do footer da dialog deixa de exigir gestor.

> O backend restringe a listagem de atividades do desenvolvedor às suas próprias (cujas demandas ele acessa), então toda demanda alcançável por esta tela já é editável pelo desenvolvedor — a permissão fina permanece garantida no service.

---

## Arquivos afetados

```
backend/src/modules/demanda/services/demanda.service.ts                          (alterar: bloquear descricaoCliente p/ desenvolvedor)

frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.ts     (podeEditarDescricao + guard no salvar)
frontend/src/app/modules/demanda/components/demanda-detalhe-dialog/demanda-detalhe-dialog.component.html   (botões de descrição visíveis a todos + modo somente-leitura)
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts                     (podeEditarCampoDescricao sem eGestor)
```

---

## NÃO implementar nesta task

- Edição da **descrição do cliente** pela tela de atividades (permanece fora de `camposEditaveis`).
- Liberar para desenvolvedor o menu de contexto de descrição das **sub-demandas** na árvore ([demanda-arvore-item](../../../frontend/src/app/modules/demanda/components/demanda-arvore-item/demanda-arvore-item.component.ts)) — esse bloco é gestor-only por envolver também Editar/Tags/Nova sub-demanda; fica como follow-up.
- Botão "Editar" (edição completa da demanda) e exclusão — seguem exclusivos do gestor.
- Qualquer mudança em DTO, repositório ou migration.
```
