# PRIORIDADES.md — Em que ordem fazemos

> **O que este arquivo é:** a ordem de trabalho decidida com o autor. Ele só **aponta** para o que
> existe em outro lugar (`P-0NN` em [`PROBLEMS.md`](PROBLEMS.md), `I-0NN` em [`IDEAS.md`](IDEAS.md),
> specs em `docs/specs/backlog/`) e guarda a **decisão** e a **data**. Não copia o conteúdo do item:
> em conflito, o item vence.
>
> **O que NÃO entra aqui:** o texto do problema, da ideia ou da spec; o relato do que foi feito
> (isso é [`HISTORY.md`](HISTORY.md)); o que é verdade agora ([`CONTEXT.md`](CONTEXT.md)).
>
> **Como mantê-lo:** só o autor muda a ordem. Quando um item é resolvido, vira spec em andamento ou
> é descartado, ele **sai daqui** (o relato vai para o `HISTORY.md`). Item novo entra na seção que o
> autor disser, com a data. Cada linha é `ponteiro — o que é, em poucas palavras — decisão (data)`.
> Itens que a conversa trouxe e ainda não têm número entram primeiro em `IDEAS.md` ou `PROBLEMS.md`.

Triagem de 2026-10-31, com o autor.

---

## 1. Agora

Resolver primeiro; o autor considera simples ou próximo.

- **P-061** — o stream do chat entre colaboradores segue aberto depois de desativar o usuário. Parece simples, resolver já (2026-10-31).
- **P-063** — Ponto: o dia de hoje com execução em andamento não mostra o período corrente. Interessante resolver (2026-10-31).
- **I-036** — status de usuário vira coluna `ativo`, e os booleanos sem prefixo `is_`. "Um dos mais próximos" (2026-10-31). Antes de especificar, avaliar os casos listados no item.
- **I-019** — teste que garanta o stub de `class-validator` do frontend. "Importante, temos que ter" (2026-10-31).
- **I-043** — atualizar os pacotes dos provedores de IA para poder usar sempre os modelos mais novos. Perto de "Agora" por ser concreto (2026-10-31).

## 2. Em seguida

Resolver depois do bloco "Agora", sem ordem entre si.

- **P-023** — desfazer a entrada numa demanda sem outros membros é recusado. "Temos que resolver"; decidir antes se a recusa é o certo (2026-10-31).
- **P-025** — conversas dos desenvolvedores: período e busca olham só uma janela do histórico. "Temos que ver, depois" (2026-10-31).
- **P-043** — chat da IA: pergunta sem resposta, mas com custo registrado. "Temos que ver" (2026-10-31).

## 3. A pensar

Sem urgência; o autor quer conversar antes de especificar.

- **I-037** — visão do cliente sobre as demandas do próprio projeto. "Temos que pensar um pouquinho" (2026-10-31).
- **I-024** — imagens e prints nos chats. "Podemos pensar um pouco" (2026-10-31).
- **I-031** — escolher pela tela o nível de IA de cada tipo de prompt. "Podemos pensar" (2026-10-31).
- **I-041** e **I-044** — custo da pesquisa na internet e o aviso, no chat, de que houve pesquisa, com as referências. Olhar as ferramentas de busca dos três provedores (2026-10-31).
- **I-040** — documentar tabelas e campos na tela de Modelagem. Olhar, sem ser prioridade (2026-10-31).
- **I-002** e **P-001** — lint. "Podemos dar uma olhada" e decidir se vale resolver (2026-10-31).

## 4. Esperando o Git (Gitea)

- **I-030** — integração com o Git. "Por enquanto não, mas logo mais" (2026-10-31).
- **I-005** — IA lê o código dos projetos. Provavelmente parte da integração com o Git (2026-10-31).
- **I-023** — documentação a partir do que foi feito. Também ligada ao Git (2026-10-31).

## 5. Esperando o chat em grupo

- **I-020** — quem sai da demanda continua vendo o histórico do canal. Ligado ao `chat-grupos`; "por enquanto não tem problema" (2026-10-31).
- **I-021** — resumo da IA citando autores. "Não tem problema" por ora (2026-10-31).

## 6. Sem prioridade por enquanto

- **I-006** — gestor pergunta à IA onde o time tem mais dúvida (2026-10-31).
- **I-022** — plano que vira várias demandas (2026-10-31).
- **I-028** — cada usuário escolhe a autonomia da IA (2026-10-31).
- **I-010** — revisar os prompts da revisão das descrições. "Dá para fazer depois" (2026-10-31).
- **I-001** — biblioteca própria de componentes (2026-10-31).
- **P-049** — campo `codigo` do modelo do projeto sem uso. Segue aberto por enquanto (2026-10-31).
- **P-059** — `modelagem.page.spec` instável na suíte inteira. "Instável mesmo, é complexo" (2026-10-31).
- **P-029** e **P-030** — ficam `ACEITO`, não vale o esforço (2026-10-31).

## 7. Aguardando o autor

- **I-042** — formulário de criação do projeto. O autor diz que já o fechou e vai passar os ajustes quando terminar a definição das prioridades (2026-10-31).

## 8. Specs já escritas no backlog

Ainda **sem ordem decidida** entre si nem em relação ao bloco "Agora". O autor define.

- `tipo-ajudante.spec.md` (tasks 283–287)
- `chat-grupos.spec.md` (tasks 246–250)
- `chat-proposta-no-documento.spec.md` (tasks 273–277)
- `261-ia-roteamento-hibrido-por-nivel-e-esforco.spec.md`
- `222-modelagem-em-arquivo-json.spec.md`
