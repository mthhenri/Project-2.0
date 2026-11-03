# 308-usuarios-editor-dos-textos-dos-tipos.spec.md

> Origem: pedido do autor em 2026-11-03, ao revisar a ajuda "Tipos de usuário" da [task 306](../done/306-usuarios-legenda-dos-tipos.spec.md):
> "temos que abrir um local de edição destes textos para o Admin". **Reverte a decisão da 306** de o texto morar só no código.

## Objetivo

O administrador edita, pela própria aplicação, os textos que explicam cada tipo de usuário ("o que é", "Pode" e "Não pode"), sem depender de deploy.
Os textos editados aparecem na ajuda "Tipos de usuário" e no bloco do formulário de criar e editar usuário.

## Decisões finais (autor, 2026-11-03)

1. **Quem edita:** só o administrador; gestor e demais leem. A rota `PUT` é `@AdministradorOnly` e a service confere de novo.
2. **Igual ao "Alterar prioridades":** botão de cabeçalho "Alterar textos dos tipos" (`secondary`, `outlined`, só administrador) que abre um dialog simples (`p-dialog` modal, `dismissableMask`, rodapé só com "Fechar"; conteúdo criado a cada abertura), com uma linha por tipo: tag, campo, **Salvar texto**, **Descartar** (só quando mudou) e **Restaurar padrão**.
3. **Texto livre em Markdown, sem estrutura** (proposta do autor, adotada no lugar das listas estruturadas e da tabela de itens): o texto de cada tipo é uma string; linhas que começam com `✓` (pode, verde) ou `✕` (não pode, vermelho) ganham o ícone **só na tela**; `###` vira título; o resto segue como Markdown comum. O editor é um campo de texto com dois botões, **✓ Pode** e **✕ Não pode**, que põem a marca no começo da linha do cursor (e trocam a que já existe).
4. **Texto padrão:** `DESCRICAO_TIPO_USUARIO` (`shared`) em Markdown, por tipo; semeia o banco e é o que "Restaurar padrão" devolve ao campo (ainda é preciso salvar). Enquanto a API não responde, a tela mostra esse padrão.
5. **Onde guarda:** coluna `tipo_usuario.ajuda_markdown VARCHAR(2000) NOT NULL` (migration `0078`), sem tabela nova.
6. **API:** `GET /tipo-usuario-ajuda` (gestor e administrador) e `PUT /tipo-usuario-ajuda/:tipo` (só administrador); texto aparado, vazio e acima de 2000 caracteres recusados. O Markdown é exibido pelo visualizador do sistema (sem HTML cru).
7. **Aviso no dialog:** o texto é ajuda, não permissão.
8. **Sem histórico de versões** (só o texto atual e o "Restaurar padrão").

> Desenho descartado no meio da task: frase + duas listas estruturadas (`ajuda_que_e` e a tabela `ajuda_tipo_usuario_item`). Foi implementado e testado, e trocado por esta versão a pedido do autor.

## Fatos do código (2026-11-03)

- Hoje o front lê `DESCRICAO_TIPO_USUARIO` direto do `shared` (`usuario-tipo-descricao`); o tooltip da tag na tabela foi **retirado** a pedido do autor (2026-11-03); o análogo de tela é `atividade-prioridades-dialog` + `prioridades-cores` (só administrador, na listagem de atividades). Popover e bloco do formulário seguem.
- `tipo_usuario` tem `codigo` e `descricao` (nome de exibição) semeados pelas migrations 0025, 0029 e 0074; o repository traduz `codigo` ⇄ id.

## Verificação

Ver `308-usuarios-editor-dos-textos-dos-tipos/verificacao.md`.
