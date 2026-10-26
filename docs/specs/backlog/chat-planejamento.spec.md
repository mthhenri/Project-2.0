# chat-planejamento.spec.md

> Guarda-chuva do **modo planejamento** do chat com a IA. Origem: conversa com o autor em 2026-10-24 e 2026-10-25. **Não é uma task
> implementável**: registra as decisões e os pontos em aberto; cada task ganha a sua spec (tasks **224** e **232 a 237**, tabela em "Tasks") antes de ser implementada. Estende o chat da guarda-chuva `done/rework-chat-ia.spec.md` (tasks 135–141) e a entrevista de
> demanda da task 155. A modelagem está em [`chat-planejamento/modelagem.md`](chat-planejamento/modelagem.md). O mockup clicável e a
> visão geral para o gestor do autor estão no canvas privado do autor (link em `chat-planejamento/referencias.md`); o canvas ilustra, a
> spec decide.

## Objetivo

O valor do Project está no texto e no contexto registrados, mas documentar cansa e quase ninguém escreve. No modo planejamento a pessoa
**conversa com a IA e um documento vai se escrevendo ao lado**: a IA pergunta antes de escrever, aponta o que falta, escreve no rascunho
e reescreve trechos a pedido; no fim, a pessoa **publica** os textos na demanda. O plano não morre ao publicar.

## Decisões do autor

### O plano

1. **Plano** é um documento com **conversa própria**, independente da "conversa do dia". Tem até três textos, em abas: **descrição
   técnica**, **descrição do cliente** e **documentação** (os três campos Markdown da demanda).
2. Um plano pertence a um **projeto** e pode estar ligado a uma **demanda** ou a nenhuma. Pode existir **plano amplo, sem projeto**: é
   **pessoal**, sem compartilhamento por enquanto.
3. **Visibilidade:** plano de projeto (com ou sem demanda) é visto e editado por **todos que têm acesso ao projeto** (a regra de acesso
   ao projeto do `SYSTEM.SPEC.md` §14 não muda), e isso vale para a **conversa inteira** do plano, com as mensagens de todos. Quem
   começou pode marcar o plano como **solo**: aí o plano é só dessa pessoa, e os outros **não veem** nem mexem.
4. **Publicar** grava os textos escolhidos na demanda ligada; **qualquer pessoa da demanda** publica, **seguindo as permissões de
   hoje**. Se a demanda já tem texto, a publicação mostra o **diff contra o texto atual** antes de gravar.
5. **Descrição do cliente:** segue **exclusiva do gestor** (`SYSTEM.SPEC.md` §14), também no plano. O desenvolvedor não vê nem edita
   essa aba no rascunho, a IA não escreve nela numa conversa dele, e ele não a publica. Por enquanto.
6. **O plano continua vivo** depois de publicar: a demanda mostra de que plano nasceu, o plano segue editável e a próxima publicação
   mostra o que mudou.

### A tela

7. **Chat e documento lado a lado**, com um **divisor arrastável** entre os dois (a pessoa escolhe quanto cada um ocupa).
8. **Chave de modo** no campo de mensagem: **Perguntas** (o chat de hoje) e **Planejamento**, trocável no meio da conversa. Cada modo
   cumpre o seu papel: no planejamento a IA não propõe iniciar, pausar nem registrar execução.
9. **O histórico sai da lateral**: a barra `app-chat-historico` é substituída por um **seletor no topo** do chat, com busca e duas listas,
   **Planos** e **Conversas do dia**, e a ação **Novo plano**. Vale para os dois modos.
10. **Diff sobreposto por palavra**, num texto só, com o que sai riscado em vermelho e o que entra em verde, **também em código**. Passa a
   ser o jeito de mostrar mudança de texto no sistema inteiro: plano, pad (`ANOTAR_PAD` com troca) e propostas que alteram descrição.

### A IA no plano

11. **Pergunta antes de escrever** e analisa junto: aponta o que falta e o que está pesando demais.
12. **No rascunho a IA escreve direto.** Gravar na demanda é sempre uma ação da pessoa (publicar).
13. **Edição por trecho:** a pessoa seleciona um trecho do documento e pede uma mudança; a IA altera **só aquele trecho**, e a mudança
    aparece no próprio documento, como diff, para **aceitar ou rejeitar** (ou pedir outra versão).
14. **Pontos em aberto** num painel ao lado do documento, **sem estrutura rígida**: a IA anota livremente o que identifica (pergunta,
    lacuna, suposição, peso demais, contradição, dependência, risco, fora do escopo, decisão registrada são exemplos, não uma lista
    fechada). Responder no chat fecha o ponto e o texto entra no documento; dispensar pode registrar o motivo.
15. **Material de fora:** colar o texto do e-mail do cliente ou anexar um arquivo de texto. Não há leitura de caixa de e-mail.
16. **Prompts configuráveis** nas Configurações da IA (exclusivas do administrador, como hoje): um para a conversa do planejamento e um por tipo de texto (técnico,
    cliente, documentação), porque são formas de escrever diferentes.

## Decisões do agente (padrão proposto; o autor confirma na spec de cada task)

