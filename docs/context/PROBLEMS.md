# PROBLEMS.md — Problemas Conhecidos

> **O que entra aqui:** o que está **quebrado, degradado ou aceito como dívida agora**. Um item
> existe aqui enquanto o problema existe. Quando o problema é resolvido, o item **sai deste
> arquivo** — o relato da correção vive em [`HISTORY.md`](HISTORY.md), não aqui.
>
> **O que NÃO entra aqui:** feature que falta (isso é spec no `docs/specs/backlog/`), ideia (isso
> é [`IDEAS.md`](IDEAS.md)), e decisão consciente de design que está funcionando como desejado
> (isso é `CONTEXT.md`).
>
> **Estados:** `ABERTO` (dói e não tem contorno) · `CONTORNADO` (dói, mas existe um jeito de
> conviver — o contorno está descrito) · `ACEITO` (não vai ser corrigido; fica registrado para
> ninguém "descobrir" de novo).
>
> **Formato de entrada** — copie o bloco abaixo, numere sequencialmente e **não reaproveite
> número de item removido**:
>
> ```markdown
> ### P-031 — Token continua valendo depois que o usuário é desativado ou excluído · `ABERTO` · autenticacao

- **Sintoma:** quem foi desativado ou excluído continua chamando a API (inclusive enviando mensagem no chat entre colaboradores) até o token expirar; a modelagem do chat pede "remetente ativo".
- **Causa:** `JwtStrategy.validate` só devolve o payload; o status do usuário é conferido apenas no login (`autenticacao.service.ts`).
- **Contorno:** o token vence sozinho; a service do chat confere o **destinatário**, não o remetente.
- **Correção:** conferir o usuário (existe, ativo) na estratégia JWT ou num guard global, com o custo de uma consulta por requisição (ou cache curto).
- **Desde:** achado na revisão da task 208 (2026-10-21); a lacuna é do projeto inteiro, não do chat.

### P-0NN — <título curto> · `ABERTO|CONTORNADO|ACEITO` · <área>
>
> - **Sintoma:** o que se observa.
> - **Causa:** a raiz, se conhecida — ou "não investigada".
> - **Contorno:** como conviver, se houver.
> - **Correção:** o que resolveria de fato, se conhecido.
> - **Desde:** quando apareceu (task/commit/data).
> ```

---

## Ativos

### P-023 — Desfazer da entrada numa demanda sem outros membros é recusado · `ABERTO` · chat IA/demanda

- **Sintoma:** o desenvolvedor entra numa demanda **sem nenhum membro** pelo chat (cartão "Atribuir membro", Confirmar) e, ao clicar em **Desfazer**, a API responde
  `400 Não é possível remover o último membro da demanda`. A mesma regra faz a IA recusar "sai da demanda X" quando ele é o único membro.
- **Causa:** o desfazer de `ATRIBUIR_MEMBRO` remove a linha de `demanda_usuario` pela mesma regra de remoção da tela, que nunca deixa a demanda sem membro.
- **Contorno:** deixar a pessoa na demanda, ou o gestor colocar outro membro antes de ela sair.
- **Correção:** decidir se o desfazer de uma entrada que acabou de acontecer deve valer mesmo com a regra (por exemplo, o executor desfaz direto a linha que ele mesmo criou) ou se a recusa é o comportamento esperado (então este item vira `ACEITO`).
- **Desde:** 2026-10-19 (observado na verificação ao vivo da task 170, `VERIFICACAO-170-FECHAMENTO.md`).

### P-025 — Conversas dos desenvolvedores: o período e a busca olham só uma janela do histórico · `ABERTO` · chat IA/gestor

