# documentacoes-e-pad.spec.md

> Guarda-chuva da **tela de Documentações** e do **pad junto do trabalho**: ver o texto da demanda e as próprias anotações ao mesmo
> tempo, o pad com largura ajustável e em tela cheia, o pad como aba da demanda no chat, a descrição do cliente legível por todos e o
> "alterar trecho com IA" mandando só o que foi selecionado. Origem: conversa com o autor em 2026-10-26 e 2026-10-27. **Não é uma task
> implementável**: registra as decisões, e cada task tem a sua spec (as tasks **252 a 258**, na tabela do fim). O protótipo está em
> [`documentacoes-e-pad/referencias.md`](documentacoes-e-pad/referencias.md); ele ilustra, e a spec decide.

## Objetivo

O desenvolvedor trabalha numa demanda por vez e escreve dois tipos de texto enquanto isso: os da demanda (técnica e documentação) e as
próprias anotações (o pad). Hoje os dois não ficam à vista juntos: o pad é um painel lateral fixo de 520 px que cobre a tela, e a
demanda está em outra tela. A guarda-chuva junta os dois e corrige o que atrapalha a escrita.

## O que existe hoje

- **Pad** (`modules/usuario/components/usuario-anotacoes-dialog/`): `p-drawer` à direita, 520 px fixos, com véu, cinco seções em
  acordeão (Em andamento, Feito, Pendências, Lembretes, Pessoal), salva sozinho e no Ctrl+S, menu "Enviar para" no trecho. Backend no
  módulo `anotacao` (`PUT /anotacao/:usuarioId/:tipo`, `PATCH .../trecho`).
- **Demanda aberta no chat** (`modules/chat/components/demanda-leitura/`, task 245): abas Checklist, Técnica, Cliente (só gestor e
  administrador) e Documentação, só leitura.
- **Plano** (`modules/chat/components/plano-documento/`, tasks 232–237): as três abas da demanda com edição, trava de versão
  (`plano.versao`) e "alterar trecho com IA" pelo botão direito. A aba Cliente some para o desenvolvedor (`podeVerAbaDoPlano`).
- **Descrição do cliente:** só gestor e administrador alteram (`SYSTEM.SPEC.md` §14; `DemandaService` e a publicação do plano já
  recusam o desenvolvedor). O que está errado é a **leitura**: o chat e o plano escondem o texto do desenvolvedor.
- **Alterar trecho com IA:** no modo formatado do editor (o padrão), o botão direito manda à IA o **bloco inteiro** (parágrafo ou item
  de lista) como trecho, e não a seleção (`blocoSelecionadoEmMarkdown`, `markdown-formatado.ts`). O motivo é a troca no backend, que
  procura o Markdown exato do trecho antigo. Defeito registrado em `PROBLEMS.md` P-037.

## Decisões do autor

### Descrição do cliente

1. **Todos leem, só gestor e administrador alteram**, em todo lugar onde o texto aparece: tela de Demandas, chat, plano, Documentações.
   Para o desenvolvedor, a aba Cliente aparece com cadeado e o aviso de que só gestores alteram.

### Tela de Documentações

2. **Item novo no grupo Dia a dia** da barra lateral, para todos os perfis. Ela também é o caminho de escrita quando a IA está fora do
   ar.
3. **Demanda à esquerda, pad à direita**, os dois à vista ao mesmo tempo, com um divisor arrastável entre eles. O pad pode ser recolhido
   para a demanda ocupar a largura toda.
4. **A demanda em que estou trabalhando** é escolhida num seletor no topo da tela, no padrão do seletor do chat. O seletor abre uma
   **árvore com busca** (projeto → demandas aninhadas) com todas as demandas a que o usuário tem acesso, e **some ao escolher**. A
   escolha **fica guardada** mesmo saindo e voltando da tela.
5. **Edição igual à do plano:** abas Técnica, Cliente e Documentação, editor de Markdown, Gravar e Descartar, com trava de versão (quem
   grava sobre uma versão mais nova é avisado e o texto dele não se perde).
6. **"Alterar trecho com IA"** também nesta tela, pelo botão direito sobre a seleção.

### Pad

7. **O pad lateral (drawer) ganha largura ajustável** pela borda esquerda e um botão de **tela cheia**. O véu escuro continua.
8. **No chat, o pad vira uma aba da demanda aberta**, entre Checklist e Técnica: Checklist · Anotações · Técnica · Cliente ·
   Documentação. Ao abrir uma demanda no chat, a aba **Anotações** vem selecionada (protótipo aprovado em 2026-10-27).

### Alterar trecho com IA

9. **Vai à IA só o texto selecionado.** O resto do parágrafo pode ir junto como contexto, mas não muda.

