# chat-execucao-por-demanda.spec.md

> Guarda-chuva do **desenvolvedor que executa demandas**: ele fala de demandas, e a IA cuida das atividades e das execuções. Origem:
> conversa com o autor em 2026-10-25 (`IDEAS.md` I-025). **Não é uma task implementável**: registra as decisões, e cada task ganha a sua
> spec (o número é decidido na hora) antes de ser implementada. O canvas está em
> [`chat-execucao-por-demanda/referencias.md`](chat-execucao-por-demanda/referencias.md). Ele ilustra o fluxo; **o visual segue a tela
> atual do chat** e a spec decide.

## Objetivo

Hoje o desenvolvedor escolhe a atividade, dá play e descreve a execução. No trabalho real ele diz "estou resolvendo a demanda tal, mexendo
em tal coisa". Atividade e execução continuam existindo, como o checklist e o registro do tempo, mas passam a ser trabalho da IA: o
desenvolvedor conta o que vai fazer e o que fez, e a IA cria, troca, inicia, pausa e descreve por ele.

## O que existe hoje

- **Bom dia proativo** (task 147): a IA abre a conversa do dia.
- **Check-in** (tasks 148–161): a cada intervalo sorteado, a IA pede o relato e propõe `DESCREVER_EXECUCAO` com `CONTINUAR` ou `TROCAR`. O
  contexto do check-in já sabe a duração recomendada e se a execução está acima dela (`acimaDoRecomendado`).
- **Propostas** `CRIAR_ATIVIDADE`, `INICIAR_EXECUCAO` (pausa antes a ativa) e `PAUSAR_EXECUCAO`, todas com confirmação. A régua de
  autonomia por tipo está em `chat-propostas.spec.md`.
- **Status da atividade** (`TipoAtividadeStatusEnum`): `PLANEJADA`, `PENDENTE`, `DESENVOLVENDO` e `DESENVOLVIDA`.
- **A barra lateral do chat** é o histórico (`app-chat-historico`, à direita). A guarda-chuva `chat-planejamento.spec.md` (decisão 9) já
  tira o histórico dali para um seletor no topo.

## Decisões do autor

### Atividades são o checklist da demanda

1. **Atividade é um bloco do trabalho, não uma execução.** No cadastro de usuário, por exemplo: a tela, as services e controllers, o
   repositório, os scripts do banco e os testes. Uma atividade tem várias execuções. A IA **não cria uma atividade por execução**, e o
   prompt precisa deixar isso claro.
2. **Bloco grande vira bloquinhos:** quando um bloco cresce demais, ele é quebrado em atividades menores.
3. **Atividade não é "concluída", é "desenvolvida"** (`DESENVOLVIDA`). Quando o relato mostra que um bloco foi desenvolvido, a IA marca e
   avisa.

### Início do dia

4. A IA abre o chat perguntando, em essência: **"bora continuar de onde paramos ou tem coisa nova?"**
5. **Continuar:** a IA inicia a execução na atividade em que o desenvolvedor parou, sem perguntar qual.
6. **Coisa nova** (um bug, uma demanda que chegou de um dia para o outro): o desenvolvedor conta do jeito que contaria a um colega, e a IA
   descobre o projeto e a demanda onde aquilo se encaixa. Exemplo: "na integração de pesquisas do projeto X, um CPF válido foi recusado e
   estourou exceção, caso 4821". Isso vai para a demanda **Suporte** do projeto X (normalmente na raiz). A IA cria a atividade
   ("investigar CPF válido recusado, caso 4821", com o identificador quando houver), pausa o que estava rodando e inicia a nova.
7. **Demanda que falta:** a IA cria, dentro das regras de hoje (o desenvolvedor cria demanda nos projetos em que está, inclusive de
   estrutura dentro de outra de estrutura, mas não de estrutura na raiz). As demandas de estrutura são as features grandes do projeto
   (pesquisa, autenticação, segurança) e **não se criam à toa**.

### Autonomia

8. **Só criar demanda pergunta** ("vi que esse projeto não tem a demanda de Suporte, vou criar"). É coisa ampla, que todo mundo mexe.
9. **Faz e avisa** no trabalho do próprio desenvolvedor: criar atividade, iniciar e pausar execução, trocar de atividade e marcar
   desenvolvida. A IA mostra uma linha de aviso por ação, com desfazer.
10. **Sem duas execuções ao mesmo tempo**, como hoje: iniciar uma pausa antes a que está rodando.

### Check-in

11. **A IA percebe a troca pelo relato.** Se o desenvolvedor já está em outra parte, ela descreve a execução atual e abre a próxima na
    atividade certa do checklist (ou cria o bloco que falta), sem perguntar.
