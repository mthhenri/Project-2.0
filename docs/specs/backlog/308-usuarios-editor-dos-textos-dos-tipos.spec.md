# 308-usuarios-editor-dos-textos-dos-tipos.spec.md

> Origem: pedido do autor em 2026-11-03, ao revisar a ajuda "Tipos de usuário" da [task 306](../done/306-usuarios-legenda-dos-tipos.spec.md):
> "temos que abrir um local de edição destes textos para o Admin". **Reverte a decisão da 306** de o texto morar só no código.

## Objetivo

O administrador edita, pela própria aplicação, os textos que explicam cada tipo de usuário ("o que é", "Pode" e "Não pode"), sem depender de deploy.
Os textos editados aparecem na ajuda "Tipos de usuário" e no bloco do formulário de criar e editar usuário.

## Decisões (autor, 2026-11-03, e propostas do agente a confirmar)

1. **Quem edita:** só o administrador (`temPermissaoDeAdministrador`); os demais **leem**. A rota de edição é protegida no backend, não só escondida na tela.
2. **Igual ao "Alterar prioridades" das atividades** (decisão do autor): um botão de cabeçalho, **só para o administrador**, no mesmo estilo (`secondary`, `outlined`, ícone), ao lado de "Tipos de usuário" e "Novo Usuário", rótulo **"Alterar textos dos tipos"**. Ele abre um **dialog simples**, no molde do `atividade-prioridades-dialog` (`p-dialog` modal, `dismissableMask`, rodapé só com "Fechar"; o conteúdo nasce a cada abertura por `@if (visivel())`) e do `prioridades-cores` (uma linha por item, **Salvar**, **Descartar** só quando mudou, erro curto, esqueleto enquanto carrega). Aqui são quatro linhas, uma por tipo, com a tag do tipo (a mesma cor da tabela), o campo de texto e **Salvar texto**, **Descartar** e **Restaurar padrão**.
3. **O texto é Markdown, um por tipo** (hipótese do autor, adotada): o campo usa o editor de Markdown que o sistema já tem (`app-markdown-editor`) e a ajuda mostra com `app-markdown-visualizador`. O padrão vira um Markdown com "o que é" e as seções **Pode** e **Não pode** em lista. **Troca a estrutura da 306** (frase + duas listas com ✓ e ✕ desenhados pelo componente) por texto livre: o ganho é editar do jeito que quiser, o custo é perder os ícones ✓/✕ por item (o padrão usa os títulos "Pode" e "Não pode"). Se o autor preferir manter os ícones, a alternativa é três campos por tipo (frase e duas listas) no mesmo dialog.
4. **Texto padrão:** `DESCRICAO_TIPO_USUARIO` (`shared`, task 306) passa a ser **valor padrão em Markdown**, por tipo. Tipo nunca editado usa o padrão; **"Restaurar padrão"** volta a ele. O teste "todo tipo tem texto" continua valendo.
5. **Onde guarda:** a decidir ao abrir a task (skill `sql-migrations`). Padrão proposto: coluna `ajuda_markdown` (texto) em `tipo_usuario`, nula = padrão, sem `DEFAULT`. A coluna `descricao` (nome de exibição) não muda.
6. **API:** `GET` dos textos por quem acessa a tela de Usuários (já com o padrão onde nada foi editado, para o front não precisar do `shared`); `PUT` por tipo, só administrador, com DTO nomeado pela skill `project20-dto-conventions`, com limite de tamanho. O Markdown é renderizado pelo visualizador do sistema (sem HTML cru), como as demais descrições.
7. **Aviso no dialog:** uma linha explicando que o texto é **ajuda**, não permissão: o que cada tipo realmente pode vem de `SYSTEM.SPEC.md` §14 e do código.
8. **Sem histórico de versões** nesta task (só o texto atual e o "Restaurar padrão"); auditoria de quem mudou vira task à parte se o autor quiser.

## Fatos do código (2026-11-03)

- Hoje o front lê `DESCRICAO_TIPO_USUARIO` direto do `shared` (`usuario-tipo-descricao`); o tooltip da tag na tabela foi **retirado** a pedido do autor (2026-11-03); o análogo de tela é `atividade-prioridades-dialog` + `prioridades-cores` (só administrador, na listagem de atividades). Popover e bloco do formulário seguem.
- `tipo_usuario` tem `codigo` e `descricao` (nome de exibição) semeados pelas migrations 0025, 0029 e 0074; o repository traduz `codigo` ⇄ id.

## Verificação

Teste de integração do repository (padrão quando nulo, gravar, restaurar); teste da service (só administrador, validação de tamanho e de HTML); teste de componente do dialog (salvar, descartar, restaurar padrão, só o administrador vê o botão); `lint:tudo`; skill `verify` nos cinco formatos e dois temas, com administrador e com gestor.