- **Edição à mão:** o documento também é editável diretamente, com o editor de Markdown formatado do sistema (task 134).
- **Plano ligado a no máximo uma demanda** nesta guarda-chuva; a modelagem já admite várias (projeto futuro "plano que vira várias
  demandas", ver Fora de Escopo).
- **Alteração de trecho reaproveita `proposta_ia`** com um tipo novo (confirmar, recusar, desfazer e expirar já existem). Expira quando o
  trecho antigo não está mais no texto (outra pessoa mexeu antes).
- **Conversa do plano no mesmo armazenamento do chat** (`ArmazenamentoDeChat`), com uma chave de conversa própria do plano, visível a quem
  vê o plano; o custo de cada resposta é de quem enviou a mensagem.
- **Duas pessoas no mesmo plano:** sem coedição ao vivo; gravar com a versão lida e recusar gravação sobre versão mais nova.
- **Entrevista de demanda (task 155)** continua no modo Perguntas para o caso rápido; o planejamento é o caminho completo.
- **IA desligada:** o plano continua legível e editável à mão; só a conversa para.
- **Plano amplo** pode ganhar um projeto depois, com confirmação avisando que rascunho, conversa e fontes passam a ser vistos pelo
  projeto; não volta a ser pessoal. Mover um plano de um projeto para outro fica fora desta guarda-chuva.
- **Ligar a demanda:** quem pode editar o plano liga ou troca a demanda a qualquer momento, desde que **possa editar essa demanda**
  (membro, gestor ou administrador). Também pode criar **uma** demanda nova a partir do plano, pelas regras de criação de hoje
  (desenvolvedor só cria sub-demanda).
- **Ponto de partida:** ao ligar a uma demanda que já tem texto, cada aba vazia do plano começa com o texto atual da demanda; aba já
  escrita no plano não é sobrescrita.
- **Chave de modo sem plano aberto:** trocar para Planejamento abre o último plano em andamento da pessoa ou, sem nenhum, o seletor com
  "Novo plano". A conversa do dia não migra para o plano.
- **Contexto da IA no plano:** o documento, as fontes, a conversa do plano, os pontos e as mesmas ferramentas de **leitura** do chat
  de hoje (demanda, árvore, projeto, equipe), sempre com as permissões de quem enviou a mensagem.
- **Ciclo de vida:** o plano pode ser **arquivado** (sai do seletor, continua acessível pela busca) e excluído (soft delete) pelo
  criador, pelo gestor ou pelo administrador. Demanda excluída deixa o plano sem demanda; projeto excluído leva os planos dele.

## Fora de Escopo

Ficam para projetos próprios, com conversa própria antes da spec:

- **Plano que vira várias demandas** (a IA propõe a quebra em árvore e publicar cria todas).
- **Documentação a partir do que foi feito:** primeiro pelas execuções da demanda; mais para frente pelo repositório Git.
- **Integração com Git** (futuro distante, para o projeto inteiro).
- **Imagens e prints** no chat da IA e no chat entre colaboradores.
- Coedição ao vivo do documento; notificação de mudança no plano; leitura direta da caixa de e-mail.

## Tasks

A 224 (diff por palavra) é escrita na guarda-chuva [`chat-propostas.spec.md`](chat-propostas.spec.md) e serve às duas. As demais são
numeradas de 232 a 237.

| # | Task | Escopo | Depende de |
|---|---|---|---|
| 224 | [Diff por palavra](../done/224-diff-sobreposto-por-palavra.spec.md) | regra pura no `shared` (com teste), componente de exibição, troca no pad e nas propostas que alteram texto; aplicar `gerenciamento-de-impacto` | — |
| 232 | [Modelo do plano](../done/232-plano-modelo-e-api.spec.md) | migrations, repositories (com teste de integração), service, API, regras de acesso (projeto, demanda, solo, pessoal), arquivar e excluir, ligar demanda | — |
| 233 | [Tela](../done/233-plano-tela.spec.md) | seletor no topo no lugar do histórico (nos dois modos), chave de modo, divisor arrastável, documento com abas e edição à mão; deixa a lateral livre para a 245 | 232 |
| 234 | [IA no plano](../done/234-plano-ia.spec.md) | prompts novos (só o administrador edita), conversa do plano no armazenamento do chat, escrita direta no rascunho, edição de trecho com aceitar/rejeitar | 232, 233 (224 desejável) |
| 235 | [Pontos em aberto](../done/235-plano-pontos-em-aberto.spec.md) | painel de pontos em aberto e decisões registradas | 232, 233, 234 |
| 236 | [Material de fora](236-plano-material-de-fora.spec.md) | texto colado e arquivo de texto como fonte | 232, 233, 234 |
| 237 | [Publicar e plano vivo](237-plano-publicar-e-plano-vivo.spec.md) | publicar na demanda com diff, plano vivo, "nasceu do plano" no detalhe da demanda | 232, 233, 234 (224, 235 desejáveis) |

Para UI, o análogo aprovado é a tela atual do chat (`modules/chat/pages/chat`) e o cartão de proposta (`proposta-cartao`).
