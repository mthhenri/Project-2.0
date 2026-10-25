# chat-propostas.spec.md

> Guarda-chuva das **propostas da IA** no chat: cartões mais simples, várias propostas juntas, diff por palavra, autonomia por tipo e
> propostas novas, mais a correção do sumiço da mensagem e do scroll. Origem: conversa com o autor em 2026-10-25 (`IDEAS.md` I-026).
> **Não é uma task implementável**: registra as decisões; cada task tem a sua spec (tasks **224–231**, na tabela de tasks no fim) e é
> implementada a partir dela. Estende o mecanismo de propostas da task 136 (`done/rework-chat-ia.spec.md`) e o desfazer com prazo da task 194. O
> antes e depois de cada cartão está no canvas privado do autor (link em [`chat-propostas/referencias.md`](chat-propostas/referencias.md));
> o canvas ilustra, a spec decide.

## Objetivo

Confirmar tudo cansa, e os cartões ocupam muito espaço para mudanças pequenas. A IA passa a **agir sozinha onde a ação é fácil de
desfazer**, os cartões ficam **compactos** quando a mudança é pequena, várias propostas da mesma resposta viram **um grupo com
"Confirmar todas"** e toda mudança de texto aparece como **diff por palavra**. Antes de tudo, a resposta da IA com proposta deixa de
sumir e voltar, e a rolagem acompanha o cartão.

## O que existe hoje (levantamento de 2026-10-25)

- **16 tipos** em `TipoPropostaIaEnum`, cada um com ferramenta de proposta (só cria a proposta pendente; não enxerga service de domínio)
  e executor (chama a service do domínio com o token de quem confirma). As ferramentas aparecem ao modelo pelo tipo de usuário
  (`QUALQUER`, `GESTOR`, `ADMINISTRADOR`).
- **Salvaguardas que continuam valendo:** só o dono resolve a proposta; a confirmação é atômica (`PENDENTE` → resolvida antes do
  executor; falha devolve a `PENDENTE`); pendente de dia anterior expira ao ser lida; pendentes obsoletas expiram na volta de uma queda;
  desfazer só em 30 min e recusado se o estado mudou; seção Pessoal do pad só com `pedidoExplicito`.
- **Brecha nas conexões:** `DemandaService.criarConexao`/`excluirConexao` não recebem o usuário; a regra "só gestor" mora só no
  controller (`@GestorOnly`) e na permissão da ferramenta.
- **Defeitos encontrados na leitura do código** (não reproduzidos ao vivo):
  1. **A mensagem some e volta.** Durante a resposta, texto e cartões ficam na bolha temporária `aoVivo` da `chat.page`; no evento
     `fim` a bolha é apagada e a mensagem gravada entra no lugar. O `app-chat-proposta-cartao` é destruído e recriado e busca a proposta
     de novo (pisca em "Carregando proposta…"); a rolagem roda com o cartão ainda pequeno e não acompanha o crescimento.
  2. **Só a primeira proposta fica na mensagem.** `ChatService` grava `propostaId: propostasDoTurno[0]`; com duas ou mais propostas na
     mesma resposta, ao reabrir a conversa só a primeira aparece.
  3. **Texto colado entre voltas.** O texto de cada volta do laço de ferramentas é concatenado sem separador (`texto += resposta.texto`).

## Decisões do autor

1. **Régua de autonomia:** quanto mais fácil de desfazer, menos a IA pergunta. Três níveis por tipo de proposta:
   - **Faz e avisa:** a IA executa na hora e deixa uma linha na conversa, com o ícone da IA (o `pi-sparkles` da IA Config.) e
     **Desfazer** pelo prazo de hoje (30 min).
   - **Pergunta:** como hoje, nada acontece até confirmar.
   - **Sempre pergunta:** fixo, fora da configuração; marcado com um **escudo** (não um cadeado, que lia como "só gestor"). Vale para o
     que mexe em horas, em ponto, em projeto ou em outra pessoa.
2. **Quem configura:** por enquanto **só o administrador**, na IA Config., valendo para todos. A escolha por usuário fica como ideia
   (`IDEAS.md` I-028).
3. **Diff por palavra** nos cartões: o mesmo do modo planejamento (`chat-planejamento.spec.md`, decisão 10), texto uma vez só, o que sai
   riscado em vermelho e o que entra em verde, também em código. Entra em Descrever demanda (que hoje mostra só o texto novo, e ganha
   Mudanças, Antes e Depois), Trocar trecho do pad, documentação de Alterar demanda, nome em Alterar atividade e horários e duração em
   Corrigir execução.
4. **Cartão compacto:** mudança pequena vira uma linha (ação, nome, chips de antes → depois, e ✓, lápis e × com `pTooltip`). Texto longo ou
   mais de três campos ficam no cartão grande. Depois de confirmar, sobra uma linha verde com Desfazer.