## Decisões do agente (padrão proposto; o autor confirma na spec de cada task)

- **Seletor na tela, não na barra superior global.** A escolha vale para a tela de Documentações; uma "demanda atual" do sistema todo
  mexeria em outras telas.
- **Primeira visita:** com uma execução rodando, a demanda dela já vem escolhida; sem execução, a tela pede a escolha.
- **A escolha da demanda, a largura do pad, a divisão da tela e a largura do drawer** ficam guardadas no navegador, por usuário, como
  o divisor do chat já faz (`localStorage`). Não vão para o banco nem seguem para outro dispositivo.
- **Um componente de pad só**, reaproveitado no drawer, em Documentações e na aba do chat, para os três não divergirem.
- **Trava de versão da demanda** numa coluna `versao`, como `plano.versao`, e não pelo `updated_date`: o navegador perde os
  microssegundos do Postgres e a comparação falharia.
- **Desenvolvedor que não é membro da demanda** vê as três abas só para leitura (§14: vê qualquer demanda de projeto acessível, edita só
  as de que é membro).
- **O "Enviar para" do pad** continua movendo o bloco inteiro, que é o comportamento esperado de mover entre seções. Só o "alterar
  trecho com IA" passa a usar a seleção.

## Fora de Escopo

- Mudar quem pode editar uma demanda ou o que o desenvolvedor vê (§14 continua como está; só a leitura da descrição do cliente passa a
  valer em todo lugar, como a regra já diz).
- Tema escuro novo, atalhos de teclado novos além do Ctrl+S que já existe, mobile.
- A IA escrever a documentação a partir do que foi feito (`IDEAS.md` I-023).
- Histórico de versões dos textos da demanda.

## Dependências

- `docs/SYSTEM.SPEC.md` §14 (permissões de demanda e da descrição do cliente) e `docs/SCHEMA.md` (`demanda`, `anotacao`).
- Guarda-chuva `chat-execucao-por-demanda.spec.md`: a decisão 15 dela ("Cliente só gestor e administrador") é revista pela decisão 1
  desta, e a aba Anotações entra na demanda aberta da task 245.
- Task 242 (ativa): o ponto em aberto dela evita expor a descrição do cliente ao desenvolvedor pela ferramenta de leitura. Com a
  decisão 1, esse cuidado deixa de ser necessário; a 242 não muda por esta guarda-chuva.

## Riscos e Mitigação

- **Duas pessoas gravando o mesmo texto da demanda** (Documentações, tela de Demandas, publicação do plano, executores da IA).
  Mitigação: todo caminho que grava os textos sobe a `versao`, e só a tela de Documentações recusa por versão (task 256).
- **Pad editado em dois lugares ao mesmo tempo** (o drawer aberto sobre Documentações). Mitigação: um só estado do pad no frontend,
  compartilhado pelo componente (task 254).
- **Proposta de trecho que não encaixa mais** porque o texto mudou depois do pedido. Mitigação: a troca continua exigindo o bloco exato,
  e expira como hoje.

## Tasks

| # | Task | Escopo | Depende de |
|---|---|---|---|
| 252 | [Descrição do cliente: todos leem](252-descricao-cliente-todos-leem.spec.md) | Aba Cliente legível para o desenvolvedor no chat e no plano; edição continua só do gestor | — |
| 253 | [Alterar trecho com IA: só a seleção](253-alterar-trecho-so-a-selecao.spec.md) | Editor entrega a seleção e o bloco; o pedido à IA muda só a seleção | — |
| 254 | [Pad reaproveitável, ajustável e em tela cheia](254-pad-ajustavel-e-tela-cheia.spec.md) | Componente de pad único; drawer com largura pela borda e tela cheia | — |
| 255 | [Anotações como aba da demanda no chat](255-chat-aba-anotacoes.spec.md) | Aba Anotações entre Checklist e Técnica, aberta por padrão | 252, 254 |
| 256 | [Trava de versão nos textos da demanda](256-demanda-versao-dos-textos.spec.md) | Coluna `versao`, endpoint de textos com recusa por versão | — |
| 257 | [Tela de Documentações](257-tela-documentacoes.spec.md) | Rota, seletor em árvore, demanda à esquerda e pad à direita, divisor | 252, 254, 256 |
| 258 | [Alterar trecho com IA em Documentações](258-documentacoes-alterar-trecho-com-ia.spec.md) | Pedido direto à IA, proposta com diff no texto, aceitar sem gravar | 253, 257 |

Para UI, os análogos aprovados são o documento do plano (`modules/chat/components/plano-documento/`) para a edição, o seletor do chat
(`modules/chat/components/seletor/`) para o seletor de demanda e o pad atual para o painel de anotações.
