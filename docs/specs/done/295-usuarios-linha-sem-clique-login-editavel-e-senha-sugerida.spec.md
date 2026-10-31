# 295-usuarios-linha-sem-clique-login-editavel-e-senha-sugerida.spec.md

> Task solta, pedido do autor (2026-10-31) sobre a tela de Usuários.

## Objetivo

Quatro ajustes na tela de Usuários: a linha da tabela deixa de abrir o Editar, o dialog de editar perde o campo de status, o login passa a ser editável e a senha sugerida passa a ser sempre `Dev@` + inicial + sobrenome + `!`.

## Entregáveis

1. **Linha sem clique.** Clicar (ou Enter) na linha não abre mais o Editar; só o lápis da linha edita. Saem `abrirEdicaoDaLinha`, a classe `--editavel`, o `tabindex` da linha e os `stopPropagation` das células que só existiam por causa do clique.
2. **Sem status no editar.** O switch Ativo/Inativo sai do dialog (já está na tabela). O formulário deixa de ter o controle `ativo`, e o `UsuarioAlterarDto` enviado pelo dialog nunca leva `status`.
3. **Login editável.** O dialog de editar mostra o login preenchido e o envia; `UsuarioAlterarDto` e `UsuarioInternoAlterarDto` ganham `login?` (minúsculo e sem espaços nas pontas, mínimo de 4, como na criação). A service recusa com `Login já está em uso` quando outro usuário ativo já tem o login (repetir o próprio login não conta) e o repository grava `login`. Nova disposição do dialog: linha 1 nome e cargo; linha 2 login e horas diárias; linha 3 tipo e, só na criação, a senha.
4. **Senha sugerida.** `sugerirSenha(nome)` devolve sempre `Dev@` + inicial do primeiro nome + último nome com a inicial maiúscula + `!` (`Matheus Caranguejo` → `Dev@MCaranguejo!`), sem acento nem símbolo; nome único vira `Dev@Madonna!`; sem nome, vazia. No criar, a senha acompanha o nome até ser editada à mão (como o login); no Alterar Senha ela já vem sugerida pelo nome da pessoa. **Não existe mais "Gerar outra senha"** nos dois dialogs, e `gerarSenha` saiu.

## Critérios de Aceite

- Testes: `sugerirSenha`, a senha acompanhando o nome e sem o botão de gerar, o editar com login (carrega, envia, nunca envia status), a linha sem clique, a service (login livre, em uso e o próprio) e o repository (integração). Builds e `repo:verificar` ok.
- Ao vivo: clicar na linha não abre nada; o lápis abre o editar com o login; trocar para um login livre salva, para um em uso é recusado; o criar sugere `Dev@MCaranguejo!`.

## Fora de Escopo

- A senha do próprio usuário trocar de outro jeito, o login do `gestor.inicial` e o desfazer da troca de login.
- O token e a sessão de quem troca o **próprio** login: o token guarda o login antigo até o próximo acesso (o backend não usa esse campo).

## Dependências

- 113 (dialog de usuário) e 280 (clique na linha, desfeito aqui).

## Notas

- "Segundo nome" na regra da senha foi lido como o **último** nome (o sobrenome), igual à sugestão de login; com três nomes (`João da Silva`) vale `Dev@JSilva!`.