5. **Várias propostas na mesma resposta:** um **grupo só** no fim da resposta, com **Confirmar todas** e **Recusar todas**. Cada linha é
   numerada, abre os detalhes, pode ser ajustada ou tirada do grupo e mostra "depende da N". Confirma na ordem; se uma falhar, as que
   dependem dela ficam pendentes com o motivo na linha. Depois: "N feitas · Ver · Desfazer todas". Quando o grupo mistura níveis, o que
   já foi feito aparece numa linha azul em cima e o resto em "N esperando você".
6. **Propostas novas:**
   - **Concluir demanda** (quem é da demanda e o gestor; Pergunta), com aviso das atividades abertas e a escolha "Só a demanda".
   - **Mover atividade para outra demanda** (dono da atividade e o gestor; Pergunta), mostrando de onde para onde e que as execuções vão
     junto.
   - **Desconectar demandas** (só gestor; Faz e avisa): remove uma conexão do grafo, o contrário de conectar; as demandas não mudam de
     lugar.
   - **Excluir atividade sem execução** (dono e gestor; Pergunta). Com execução, a IA não oferece e explica que é pela tela.
   - **Justificar o ponto** (**só gestor**, no ponto de outra pessoa, como a tela hoje; Sempre pergunta). O desenvolvedor não justifica o
     próprio ponto e a IA não oferece isso a ele.

## Nível por tipo (sugestão do agente aprovada como ponto de partida; o administrador muda o que não é fixo)

"Gestor" nesta spec é a permissão de gestor (gestor e administrador, `temPermissaoDeGestor`); o que é de administrador é só do
administrador.

| Tipo | Quem pode | Nível inicial |
|---|---|---|
| Anotar no pad (fora da seção Pessoal) | todos, no próprio pad | Faz e avisa |
| Anotar no pad, seção Pessoal | todos, só com pedido explícito | Sempre pergunta |
| Colocar e tirar tags | todos, no que é deles | Faz e avisa |
| Descrever execução, continuando na mesma atividade | todos, a própria | Faz e avisa |
| Descrever execução e trocar de atividade | todos, a própria | Faz e avisa (`chat-execucao-por-demanda.spec.md`) |
| Conectar e desconectar demandas | só gestor | Faz e avisa |
| Criar atividade e marcar desenvolvida, no próprio trabalho | todos, os próprios | Faz e avisa (`chat-execucao-por-demanda.spec.md`) |
| Alterar atividade, criar e alterar demanda, concluir demanda, mover e excluir atividade | conforme a regra de hoje | Pergunta |
| Iniciar e pausar a própria execução | todos, a própria | Faz e avisa (`chat-execucao-por-demanda.spec.md`) |
| Suspender e retomar o check-in, entrar numa demanda | todos, os próprios | Pergunta |
| Descrever demanda | só gestor | Pergunta |
| Registrar e corrigir execução, criar projeto, justificar o ponto | conforme a regra de hoje | Sempre pergunta |
| Qualquer ação em nome de outra pessoa (iniciar, pausar, criar atividade ou pôr membro para outro) | gestor | Sempre pergunta |

## Decisões do agente (padrão proposto; o autor confirma na spec de cada task)

- **"Faz e avisa" reaproveita a proposta:** a ferramenta cria a proposta e a confirma na hora, pela mesma `PropostaIaService`, em nome
  do usuário do token (mesmo executor, mesmas permissões, mesmo desfazer). A ferramenta continua sem enxergar a service de domínio. O
  modelo recebe "feito" em vez de "o usuário precisa confirmar".
- **Onde fica a autonomia:** um campo novo na `configuracao_ia` versionada (mapa tipo → nível), com o padrão da tabela acima vindo do
  `shared`. Os tipos e casos "sempre pergunta" são regra pura do `shared`, ignoram a configuração e não aparecem no painel.
- **O nível é decidido no backend** a partir dos dados da proposta (por exemplo, "em nome de outra pessoa" e seção Pessoal), nunca pelo
  modelo.
- **Mensagem com várias propostas:** a mensagem do chat passa a guardar a **lista** de propostas do turno nos três armazenamentos
  (OpenSearch, Elasticsearch e o Postgres provisório); mensagem antiga com uma só continua lida como lista de um.
- **Sem bolha temporária trocada:** a resposta em andamento e a mensagem gravada são o mesmo item da lista, e o cartão não é recriado (os
  dados da proposta já carregados são reaproveitados). A rolagem acompanha até o cartão terminar de carregar, salvo se o usuário subiu.
- **Confirmar todas** vai ao backend numa chamada só, na ordem do grupo, parando nas dependentes de uma que falhou; cada proposta segue
  atômica e com o seu próprio desfazer. "Desfazer todas" desfaz na ordem inversa e para na primeira que recusar.
- **Conexões:** antes de conectar e desconectar virarem "faz e avisa", a regra "só gestor" desce para `criarConexao`/`excluirConexao`
  (recebendo o usuário), além do `@GestorOnly`.
