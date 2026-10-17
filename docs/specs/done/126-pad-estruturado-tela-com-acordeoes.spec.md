# Task 126 — Pad estruturado: tela com cinco acordeões e migração do texto atual

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 8 (2 de 4).

## Objetivo

Trocar o texto único do pad por **cinco acordeões**, cada um com um editor de Markdown, usando a API da
task 125, e levar o texto que cada pessoa já tem em `usuario.anotacoes` para a seção **Pessoal**. A tela
nasce editável; o modo "só leitura" (com a IA ligada) fica preparado, mas só será acionado pelos blocos 4
e 10.

## Entregáveis

### 1. Migration `0031` (dados)

- Copia `usuario.anotacoes` (Markdown, convertido na task 124) para a seção `PESSOAL` de cada usuário cujo
  texto tenha conteúdo além de espaços. Não toca nas outras seções, nem em `usuario.anotacoes` (a 128
  remove a coluna).
- Idempotente em dados: só preenche `PESSOAL` quando ela está vazia. `DOWN` esvazia o que ela copiou.
- Roda **junto com a troca da tela**, para o pad não ficar com duas fontes defasadas.

### 2. Frontend: o drawer do pad (`usuario-anotacoes-dialog`)

- Continua sendo o drawer de hoje (aberto por `n`, pelo botão da topbar, por `/ponto?anotacoes=`, pela
  listagem de usuários e pelo perfil), mesmo título, rodapé e comportamento de fechar.
- **Cinco acordeões** (`p-accordion`, vários abertos ao mesmo tempo), na ordem: Em andamento, Feito,
  Pendências, Lembretes, Pessoal. Cada um com `app-markdown-editor` e um indicador de estado próprio
  (editando, salvando, salvo, erro). "Em andamento" abre por padrão; o cabeçalho de cada seção mostra se
  ela tem texto.
- **Salvar:** mantém o salvamento automático (2 s depois de parar de digitar, por seção) e o Ctrl+S, agora
  enviando o `updatedDate` lido. Fechar descarrega as seções pendentes. Nenhuma requisição sai sem mudança.
- **Conflito (409):** a seção é recarregada do servidor e um aviso diz que ela mudou em outro lugar (IA,
  outra aba). Ver decisão 1.
- **"Limpar"** passa a ser por seção, com o mesmo Desfazer de 7 s.
- **Modo editável:** o componente recebe `editavel` (sempre verdadeiro até os blocos 4 e 10). Falso mostra
  cada seção só no visualizador, sem barra, sem salvar e sem "Limpar".
- Quem abre o pad de outro usuário (gestor e administrador) continua vendo e editando, com o título
  "Anotações de <nome>".
- `anotacaoTemTexto` e o evento `aoAlterar` (ícone da listagem de usuários) passam a considerar as 5 seções.

### 3. Documentação

- `docs/SYSTEM.SPEC.md`, `docs/context/` e o `README.md` (a migration de dados roda sozinha no `db:migrate`).

## Decisões em aberto

1. **Conflito:** proposta de recarregar a seção e avisar, descartando o texto local daquela seção. A
   alternativa (mostrar as duas versões lado a lado) é bem mais trabalho e parece exagerada para um pad
   pessoal.
2. **Autosave por seção ou do pad todo:** proposta por seção, porque cada seção tem o seu `updatedDate`.

## Critérios de Aceite

- Depois do `db:migrate`, quem tinha anotações vê o texto em "Pessoal" e as outras quatro seções vazias;
  quem não tinha vê tudo vazio. Rodar a migration de novo não duplica nem sobrescreve.
- Verificação ao vivo, com gestor e desenvolvedor: abrir (por `n` e pela listagem), editar cada seção,
  autosave de 2 s por seção, Ctrl+S, fechar salva, Limpar com Desfazer, conflito forçado (alterar a seção
  pela API durante a edição) recarrega e avisa, e o ícone "tem anotações" da listagem reflete as 5 seções.
- Tela vista em 1920×1080, 1366×768 e 1080×1920, nos temas claro e escuro, nos estados vazio, carregando,
  cheio e erro; o modo `editavel = false` visto com um valor forçado.
- Testes e builds passam; frontend sem testes e sem lint declarado.

## Fora de Escopo

- O menu "Enviar para" (task 127).
- Acionar o modo só leitura pela IA ligada ou desligada (blocos 4 e 10).
- Remover `usuario.anotacoes` (task 128).

## Dependências

Depende da **125**. Bloqueia a 127 e a 128. Deve ir para o mesmo lançamento da 128 (a migration `0031` deixa
a coluna antiga como cópia até ela sair).
