# chat-duvidas-de-codigo.spec.md

> Guarda-chuva das dúvidas de programação no chat da IA. Origem: `IDEAS.md` I-004 (conversa com o autor em 2026-10-19), que
> sai das abertas com esta spec. **Não é uma task implementável**: registra as decisões e quebra o trabalho nas tasks
> **188–191**. Corrige `PROBLEMS.md` P-017 (task 188). Prioridade do autor.

## Objetivo

O chat da IA passa a tirar dúvidas de programação ("como faço um loop em PHP?", "como faço uma classe em C#?") de qualquer
usuário, com o código em bloco com realce da linguagem e botão de copiar. Cada mensagem fica marcada pelo assunto (sistema ou
código) e o administrador liga e desliga as dúvidas de código e escolhe se o contexto enviado à IA mistura os assuntos.

## Decisões (autor, 2026-10-19)

1. **Por quê dentro do sistema:** a dúvida fica **registrada**. O histórico marcado é o insumo para, depois, o gestor perguntar
   à IA onde o time tem mais dúvida (`IDEAS.md` I-006) e para ligar a dúvida ao código quando a IA ler os repositórios (I-005).
   Nenhuma das duas entra aqui.
2. **Quem usa:** qualquer usuário (desenvolvedor, gestor, administrador).
3. **Liga/desliga por interruptor** na configuração da IA: "só Project" ou "Project e código". Não depende de alguém reescrever
   o prompt (controle de custo de tokens).
4. **Prompt editável:** o comportamento das dúvidas de código vem de um prompt próprio, editável e testável pelo administrador
   como os demais.
5. **Marcação por assunto em toda mensagem** do chat, desde já (serve ao filtro do gestor no futuro).
6. **Flag de contexto:** `MISTURADO` (padrão inicial: as últimas mensagens do dia, de qualquer assunto) ou `SEPARADO` (só as
   mensagens do assunto da pergunta atual). Começa misturado; troca se o uso mostrar a IA confundindo os assuntos ou custo alto.
   Riscos do separado, aceitos por ser opcional: pergunta que cruza os assuntos ("anota isso na atividade X" logo após uma
   resposta de código) e marcação errada que tira a mensagem do contexto.
7. **Modelo:** a dúvida de código é respondida pelo nível **rápido**, como o resto da conversa (basta para sintaxe). A IA
   escalar para um nível mais forte quando a dúvida ficar complexa é **possibilidade anotada** (`IDEAS.md` I-007), fora daqui.
8. **Selo de nível verdadeiro:** a resposta mostra o nível mais alto usado no turno, contando as ferramentas (hoje sempre
   "rápido"; P-017). Entra primeiro porque a escalada futura depende dele.
9. **Separado ou no chat do dia:** as dúvidas de código ficam **na conversa do dia**, sem modo ou conversa à parte. Reavaliar
   se a mistura atrapalhar a leitura do usuário (a marcação permite filtrar a tela depois).
10. **Código da empresa colado no chat** vai ao provedor de IA; o autor não vê problema por ora (já é prática copiar para
    outras IAs). Sem aviso nem bloqueio nesta leva.

## Fatos do código que sustentam o recorte (2026-10-19)

- O chat conversa no nível rápido e grava toda resposta com `nivel: NivelIaEnum.RAPIDO` fixo (`chat.service.ts`); as
  ferramentas que chamam a IA por baixo (descrever demanda no analítico, descrição de execução no padrão) não devolvem nível
  nem tokens ao chat (`ResultadoFerramentaIa` só tem `conteudo`, `erro`, `propostaId`).
- O contexto do modelo já é limitado às últimas `JANELA_DE_MENSAGENS` (40) mensagens do dia; o teto de cada chamada é
  `MAXIMO_TOKENS_DO_CHAT` (2048), curto para resposta de código.
- O interpretador de Markdown (`shared/src/markdown/`) já guarda a linguagem do bloco cercado; o `app-markdown-visualizador`
  proíbe injetar HTML (só elementos nativos a partir da árvore), então o realce precisa de um tokenizador que devolva tokens.
  O visualizador tem 10 consumidores no frontend.
- As mensagens do chat **nunca são reescritas** e vivem em três armazenamentos trocáveis (Postgres provisório, OpenSearch,
  Elasticsearch; tasks 162–163): o assunto precisa ser conhecido **antes** de gravar a mensagem do usuário.
- "Restaurar padrão" de um prompt volta à versão 1 semeada pela migration: por isso o texto das dúvidas de código vira um tipo
  de prompt novo, com versão 1 própria, em vez de uma versão nova do prompt `CONVERSA`.

## Tasks

| # | Task | Escopo |
|---|---|---|
| 188 | [Nível real e tokens do turno no chat](188-chat-nivel-real-e-tokens-do-turno.spec.md) | `ia`, `chat`; corrige P-017 |
| 189 | [Bloco de código: copiar e realce por linguagem](189-markdown-bloco-de-codigo-copiar-e-realce.spec.md) | `app-markdown-visualizador` (frontend) |
| 190 | [Configuração das dúvidas de código](190-ia-configuracao-duvidas-de-codigo.spec.md) | `configuracao-ia`, `prompt`, migration, tela |
| 191 | [Assunto das mensagens e contexto do chat](191-chat-assunto-e-contexto.spec.md) | `chat`, armazenamentos, migration |

**Ordem:** 188 e 189 são independentes entre si e das demais (podem correr em paralelo). 190 antes de 191, que usa as flags e o
prompt novos. A guarda-chuva fecha com a 191.

## Critérios de Aceite da guarda-chuva

- As 4 tasks em `docs/specs/done/`; P-017 removido de `PROBLEMS.md`.
- Ao vivo, com as dúvidas de código ligadas: uma pergunta de programação no chat volta com bloco realçado e copiável, marcada
  como código; uma pergunta do sistema na mesma conversa continua funcionando com as ferramentas, marcada como sistema.
- Com as dúvidas de código desligadas, a IA recusa com educação a pergunta de programação que não é sobre o sistema, e nenhuma
  chamada de classificação acontece.

## Fora de Escopo

- Gestor consultar as dúvidas do time (I-006), IA ler o código dos projetos (I-005), escalada de dúvida complexa para nível mais
  forte (I-007).
- Filtro por assunto na tela do chat ou do histórico.
- Aviso ou bloqueio de código colado no chat.