- **Sintoma:** com mais de 100 dias de chat, `listar_conversas_do_desenvolvedor` com `inicio`/`fim` antigos devolve lista vazia e `haMais: false`; `buscar_nas_conversas_do_desenvolvedor` pede 50 achados ao armazenamento antes de filtrar o contexto `CHAT`, então mensagens de check-in ocupam vagas.
- **Causa:** o filtro de período e de contexto é aplicado em memória, depois de o armazenamento já ter cortado em `LIMITE_CONVERSAS` (100) e `LIMITE_BUSCA` (50).
- **Contorno:** o gestor pede períodos recentes ou busca por texto mais específico.
- **Correção:** passar o intervalo e o contexto à consulta do armazenamento (`ArmazenamentoDeChat`, nos três repositórios) ou, no mínimo, sinalizar o truncamento.
- **Desde:** 2026-10-20 (task 201).

### P-027 — Quebra visual do cronômetro correndo em Ponto/Execuções não reproduzida · `ABERTO` · ponto/execucao/frontend

- **Sintoma:** o autor relatou que as telas de Ponto e Execuções "quebram visualmente" com o horário rodando.
- **Causa:** não reproduzida. A task 201 corrigiu um desalinhamento real (atividade em colunas diferentes no card de Ponto da equipe) e mediu 9 s de cronômetro sem tremor de largura em Chromium/Linux; o defeito do autor pode ser outro (fonte monoespaçada diferente no Windows, outro estado da tela).
- **Contorno:** nenhum conhecido.
- **Correção:** precisa de uma captura da tela quebrada e do ambiente (sistema, navegador ou Project Desktop, largura da janela).
- **Desde:** 2026-10-20.

### P-029 — Custos da IA: alias que não é prefixo do id datado aparece como modelo sem preço · `ACEITO` · ia-custo

- **Sintoma:** com um alias como `claude-sonnet-4-0` (o provedor devolve `claude-sonnet-4-20250514`), o uso aparece como um modelo à parte, "sem preço", mesmo com o alias precificado.
- **Causa:** a mensagem guarda o modelo que o provedor devolveu, e `agruparPeloNomeConhecido` só junta `nome + - + data de 8 dígitos`. A task 201 gravava o modelo pedido, e a 202 passou a ler o da mensagem.
- **Contorno:** precificar também o id datado na própria aba (aparece como linha na tabela por modelo). Os nomes usados hoje (`claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5`) casam.
- **Correção:** gravar também o modelo pedido na mensagem (junto da medição exata por modelo, `IDEAS.md` I-018).
- **Desde:** 2026-10-20 (task 202).

### P-030 — Soma de tokens do Postgres do chat lê a tabela inteira · `ACEITO` · chat/ia-custo

- **Sintoma:** `ChatMensagemPostgresRepository.somarTokens` filtra por `created_date AT TIME ZONE ... AS date` e não usa índice (`chat_mensagem` só tem índice por usuário/conversa/data).
- **Causa:** o recorte é por dia no fuso do sistema, e não há índice só em `created_date`.
- **Contorno:** o armazenamento Postgres é provisório (só o ambiente de teste, `SCHEMA.md` "Tabelas provisórias"), e a consulta é só do administrador. OpenSearch e Elasticsearch filtram por `range` indexado.
- **Correção:** índice em `created_date` e filtro por intervalo de `timestamptz`, se a tabela provisória crescer.
- **Desde:** 2026-10-20 (task 202).

### P-036 — Dois testes de `mensagem-direta-notificacoes` falham, inclusive sozinhos · `ABERTO` · frontend/mensagem-direta

- **Sintoma:** `escolher uma posição grava o conjunto com ela e descarta o arranjo arrastado` e `se o servidor recusa a posição, a tela volta à anterior e o menu avisa` falham (`querySelector`/`textContent` de `null`) em `mensagem-direta-notificacoes.component.spec.ts`, rodando só esse arquivo.
- **Causa:** não investigada; falham também sem as mudanças da task 245 (conferido com `git stash`). Suspeita: o menu de posição do popup (task 221, popover do PrimeNG) não abre no teste.
- **Contorno:** nenhum; a tela funciona (verificada ao vivo na 221).
- **Correção:** reproduzir o teste, ver se o popover abre e ajustar o teste ou o componente.
- **Desde:** 2026-10-26 (visto no fecho da task 245).
- **Nota (2026-10-30):** não reproduzido; passa sozinho (16 testes) e na suíte inteira do frontend. Se não voltar a aparecer, pode virar flaky de ambiente e o item sair.