- **Exclusões (exceção aprovada pelo autor em 2026-10-25):** o registro de ferramentas hoje recusa nomes com excluir, remover, apagar e
  parecidos (`SYSTEM.SPEC.md`, `ferramenta-ia`, "Sem exclusão"). Abre-se exceção nomeada **só** para dois casos: excluir atividade **sem
  nenhuma execução** e desconectar duas demandas. Qualquer outra exclusão continua proibida à IA. O `SYSTEM.SPEC.md` é atualizado na
  mesma task, e exclusão continua soft delete.
- **Renomear:** já existe hoje, pelos campos `nome` de `ALTERAR_ATIVIDADE` e de `ALTERAR_DEMANDA`; a ferramenta de atividade já cita
  "renomeia a Z". O cartão de hoje mostra só "Novo nome"; com o diff, o nome atual (`atividadeNome`/`demandaNome`, gravados na proposta)
  contra o novo aparece por palavra. Renomear segue no nível de Alterar atividade e Alterar demanda (Pergunta).
- **Justificar o ponto** usa a regra e a service da tela de justificativas (só gestor), sem regra nova.

## Fora de Escopo

- Escolha de autonomia por usuário (`IDEAS.md` I-028).
- Executar sem registro: toda ação da IA continua sendo uma proposta, com dono, situação e desfazer.
- Mudar quem pode fazer o quê no sistema: a IA segue exatamente as permissões do usuário.
- Propostas além das cinco novas; o modo planejamento e a edição de trecho do plano (`chat-planejamento.spec.md`).
- `PROBLEMS.md` P-023 (desfazer da entrada numa demanda sem outros membros) fica como está, salvo decisão própria.

## Dependências

- `docs/SYSTEM.SPEC.md` §14 (permissões) e as linhas `chat`, `ferramenta-ia` e `proposta-ia` da tabela de módulos: o "nada roda sem
  confirmação" e o "sem exclusão" mudam e são reescritos nas tasks que os mudam.
- O **diff por palavra** é também a fase 1 de `chat-planejamento.spec.md`: é uma task só, feita uma vez, usada pelas duas guarda-chuvas.

## Riscos e Mitigação

- **"Faz e avisa" errado custa mais que uma pergunta a mais.** Mitigação: só tipos com desfazer confiável começam nesse nível, e o
  desfazer de cada um ganha teste de "estado mudou depois".
- **A correção do sumiço mexe no fluxo de streaming do chat**, que é sensível (bom dia, retomada, check-in usam o mesmo caminho).
  Mitigação: teste de componente cobrindo resposta com e sem proposta, com duas propostas e com falha no meio, e verificação ao vivo.

## Tasks (224–231)

| # | Task | Escopo | Depende de |
|---|---|---|---|
| 224 | [Diff sobreposto por palavra](../done/224-diff-sobreposto-por-palavra.spec.md) | regra pura no `shared`, componente de exibição, troca nos cartões da decisão 3 e no pad; **é também a fase 1 de `chat-planejamento.spec.md`** (uma task só para as duas guarda-chuvas) | — |
| 225 | [Sumiço, scroll e várias propostas](../done/225-chat-sumico-scroll-e-varias-propostas.spec.md) | item único para resposta em andamento e gravada, cartão sem recriar, rolagem, lista de propostas nos três armazenamentos, separador entre voltas | — |
| 226 | [Cartão compacto](226-proposta-cartao-compacto.spec.md) | cartão de uma linha para mudança pequena e a linha de "feito" com Desfazer | 224, 225 |
| 227 | [Propostas em grupo](227-propostas-em-grupo.spec.md) | grupo no fim da resposta, Confirmar todas, Recusar todas e Desfazer todas, dependência entre linhas | 225, 226 |
| 228 | [Autonomia por tipo](228-propostas-autonomia-por-tipo.spec.md) | regra de níveis no `shared`, campo na `configuracao_ia`, painel na IA Config., "faz e avisa", linha azul, gestor nas conexões | 226, 227 |
| 229 | [Concluir demanda e mover atividade](229-proposta-concluir-demanda-e-mover-atividade.spec.md) | duas propostas novas (nível Pergunta) | 228 (nível); 224, 226 (cartão) |
| 230 | [Desconectar demandas e excluir atividade](230-proposta-desconectar-demandas-e-excluir-atividade.spec.md) | duas propostas novas e a exceção nomeada ao "sem exclusão" | 228 (nível) |
| 231 | [Justificar o ponto](231-proposta-justificar-ponto.spec.md) | proposta nova, só gestor, sempre pergunta | 228 (nível) |

A 224 e a 225 não dependem de nada e podem ser feitas em qualquer ordem; a 229 a 231 podem ser feitas em qualquer ordem entre si.

Para UI, o análogo aprovado é a tela atual do chat (`modules/chat/pages/chat`) e o `proposta-cartao`; o painel de autonomia segue a tela
de Configurações da IA (task 204).
