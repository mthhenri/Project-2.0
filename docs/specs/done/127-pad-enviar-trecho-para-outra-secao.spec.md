# Task 127 — Pad: "Enviar para" outra seção

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 8 (3 de 4).

## Objetivo

No pad editável, o usuário seleciona um trecho, clica com o botão direito, escolhe **Enviar para** e a
seção de destino, e o trecho sai da seção de origem e vai para o **fim** da outra, numa operação atômica
do backend.

## Entregáveis

### 1. Editor de Markdown (`app-markdown-editor`)

- Um evento de **menu de contexto** com a seleção: ao clicar com o botão direito sobre um trecho selecionado
  o editor emite a seleção e a posição do cursor, e **não** abre o menu do navegador. Sem seleção, o menu do
  navegador continua como está (colar, por exemplo).
- Reaproveita `selecao()`/`textoSelecionado()` que a task 122 já deixou prontos. Sem consumidor que escute o
  evento, o editor se comporta exatamente como hoje.

### 2. Pad (`usuario-anotacoes-dialog`)

- Menu de contexto do PrimeNG (`p-contextmenu`) com o item "Enviar para", cujo submenu lista as **outras
  quatro** seções. **Os itens são propriedades diretas do modelo, não getters** (um getter reconstrói o menu
  a cada ciclo e ele fecha sozinho).
- Escolher o destino chama a operação de mover da task 125 com o trecho exato, as duas seções e os dois
  `updatedDate`. Sucesso: as duas seções são atualizadas na tela e um aviso confirma ("Enviado para
  Pendências"). Com Desfazer de 7 s, que devolve o trecho (move de volta, também atômico).
- Trecho ausente na origem (alguém mudou a seção) ou ambíguo (aparece mais de uma vez): o backend recusa, a
  tela recarrega as duas seções e avisa; nada é movido pela metade.
- Só no modo editável. A seção de origem sem seleção não mostra o item.
- Salvamentos pendentes das duas seções saem antes de mover, para o trecho enviado ser o que o usuário vê.

### 3. Documentação

- `docs/SYSTEM.SPEC.md` e `docs/context/`.

## Critérios de Aceite

- Verificação ao vivo: selecionar um trecho na seção A, botão direito, "Enviar para" B: o trecho some de A,
  aparece no fim de B (separado por linha em branco), o banco reflete as duas seções e o Desfazer devolve.
- Trecho repetido na origem recusa o envio inteiro (nenhuma seção muda) e avisa; seção alterada por outra
  aba no meio-tempo recarrega as duas.
- Sem seleção o menu do navegador aparece; no modo só leitura não há item de envio.
- Em 1920×1080, 1366×768 e 1080×1920, temas claro e escuro; menu e submenu sem cortar na borda da tela.
- Testes e builds passam; frontend sem testes e sem lint declarado.

## Fora de Escopo

- Arrastar e soltar entre seções; enviar para a seção de outro usuário; enviar mais de um trecho de uma vez.
- Qualquer ferramenta da IA para mover trechos (blocos 5 e 6).

## Dependências

Depende da **125** (operação de mover) e da **126** (acordeões). Bloqueia a 128.