### P-039 — O exibidor de Markdown da resposta da IA não renderiza tabelas · `ABERTO` · frontend/markdown/chat IA

- **Sintoma:** quando a IA responde com uma tabela Markdown (`| Opção | Como funciona | ... |` com a linha `|---|---|`), o chat mostra o texto cru, com as barras verticais e os hifens, tudo corrido em parágrafos, em vez de uma tabela.
- **Causa:** não investigada; o subconjunto de Markdown do editor/visualizador não inclui tabela (`markdown-formatado.ts` trata `table` como fora do subconjunto), e o visualizador da resposta parece seguir o mesmo subconjunto.
- **Contorno:** pedir à IA para responder em lista em vez de tabela.
- **Correção:** a decidir pelo autor: fazer o visualizador (`markdown-visualizador`) renderizar tabela GFM só na leitura (sem criá-la no editor), ou orientar o prompt da IA a não usar tabela.
- **Desde:** 2026-10-27 (apontado pelo autor, com captura de uma resposta com três opções de sincronização).

### P-040 — Check-in da IA: execução ativa na topbar não recarrega e fechamento automático · `ABERTO` · frontend/checkin/chat IA

- **Sintoma:** no check-in da IA (e em outros fluxos que mudam a execução), a execução ativa mostrada na topbar não recarrega sozinha; o check-in vem "fechando sozinho", por causa do auto-confirmar da IA na descrição da execução.
- **Causa:** não investigada (o fechamento parece vir da confirmação automática da proposta de descrição da execução).
- **Contorno:** recarregar a tela à mão para ver a execução ativa atualizada.
- **Correção:** a decidir: recarregar a execução ativa da topbar ao fim das ações da IA/check-in e nos demais fluxos que a alteram; impedir que o auto-confirmar da descrição da execução encerre o check-in.
- **Desde:** 2026-10-27 (apontado pelo autor).

### P-043 — Chat IA: pergunta sem resposta (falha ou timeout) mas com custo registrado · `ABERTO` · chat IA/backend

- **Sintoma:** o autor fez uma pergunta no chat da IA e não veio nenhuma resposta, mas o gasto da chamada apareceu nos custos. Há falhas na resposta da IA e timeouts.
- **Causa:** não investigada (a hipótese a verificar é a chamada gastar tokens e a resposta se perder, por timeout ou erro no streaming, sem chegar ao chat).
- **Contorno:** repetir a pergunta (e arcar com o custo de novo).
- **Correção:** a investigar: achar onde a resposta se perde (timeout do provedor, do streaming ou do front), avisar o usuário quando falhar em vez de silêncio, e decidir como contabilizar o custo de uma chamada que não entregou resposta.
- **Desde:** 2026-10-27 (apontado pelo autor; pergunta e conversa não anexadas).

### P-047 — Grafo: tirar um item do filtro só o apaga para cerca de 25% de opacidade · `ABERTO` · demanda/frontend

- **Sintoma:** ao remover algo do filtro do grafo, o item fica só meio apagado (cerca de 25% de opacidade) em vez de sair da visão.
- **Causa:** o filtro esmaece em vez de ocultar; comportamento a confirmar com o autor (pode ser o desejado).
- **Contorno:** nenhum; o item continua visível.
- **Correção:** decidir entre ocultar o item ou manter o esmaecimento, e ajustar o filtro conforme a decisão.
- **Desde:** 2026-10-29 (apontado pelo autor).