12. **Tempo demais no mesmo bloco:** se ele está há muito tempo na mesma atividade, a IA comenta ("você está nisso há bastante tempo") e
    sugere trocar ou quebrar o bloco.
13. **O check-in continua.** Sem a integração com o Git não há check-in automático (fica para a integração com o Gitea).

### Chat: minhas demandas

14. **A lateral do chat**, no lugar onde o histórico ficava (à direita), passa a listar **as últimas demandas que o desenvolvedor
    executou**, com caminho, barra de horas e quantas atividades estão desenvolvidas.
15. **Clicar numa demanda** fecha a lista e divide a tela entre o chat e a demanda, como no planejamento, mas só para leitura: abas
    **Checklist**, **Técnica**, **Cliente** (só gestor e administrador, como hoje) e **Documentação**, com Editar e "Planejar com a IA".
    É possível voltar à lista e ver outras demandas enquanto uma está rodando.
16. **Com uma execução rodando**, a demanda dela já abre por padrão.

## Decisões do agente (padrão proposto; o autor confirma na spec de cada task)

- **Régua de autonomia:** a decisão 9 muda os níveis iniciais da tabela de `chat-propostas.spec.md` (já ajustada lá). O administrador
  continua podendo mudar os níveis que não são fixos. "Em nome de outra pessoa" segue "sempre pergunta".
- **A aba Checklist abre primeiro** na demanda aberta, com as atividades como lista: desenvolvidas riscadas, a que está rodando destacada
  e as que faltam em aberto.
- **"Há muito tempo"** usa a duração recomendada e o `acimaDoRecomendado` que o check-in já calcula. Não há prazo novo.
- **Achar o lugar da coisa nova** reaproveita a leitura da árvore do projeto e a ferramenta que sugere o lugar de uma demanda
  (`sugerir_conexoes_e_lugar`). A IA prefere uma demanda que já existe a criar uma.
- **Desenvolvedor que não é da demanda:** atividade e execução só onde ele já pode criar atividade (as regras de hoje). Entrar numa
  demanda segue a régua de `chat-propostas.spec.md`.
- **"Minhas demandas"** sai das execuções do usuário (as demandas das atividades dele, da execução mais recente para a mais antiga), num
  endpoint de leitura próprio. O gestor e o administrador veem o mesmo para o que eles executaram.
- **Prompts** de nome de atividade, de quebra de bloco e de troca ficam nos prompts editáveis das Configurações da IA (só do
  administrador), como os de hoje.

## Fora de Escopo

- Check-in automático e qualquer leitura do Git ou do Gitea.
- O modo planejamento em si (`chat-planejamento.spec.md`): aqui é só o botão que leva para ele.
- Tirar atividade e execução do sistema ou das telas de Atividades e Execuções, que continuam como estão.
- Mudar quem pode criar demanda, atividade ou execução.

## Dependências

- `chat-propostas.spec.md`, fase da **autonomia** ("faz e avisa"), antes das fases 2 e 3 abaixo.
- `chat-planejamento.spec.md`, decisão 9 (o histórico vai para o seletor no topo), antes da fase 4.
- `docs/SYSTEM.SPEC.md` §14 (atividade, execução, demanda, check-in).

## Riscos e Mitigação

- **A IA criar uma atividade por execução**, que é o contrário da ideia. Mitigação: o prompt e as ferramentas recebem o checklist da
  demanda; teste de prompt (aba Prompts) com relatos de troca e de continuação.
- **Trocar de atividade errado sem perguntar.** Mitigação: cada aviso tem desfazer, e o relato cru fica na conversa para corrigir.
- **Lugar errado para a coisa nova** (demanda ou projeto errado). Mitigação: criar demanda sempre pergunta; a linha de aviso mostra o
  caminho completo da demanda onde a atividade foi criada.

## Fases sugeridas (numeração decidida na hora)

1. **Prompts e ferramentas do checklist:** a IA lê o checklist da demanda, marca `DESENVOLVIDA` e cria bloco só quando falta.
2. **Bom dia com continuar ou coisa nova:** retomar a última atividade e encaixar a coisa nova (demanda existente, atividade, iniciar).
3. **Check-in que troca sozinho** e o aviso de tempo demais no mesmo bloco.
4. **Minhas demandas no chat:** a lista à direita, a demanda aberta com as abas e a abertura automática da que está rodando.

Para UI, o análogo aprovado é a tela atual do chat (`modules/chat/pages/chat`), e a demanda aberta segue a da guarda-chuva
`demanda-tela.spec.md`.
