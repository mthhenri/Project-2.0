# 217-mensagem-direta-rodape-enxuto.spec.md

> Task solta, ajuste do popup do chat entre colaboradores (tasks 210 e 211), pedido pelo autor em 2026-10-23: o rodapé da conversa "está
> enturricado" e come espaço da lista de mensagens. Primeira de duas: a 218 troca o campo por um editor que escreve já formatado.

## Objetivo

Devolver altura à lista de mensagens na conversa: cada linha que o rodapé ocupa hoje só com texto de apoio sai, sem perder a informação.

## Fatos do código (2026-10-23)

Abaixo da lista de mensagens a conversa carrega três faixas: o compositor (campo, botão de código e enviar), a **legenda** do compositor
("Markdown, @ para mencionar, # para uma demanda. Enter envia, Shift+Enter quebra a linha.", duas linhas) e o **aviso fixo** do popup
("Gestores e administradores podem ler as conversas entre desenvolvedores.", também duas linhas). O aviso é decisão do autor na
guarda-chuva (decisão 5) e continua obrigatório; o que muda é onde ele aparece. Medido ao vivo em 1366×768: a lista de mensagens fica com
~190 px com o painel de código fechado.

## Entregáveis

1. **Legenda do compositor removida.** As dicas passam a viver onde cabem sem ocupar linha: o `placeholder` do campo ("Mensagem — @ pessoa,
   # demanda") e a dica do botão de enviar ("Enviar (Enter) · Shift+Enter quebra a linha"). A regra do Enter e do Shift+Enter não muda.
2. **Aviso fixo fora do rodapé da conversa.** Na tela da conversa ele vira um ícone de informação no cabeçalho (entre o status e o sino), com
   o texto completo na dica e no `aria-label`; o ícone abre a dica também por foco (teclado). Na lista de conversas e na nova conversa, onde
   sobra espaço, o aviso continua escrito no rodapé como hoje. O texto e a regra (aviso permanente) não mudam.
3. **Campo e botões sempre à vista.** O campo tem `min-width: 0` e quebra palavra longa; o botão de código e o de enviar nunca saem da linha,
   com texto de uma linha só, várias linhas ou uma palavra comprida sem espaço.

## Critérios de Aceite

- Testes de componente: o compositor não tem mais a legenda e o campo tem o novo `placeholder`; a conversa mostra o ícone de aviso com o
  texto no `aria-label` e **não** mostra o rodapé de aviso; a lista e a nova conversa seguem mostrando o rodapé (os testes existentes do
  popup e do `chat-popup` continuam valendo). `npm run test --workspace=frontend` e `npm run build --workspace=frontend` verdes.
- Ao vivo, na aplicação real, em `1920×1080`, `1366×768` e `1080×1920` e na rota `/chat-popup` em 420×640: antes e depois da altura da lista
  de mensagens da conversa (medida em px no DOM), ícone de aviso com a dica, campo com texto curto, longo e uma palavra de 120 letras sem
  espaço, tema claro e escuro; botões à vista em todos os casos. Comparar com o análogo aprovado (o popup da task 210).

## Fora de Escopo

- Trocar o campo por um editor formatado, barra de formatação e atalhos de Markdown: é a task 218.
- Mexer no texto do aviso, na regra de quem pode ler as conversas ou na tela de supervisão (task 214).
- O painel do mini editor de código (task 216): só confirmar que continua cabendo.

## Dependências

- Tasks 210, 211 e 216 em `done/`.

## Riscos e Mitigação

- **O aviso deixa de estar escrito na conversa:** a dica e o `aria-label` carregam o texto inteiro, e o rodapé continua na lista e na nova
  conversa. Se o autor preferir texto fixo, a alternativa é uma linha curta sob o nome no cabeçalho.
- **O bug relatado de a barra "comer" os botões ao digitar não foi reproduzido** no navegador (o campo e os botões ficam no lugar com
  texto curto, longo e palavra de 120 letras); pode ser específico da janela do Desktop. O critério 3 cobre os casos conhecidos e a
  verificação na rota `/chat-popup`; se reaparecer no Electron, vira entrada em `PROBLEMS.md` com os passos.
