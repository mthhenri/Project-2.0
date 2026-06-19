# 47 — Perfil do usuário e atividade em dialog

**Depende de:** 24 (frontend-usuario), 27 (frontend-atividade), 28 (frontend-execucao)
**Entrega:** dois fluxos de "visualizar" que hoje navegam para uma tela passam a abrir um **dialog**:
(1) o perfil do usuário, aberto a partir da listagem de usuários; (2) a atividade, ao clicar nela
na tela de Execuções — reusando o mesmo dialog de visualização que já existe na tela de Atividades.

> Frontend apenas. Sem backend, sem mudança de DTO/endpoint, sem migration.

---

## Contexto

**Perfil do usuário** — na listagem ([usuario-listagem.page.ts](../../../frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts)),
`editarUsuario` navega para `/usuario/:id`, que carrega [UsuarioPerfilPage](../../../frontend/src/app/modules/usuario/pages/usuario-perfil/usuario-perfil.page.ts):
uma **tela** que exibe os dados do usuário (avatar, login, cargo, horas, tipo, status) e já contém
sub-dialogs de **Editar perfil** e **Alterar senha**, além do botão **Anotações** (que abre o
[UsuarioAnotacoesDialogComponent](../../../frontend/src/app/modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component.ts)).
A visualização em tela cheia é desnecessária — um dialog é mais adequado.

**Atividade nas execuções** — na tela de Execuções ([execucao-historico.page.html](../../../frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.html)),
o nome da atividade é um link `routerLink` para `/atividade/:id` ([AtividadeDetalhePage](../../../frontend/src/app/modules/atividade/pages/atividade-detalhe/atividade-detalhe.page.ts)).
A tela de Atividades ([atividade-listagem.page.html](../../../frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html))
**já tem** um dialog de visualização inline (`mostrarDialogVisualizar`) com abas **Descrição** e
**Últimas execuções** e edição da descrição. Esse mesmo dialog deve ser reusado nas Execuções.

**Padrão de dialog imperativo:** o `UsuarioAnotacoesDialogComponent` já expõe `abrir(...)` chamado
via template ref (`anotacoesDialog.abrir(...)`). Os dois novos componentes seguem esse padrão.

---

## Comportamento esperado

### Parte 1 — Perfil do usuário em dialog

- Novo componente standalone **`UsuarioPerfilDialogComponent`** em
  `frontend/src/app/modules/usuario/components/usuario-perfil-dialog/`, que **absorve toda a lógica**
  de `UsuarioPerfilPage`:
  - dialog principal com cabeçalho = nome do usuário e o conteúdo de visualização (avatar com
    iniciais, Login, Cargo, Horas diárias, Tipo e Status — tipo/status como `p-tag`);
  - os botões de ação **Editar**, **Alterar Senha** e **Anotações** quando `podeEditar()`
    (próprio usuário ou gestor), com os **mesmos sub-dialogs** de edição de perfil e troca de senha
    (mesmos formulários, validações e `salvar*` atuais) e o mesmo dialog de anotações;
  - sem o botão "Usuários"/voltar (não há mais navegação de volta).
- API do componente: método público **`abrir(usuarioId: number)`** — carrega o usuário
  (`UsuarioService.recuperar`) e exibe o dialog principal; output **`aoAlterar`** emitido quando o
  perfil é alterado com sucesso (para a listagem recarregar).
- **Listagem** ([usuario-listagem.page.ts](../../../frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts)):
  `editarUsuario` deixa de navegar e passa a abrir o dialog (`perfilDialog.abrir(usuario.id)`);
  o template ganha `<app-usuario-perfil-dialog #perfilDialog (aoAlterar)="buscarUsuarios()" />`.
- **Rotas / limpeza:**
  - remover a rota `:id` de [usuario.routes.ts](../../../frontend/src/app/modules/usuario/usuario.routes.ts)
    e **deletar** `UsuarioPerfilPage` (`.ts`/`.html`/`.scss`);
  - ajustar o redirect de [usuario-anotacoes.page.ts](../../../frontend/src/app/modules/usuario/pages/usuario-anotacoes/usuario-anotacoes.page.ts)
    de `/usuario/:id` para `/usuario` (o alvo deixa de existir);
  - a rota `:id/anotacoes` permanece inalterada.

### Parte 2 — Atividade em dialog nas execuções

- Novo componente standalone **`AtividadeVisualizarDialogComponent`** em
  `frontend/src/app/modules/atividade/components/atividade-visualizar-dialog/`, extraído do dialog
  de visualização inline da listagem de atividades — **mesmo conteúdo e comportamento**: cabeçalho
  com nome, executor (avatar + nome) e total de atividades, chips de tags, abas **Descrição**
  (com `p-editor` + salvar) e **Últimas execuções**.
- API do componente: método público **`abrir(atividadeId: number)`** — carrega atividade, tags e
  execuções (mesmo `forkJoin` atual) e exibe o dialog.
- **Listagem de atividades** ([atividade-listagem](../../../frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts)):
  `abrirAtividade` passa a delegar ao componente extraído (`visualizarDialog.abrir(atividade.id)`);
  remover do `atividade-listagem` o bloco `<p-dialog>` de visualização inline e os signals/métodos
  que passaram a viver no componente (`atividadeVisualizada`, `tagsVisualizar`, `execucoesVisualizar`,
  `carregandoVisualizar`, `salvandoDescricao`/`salvarDescricao` da visualização, e o
  `formularioDescricao` se não usado em outro fluxo da página). **Sem regressão visual ou funcional**
  na visualização da listagem de atividades.
- **Execuções** ([execucao-historico.page.html](../../../frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.html)):
  o link `routerLink` da coluna **Atividade** vira um elemento clicável (botão/link estilizado) que
  chama `visualizarDialog.abrir(execucao.atividadeId)`; adicionar `<app-atividade-visualizar-dialog #visualizarDialog />`
  no template e o import no componente.

---

## Arquivos afetados

```
# Parte 1 — perfil
frontend/src/app/modules/usuario/components/usuario-perfil-dialog/   (novo: .ts/.html/.scss)
frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts
frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.html
frontend/src/app/modules/usuario/pages/usuario-perfil/                (deletado)
frontend/src/app/modules/usuario/usuario.routes.ts
frontend/src/app/modules/usuario/pages/usuario-anotacoes/usuario-anotacoes.page.ts

# Parte 2 — atividade
frontend/src/app/modules/atividade/components/atividade-visualizar-dialog/  (novo: .ts/.html/.scss)
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts
frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.html
frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts
frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.html
```

---

## NÃO implementar nesta task

- Remover a rota `/atividade/:id` ou a `AtividadeDetalhePage` — continuam em uso por execução ativa,
  ponto e pós-criação de atividade.
- Trocar os demais links para `/atividade/:id` (ponto-mes-dia, ponto-usuario-card, execucao-ativa)
  por dialog — só a tela de Execuções foi pedida.
- Qualquer mudança em DTO, service, endpoint ou banco.
- Alterar as regras de permissão de edição (perfil ou descrição da atividade) — apenas mover o código.
