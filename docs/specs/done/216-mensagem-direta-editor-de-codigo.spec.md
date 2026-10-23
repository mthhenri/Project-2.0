# 216-mensagem-direta-editor-de-codigo.spec.md

> Task solta, fora da numeração reservada pela guarda-chuva `chat-colaboradores.spec.md` (205–215): melhoria do compositor da task 211 pedida
> pelo autor em 2026-10-23, depois de ver o popup rodando. Reaproveita o realce da task 189 (`app-markdown-bloco-codigo`).

## Objetivo

Inserir código no chat entre colaboradores deixa de ser "escrever entre três crases num campo de uma linha": o botão de código abre um
**mini editor** (números de linha, realce, Tab que indenta, recuo automático) com **seletor de linguagem**, e o bloco enviado passa a
mostrar a linguagem no cabeçalho, como no Yala.

## Fato do código que define o recorte

O renderizador do bloco (`app-markdown-bloco-codigo`, task 189) **já** mostra a linguagem no cabeçalho, o botão Copiar e o realce, mas só
quando a cerca traz a linguagem (` ```ts `). Hoje `inserirBlocoDeCodigo` sempre escreve a cerca **sem** linguagem; é por isso que o bloco
enviado não mostra nada. Logo, o renderizador não muda: a linguagem passa a entrar na cerca.

## Entregáveis

1. **`app-editor-codigo`** (`shared/components/editor-codigo/`): editor de código compartilhado, feito de um `<textarea>` com uma camada de
   realce atrás (as mesmas gramáticas e as mesmas cores do bloco enviado, sem dependência nova). Entradas: `valor` (model), `linguagem`
   (gramática de realce ou `null`), `limite` opcional. Tem coluna de números de linha rolando junto, sem quebra automática de linha (rola na
   horizontal), fonte mono e tema claro/escuro pelos tokens do projeto.
2. **Regras puras do editor** (`editor-codigo.util.ts`, com teste): Tab indenta (a seleção inteira, linha a linha) e Shift+Tab remove um
   nível; Enter mantém o recuo da linha e aumenta um nível depois de `{`, `(`, `[` ou `:`; recuo é de 2 espaços.
3. **Painel de código no compositor** (`mensagem-direta-codigo-painel`): abre pelo botão `</>` (que continua com a dica "Bloco de código"),
   sobre a conversa e acima do compositor, com cabeçalho "Bloco de código", **seletor de linguagem** (Sem linguagem, TypeScript,
   JavaScript, PHP, C#, Java, Python, SQL, HTML, CSS, SCSS, JSON, Bash, YAML), o editor, contador de caracteres e os botões **Cancelar** e
   **Inserir**. Se havia texto selecionado no campo, ele já vem no editor.
4. **Inserção com linguagem:** `inserirBlocoDeCodigo` ganha o parâmetro opcional `linguagem` e escreve a cerca com o nome curto (` ```ts `,
   ` ```py `, ` ```sql `...). Sem linguagem, o comportamento atual não muda (colar código e o atalho do Desktop seguem como estão).
5. **Teclado e foco:** o editor recebe o foco ao abrir; `Ctrl+Enter` insere; `Esc` cancela e devolve o foco ao campo; Tab indenta (e o
   `Esc` é a saída para quem navega por teclado). Inserir fecha o painel, põe o bloco no campo (desfazível com Ctrl+Z, como hoje) e devolve
   o foco ao campo, com o cursor depois do bloco.
6. **Limite:** o bloco inteiro (cerca incluída) não pode estourar `LIMITE_TEXTO_MENSAGEM_DIRETA`; passando, o contador fica em destaque e
   **Inserir** fica desabilitado.

## Critérios de Aceite

- Testes: `editor-codigo.util.test.ts` (Tab, Shift+Tab, Enter com recuo, seleção de várias linhas), `compositor.util.test.ts` (cerca com
  linguagem e sem), `editor-codigo.component.spec.ts` e o spec do painel/compositor (abre, preenche com a seleção, troca a linguagem,
  insere ` ```ts `, cancela com Esc, limite). `npm run test --workspace=frontend` e `npm run build --workspace=frontend` verdes.
- Ao vivo, na aplicação real: abrir o popup, `</>`, escolher TypeScript, digitar com Tab e Enter, inserir, enviar; o bloco aparece com
  **"TypeScript"** no cabeçalho, realçado e com Copiar; o mesmo em tema escuro. Percorrer `1920×1080`, `1366×768` e `1080×1920`, e os
  estados vazio, com código longo (rolagem horizontal e vertical) e no limite de caracteres. Comparar com o análogo aprovado (o bloco do
  chat da IA e o compositor da task 211).
- O realce do editor é igual ao do bloco enviado para o mesmo código (mesmas gramáticas, mesmas cores).

## Fora de Escopo

- Editar um bloco já enviado ou já posto no campo, e detectar a linguagem sozinho. A colagem de código e o atalho do Desktop continuam
  inserindo a cerca sem linguagem (o editor é o caminho para marcar a linguagem).
- Autocompletar, fechamento automático de parênteses, busca, vários cursores: não é um VS Code, é um editor pequeno.
- Trocar o renderizador do bloco enviado, o servidor ou o `shared`; usar o editor em outros lugares do sistema (ele nasce compartilhado,
  mas só o chat o usa nesta task).
- A task 214 (supervisão) e a 215 (verificação de ponta a ponta) seguem como estão.

## Dependências

- Tasks 189 (realce e bloco de código) e 211 (compositor) em `done/`. Fonte de verdade das convenções: `docs/CONVENTIONS.md` (Frontend,
  Estilos) e `docs/SYSTEM.SPEC.md` §3.1.

## Riscos e Mitigação

- **Camada de realce e `<textarea>` descasadas** (fonte, recuo, rolagem diferentes deixam o texto "dobrado"): as duas camadas usam a mesma
  classe de fonte, sem quebra de linha, e a rolagem do `textarea` é copiada para a camada a cada `scroll`; a verificação ao vivo confere com
  código longo.
- **Altura do popup e da janela flutuante do Desktop:** o painel precisa caber no menor dos dois; conferir nos dois antes do fecho.
- **Tab prender o foco:** `Esc` sempre sai do painel.
- **Mudar algo compartilhado:** `inserirBlocoDeCodigo` e `realce-codigo.ts` têm outros consumidores; a mudança é só aditiva e a skill
  `gerenciamento-de-impacto` roda antes de editar.