### P-049 — Campo `codigo` do modelo do projeto na base não tem uso · `ABERTO` · banco/schema

- **Sintoma:** o modelo do projeto guarda um campo `codigo` que, segundo o autor, é quase inútil.
- **Causa:** não investigada quanto a consumidores; o campo existe no schema e no modelo.
- **Contorno:** nenhum; o campo fica sem efeito.
- **Correção:** remover a coluna por migration nova (sem editar a já aplicada), ajustando DTOs, repository e `docs/SCHEMA.md`. Rodar `gerenciamento-de-impacto` antes.
- **Desde:** 2026-10-29 (apontado pelo autor).

### P-052 — Exibição da cor do projeto na tela de projetos · `ABERTO` · projeto/frontend

- **Sintoma:** a cor do projeto aparece de um jeito que o autor quer alterar.
- **Causa:** não investigada; o relato não diz qual forma de exibição é a desejada.
- **Contorno:** nenhum.
- **Correção:** definir com o autor a nova exibição e aplicar na tela de projetos.
- **Desde:** 2026-10-29 (apontado pelo autor).

### P-054 — Detalhes do dia no ponto com filtro de usuário em layout vertical · `ABERTO` · ponto/frontend

- **Sintoma:** os detalhes do dia no ponto, com filtro de usuário, são exibidos em lista vertical, que o autor quer rever.
- **Causa:** o layout vertical foi o escolhido na primeira versão.
- **Contorno:** nenhum.
- **Correção:** avaliar outro formato, como uma exibição em serpentina, e aplicar o escolhido.
- **Desde:** 2026-10-29 (apontado pelo autor).

### P-057 — Tela de login e lembrança do usuário pedem ajustes · `ABERTO` · autenticacao/frontend

- **Sintoma:** a tela de login precisa de ajustes, e a retenção e lembrança do usuário precisa ser revista.
- **Causa:** não investigada; o relato não detalha os ajustes.
- **Contorno:** nenhum.
- **Correção:** levantar com o autor os ajustes de layout e o comportamento desejado de lembrar o usuário, e aplicar.
- **Desde:** 2026-10-29 (apontado pelo autor).

### P-059 — Teste de `modelagem.page.spec` instável na suíte inteira · `ABERTO` · frontend/testes

- **Sintoma:** `escolher uma relação no painel passa para a outra tabela` falha às vezes em `npm run test --workspace=frontend` (por tempo esgotado com o limite antigo de 5 s; duas vezes com o limite de 20 s, o que indica trava e não só lentidão) e passa sozinho (22 testes) e na rodada seguinte, sem mudança de código.
- **Causa:** não investigada; parece carga da suíte inteira, como o antigo P-034.
- **Contorno:** rodar o arquivo sozinho ou repetir a suíte.
- **Correção:** medir o teste sob carga e ver o que ele espera (renderização do diagrama?) antes de mexer no limite.
- **Desde:** 2026-10-30 (visto nos fechos dos P-035/P-038/P-041/P-055 e dos P-050/P-051/P-058; 7 rodadas completas, 3 falhas dele).

### P-001 — Projeto sem lint · `CONTORNADO` · repositório

- **Sintoma:** não há ESLint nem Prettier em nenhum workspace; o gate de qualidade do `CLAUDE.md` pede lint e hoje a lacuna é só declarada no fecho de cada task.
  (A parte de **testes** deste item foi resolvida pelas tasks 171–187: ver `HISTORY.md`, bloco da 187, com a cobertura de partida e a final.)
- **Causa:** o projeto foi construído verificando por build, testes e execução manual; nunca se escolheu nem configurou um linter.
- **Contorno:** `npm test` na raiz, `npm run test:integracao`, build dos workspaces e verificação ao vivo (skill `verify`); revisão do diff pela skill `conventions-check`.
- **Correção:** escolher e configurar lint e acrescentar ao CI (`IDEAS.md` I-002).
- **Desde:** origem do projeto.
