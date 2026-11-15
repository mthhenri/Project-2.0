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
> ### P-0NN — <título curto> · `ABERTO|CONTORNADO|ACEITO` · <área>
>
> - **Sintoma:** o que se observa.
> - **Causa:** a raiz, se conhecida — ou "não investigada".
> - **Contorno:** como conviver, se houver.
> - **Correção:** o que resolveria de fato, se conhecido.
> - **Desde:** quando apareceu (task/commit/data).
> ```

---

## Ativos

> P-089 a P-098 vêm da revisão de requisições e de permissões (2026-11-13 a 15): são os achados de severidade alta e os de média reproduzidos na aplicação rodando. A revisão tem 225 achados ao todo; os demais
> estão em [`DOSSIE.md`](../specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md) (código `A-NNN`) e cada um aponta para a sua spec na guarda-chuva `docs/specs/backlog/requisicoes-e-permissoes-correcoes.spec.md` (tasks 329–486).

### P-098 — Execução: regra de negócio respondida antes da permissão · `ABERTO` · backend/execucao

- **Sintoma:** desenvolvedor sem acesso recebe 400 com a regra ("Só é possível iniciar execução em atividades planejadas ou em desenvolvimento", "A descrição é obrigatória", "Esta execução já foi encerrada") em `POST /execucao` e `PATCH /execucao/:id/encerrar` sobre atividade ou execução alheia, em vez de 403. Reproduzido em 2026-11-14 (é o R-16 da auditoria anterior, com mais dois casos).
- **Causa:** em `ExecucaoService.iniciar` e `encerrar` as validações de negócio vêm antes do bloco de permissão.
- **Contorno:** nenhum; a execução não é criada nem alterada, mas a resposta revela o estado do registro.
- **Correção:** `375-execucao-permissao-antes-da-regra-de-negocio`.
- **Desde:** 2026-11-11 (auditoria de requisições, R-16); ampliado em 2026-11-14.

### P-097 — Auxiliar recebe 403 a cada demanda que abre · `ABERTO` · frontend/demanda e backend/mensagem-direta

- **Sintoma:** como auxiliar, toda demanda selecionada gera `GET /mensagem-direta/canal/demanda/:id` com 403, e o detalhe do projeto gera `GET /mensagem-direta/canal/projeto/:id` com 403. Medido em 2026-11-13.
- **Causa:** o botão do chat pergunta pelo canal a cada alvo, para todo tipo de usuário, e o backend só deixa entrar no canal quem é membro ou tem poder de gestor (`canal-acesso.service.ts`); a regra do auxiliar no canal não está escrita.
- **Contorno:** nenhum (o 403 não aparece na tela; é requisição perdida a cada clique).
- **Correção:** `360-canal-de-demanda-e-de-projeto-para-o-auxiliar`, `405-demanda-botao-do-chat-sem-pergunta-a-cada-selecao`; as duas esperam decisão do autor.
- **Desde:** 2026-11-13 (existe desde os canais de projeto e de demanda, task 248).

### P-096 — Plano marcado como "solo" tira gestor e administrador de arquivar e excluir · `ABERTO` · backend/plano

- **Sintoma:** o criador marca solo um plano de projeto e o administrador passa a receber 404 em `GET /plano/:id`, `PATCH /plano/:id/arquivo` e `DELETE /plano/:id`; o plano some da lista dele. Reproduzido em 2026-11-14.
- **Causa:** `marcarSolo` só confere se quem chama é o criador, e a checagem de acesso vem antes da de arquivar e excluir.
- **Contorno:** o criador desmarca o solo.
- **Correção:** `397-plano-solo-e-o-que-o-gestor-mantem` (decisão do autor).
- **Desde:** 2026-11-14 (existe desde o modo planejamento).

### P-095 — Gestor e administrador são aceitos como membros de demanda pela API · `ABERTO` · backend/demanda

- **Sintoma:** `POST /demanda/:id/membro` com o id de um gestor responde 201 (para auxiliar, gestor e administrador), e `POST /demanda` com `usuarioIds` de gestor e administrador grava os dois em `demanda_usuario`. Usuário inativo também é aceito. Reproduzido em 2026-11-14.
- **Causa:** a regra "gestor nunca é membro" (`podeSerMembroDeDemanda`) só existe no filtro do seletor da tela e no caminho da IA; `DemandaService.atribuirMembro` e `criar` não a aplicam.
- **Contorno:** a tela não oferece gestor nem administrador no seletor.
- **Correção:** `381-demanda-membro-so-quem-atua-como-desenvolvedor`.
- **Desde:** 2026-11-14.

### P-094 — Project Desktop consulta o check-in a cada 15 s, com ou sem execução · `ABERTO` · desktop

- **Sintoma:** o processo principal pede `GET /checkin/situacao` a cada 15 s enquanto houver login (240 por hora por Desktop aberto), e `GET /mensagem-direta/preferencia` a cada 60 s; com a janelinha aberta, três consultas de 3 s correm juntas. Lido no código; o Electron não roda no ambiente da revisão.
- **Causa:** intervalo fixo em `desktop/src/main.ts` (`CONFERENCIA_OCIOSA_MS`), sem a agenda por `proximoCheckinData` que o front ganhou na task 322.
- **Contorno:** nenhum.
- **Correção:** `329-desktop-checkin-conferencia-agendada`, `461-desktop-janelinha-um-so-consultor`.
- **Desde:** 2026-11-13 (parte do R-01 que a task 322 não alcançou).

### P-093 — Detalhe da atividade mostra as 5 execuções mais antigas e perde a execução em andamento · `ABERTO` · frontend/atividade

- **Sintoma:** numa atividade com 6 ou mais execuções, "Execuções recentes" mostra as mais antigas, a faixa de execução em andamento não aparece e o status não é bloqueado. Confirmado no código; não foi visto na tela.
- **Causa:** `GET /execucao` devolve em ordem crescente de início, a tela pede `itensPorPagina=200` e guarda `itens.slice(0, 5)`, procurando a execução aberta só nelas. O diálogo de encerrar usa a mesma lista.
- **Contorno:** nenhum.
- **Correção:** `335-execucoes-da-atividade-as-ultimas-primeiro` (a correção barata é só de front; a eficiente pede decisão do autor).
- **Desde:** 2026-11-13.

### P-092 — A IA revela nome, caminho e status de demanda de projeto sem acesso · `ABERTO` · backend/atividade (ferramentas da IA)

- **Sintoma:** `propor_criar_atividade` grava na proposta o caminho completo (raiz › … › demanda) de qualquer demanda, e `propor_mover_atividade` devolve o nome e a situação da demanda de destino, sem conferir se o desenvolvedor a enxerga. Lido no código; a IA não tem provedor no ambiente da revisão.
- **Causa:** as duas ferramentas leem a demanda direto no repository, sem usuário; `AtividadeService.validarMudancaDeDemanda` confere existência e status antes do acesso.
- **Contorno:** nenhum.
- **Correção:** `367-ferramentas-de-atividade-conferem-o-acesso-a-demanda`.
- **Desde:** 2026-11-14.

### P-091 — Desenvolvedor membro da demanda altera a atividade e as tags de um colega · `ABERTO` · backend/atividade

- **Sintoma:** um desenvolvedor que é membro da demanda, sem ser dono da atividade, recebe 200 em `PUT /atividade/:id` e `PUT /atividade/:id/tag` da atividade de outro. Reproduzido em 2026-11-14. A tela trava pelo dono.
- **Causa:** `AtividadeService.alterar` e `alterarTags` só recusam quem não é dono E não é membro; há testes que fixam esse comportamento.
- **Contorno:** nenhum.
- **Correção:** `373-atividade-de-colega-so-o-dono-ou-quem-conduz-altera` (decisão do autor: corrigir ou escrever a regra).
- **Desde:** 2026-11-14.

### P-090 — `PUT /execucao/:id` deixa o mesmo dono com duas execuções ativas · `ABERTO` · backend/execucao

- **Sintoma:** reabrir duas execuções encerradas do mesmo dono (`fimData: null`) responde 200 nas duas e o banco fica com duas execuções abertas; o período também pode ser movido para cima de outra execução. Reproduzido em 2026-11-14 como auxiliar.
- **Causa:** `ExecucaoService.alterar` só valida futuro e ordem das datas; a conferência de execução ativa e de sobreposição existe só nos executores da IA.
- **Contorno:** a tela não oferece reabrir.
- **Correção:** `374-execucao-alterar-confere-ativa-e-sobreposicao`.
- **Desde:** 2026-11-14.

### P-089 — Supervisão do chat pode ser lida sem auditoria nem aviso · `ABERTO` · backend/mensagem-direta

- **Sintoma:** com o parâmetro `cursor` (um base64 que o cliente monta), `GET /mensagem-direta/supervisao/grupo/:id` e `GET /mensagem-direta/supervisao/conversa/:id` devolvem a conversa inteira sem gravar `mensagem_direta_supervisao` e sem a mensagem "leu esta conversa". A lista `GET /mensagem-direta/supervisao/conversas` devolve o texto da última mensagem e aceita busca por texto sem auditoria. Abrir um par que nunca conversou grava a auditoria e cria a conversa com o aviso. Os três reproduzidos em 2026-11-14.
- **Causa:** auditoria e aviso só rodam dentro de `if (!dto.cursor)`; a lista traz `ultimaMensagem` com `texto`; a leitura não confere se há mensagem entre os dois.
- **Contorno:** nenhum.
- **Correção:** `359-supervisao-do-chat-auditoria-com-ou-sem-cursor`, `390-supervisao-lista-sem-o-texto-das-mensagens`, `391-supervisao-de-par-sem-conversa-nao-cria-conversa`.
- **Desde:** 2026-11-14 (existe desde a supervisão, tasks 214 e 246).

> P-084 e P-085 vêm da auditoria de requisições das telas (2026-11-11); os demais (P-079 a P-083) foram corrigidos nas tasks 320–325. Medição, reprodução e recomendação de cada um em
> [`DOSSIE.md`](../specs/backlog/auditoria-requisicoes-telas/DOSSIE.md), pelo código R-NN citado. Os achados de impacto baixo (R-06 a R-10, R-12, R-13, R-15, R-16) ficaram só no dossiê.

### P-085 — Ação em massa nas atividades faz uma requisição por item · `ABERTO` · frontend/atividade

- **Sintoma:** com N atividades selecionadas, "Mudar status", "Acrescentar tags", "Excluir" e "Desfazer" fazem N chamadas (`PUT`, `PUT .../tag`, `DELETE`, `PATCH .../restaurar`) e depois recarregam a lista. Se uma falhar, a operação fica pela metade (R-14).
- **Causa:** não há rota em lote; a tela percorre a seleção chamando a rota de um item.
- **Contorno:** nenhum.
- **Correção:** rota em lote numa transação. Envolve contrato novo, decisão do autor: `435-atividades-acao-em-massa-em-lote`.
- **Desde:** 2026-11-11 (auditoria de requisições).

### P-084 — Excluir uma demanda mostra "Não encontrado" e recarrega a tela inteira · `ABERTO` · frontend/demanda

- **Sintoma:** depois de `DELETE /demanda/:id` com sucesso, a tela pede `GET /demanda/:id` da demanda excluída (404), mostra o aviso "Não encontrado: Registro não encontrado" e faz mais 11 requisições. Reproduzido três vezes (R-11). Desfazer a exclusão não recarrega nada (R-15).
- **Causa:** o evento de exclusão sobe pelo mesmo caminho de "demanda alterada": a página recarrega o grafo e manda a demanda aberta se reler antes de o componente dela ser desmontado. O desfazer avisa um componente que a própria exclusão já desmontou, então nada é relido e a demanda restaurada não volta à tela (reproduzido em 2026-11-14).
- **Contorno:** ignorar o aviso; a exclusão foi feita.
- **Correção:** `404-demanda-excluir-e-desfazer-sem-erro`.
- **Desde:** 2026-11-11 (auditoria de requisições; já aparecia na captura de 2026-11-05).

### P-077 — O Chat da IA e o chat entre colegas usam o mesmo ícone (balão duplo) · `ABERTO` · frontend/identidade visual

- **Sintoma:** o item "Chat" da barra lateral (a IA, `/chat`) e o botão "Chat com colegas" da barra de cima usam `pi-comments`; também a supervisão do chat e o estado vazio da lista de conversas. A pessoa não distingue um do outro só pelo ícone (pedido do autor, 2026-11-06).
- **Causa:** o ícone foi reaproveitado quando o chat entre colegas nasceu (tasks 205–215). Uma troca para `pi-envelope` foi tentada na task 316 e desfeita pelo autor no mesmo dia.
- **Contorno:** o rótulo ("Chat" na barra lateral, tooltip "Chat com colegas" no botão).
- **Correção:** escolher com o autor um par de ícones distintos (o PrimeIcons não tem um balão que sirva aos dois; `pi-sparkles` já é da IA em "IA Config." e em "Voltar para a IA", e `pi-users` é de Usuários); rodar `gerenciamento-de-impacto` sobre `pi-comments` nos cinco pontos.
- **Desde:** 2026-11-06.

### P-076 — Campo de código do chat entre colaboradores não quebra a linha ao digitar · `ABERTO` · frontend/chat

- **Sintoma:** no mini editor de código (`editor-codigo`) do chat entre colaboradores, uma linha longa estoura a largura e rola na horizontal, enquanto o bloco já enviado (`markdown-bloco-codigo`) passou a quebrar a linha.
- **Causa:** o editor usa `white-space: pre` na camada de realce e no `textarea`, com numeração de linhas de altura fixa (`--editor-codigo-linha`); quebrar sem alinhar as duas camadas desalinha a numeração.
- **Contorno:** rolar na horizontal; ao enviar, o bloco já aparece quebrado.
- **Correção:** quebrar a linha nas duas camadas com o mesmo cálculo de linhas visuais e manter a numeração por linha lógica; pede task própria.
- **Desde:** 2026-11-05.

### P-075 — Cadeias por nível da IA sem verificação com chave real de provedor · `ABERTO` · IA

- **Sintoma:** nenhuma chamada real foi feita aos provedores depois da spec 261 (sem chaves no ambiente de desenvolvimento). Ficaram só os testes com clientes falsos e a tela verificada ao vivo.
- **Causa:** o que depende de API real: (1) a **Responses API** do `gpt-6.1-sol` (nome e suporte de `reasoning.effort`, `max_output_tokens`, eventos do fluxo, `function_call` e `usage` foram escritos pelos tipos do SDK instalado, não por chamada); (2) o `output_config.effort` agora vai em **toda** chamada da Anthropic (rápido e padrão incluídos, antes só no analítico): se o `claude-haiku-5-5` ou o `claude-sonnet-5-5` recusar o parâmetro, as chamadas desses níveis falham logo depois da migration; (3) o **Gemini** não tem o parâmetro de esforço (aproximação: `ALTO` libera o pensamento padrão, `BAIXO`/`MEDIO` mantêm o mínimo; o analítico do Gemini passa de pensamento padrão a mínimo quando o esforço dele é `MEDIO`); (4) o Gemini recebendo chamada de ferramenta vinda de outro provedor (HTTP 400 esperado, mensagem clara já tratada); (5) a folga do teto de tokens por esforço (1024/2048/4096) para modelos de raciocínio.
- **Também sem chamada real (spec 309):** a listagem de modelos dos três SDKs (paginação e campos) e os filtros por `id` da OpenAI e do Google, que são heurísticos (nenhum dos dois informa a capacidade do modelo); um modelo de texto recém-lançado pode ficar de fora da lista e a tela mantém "Outro modelo…" por isso.
- **Contorno:** antes de ativar o híbrido em produção, fazer um smoke test por provedor (texto, streaming e ferramenta no Sol Medium; Opus Medium e High; Haiku e Sonnet com esforço explícito) e, se a Anthropic recusar o esforço em algum modelo, trocar o esforço do item ou pedir que o adaptador só o envie aos modelos que o admitem.
- **Correção:** o smoke test real (sem registrar prompts sensíveis nem chaves) e o ajuste do que ele mostrar.
- **Desde:** 2026-11-05, spec 261.

### P-073 — Windows Defender barra o executável do Project Desktop como ameaça · `CONTORNADO` · desktop

- **Sintoma:** baixar o `Project-Desktop-1.1.2.exe` pelo menu do perfil terminava em "Não foi possível baixar - Erro de download"; o Defender também bloqueou a leitura do arquivo em `desktop/release/`. Detecção `Program:Win32/Contebrew.A!ml` (ThreatID 251873), em 2026-11-03.
- **Causa:** heurística de aprendizado de máquina do Defender (`!ml`) sobre um executável Electron portátil **sem assinatura**; não é assinatura de vírus. Atinge um binário específico: 1.0.1, 1.1.0 e 1.1.1 passaram, e o mesmo 1.1.2 empacotado de novo (bytes diferentes) passou no `MpCmdRun -Scan`. O servidor entrega o arquivo inteiro e certo (tamanho conferido).
- **Contorno:** empacotar de novo e escanear o arquivo (`MpCmdRun.exe -Scan -ScanType 3 -File <exe> -DisableRemediation`) antes de publicar; se ainda for barrado, enviar o arquivo como falso positivo à Microsoft (envio do autor, pelo portal de envio de arquivos do Microsoft Security Intelligence).
- **Correção:** assinar o executável (I-049); assinado, a reputação do editor reduz esse tipo de detecção.
- **Desde:** 2026-11-03, versão 1.1.2.

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

### P-043 — Chat IA: pergunta sem resposta (falha ou timeout) mas com custo registrado · `ABERTO` · chat IA/backend

- **Sintoma:** o autor fez uma pergunta no chat da IA e não veio nenhuma resposta, mas o gasto da chamada apareceu nos custos. Há falhas na resposta da IA e timeouts.
- **Causa:** não investigada (a hipótese a verificar é a chamada gastar tokens e a resposta se perder, por timeout ou erro no streaming, sem chegar ao chat).
- **Contorno:** repetir a pergunta (e arcar com o custo de novo).
- **Correção:** a investigar: achar onde a resposta se perde (timeout do provedor, do streaming ou do front), avisar o usuário quando falhar em vez de silêncio, e decidir como contabilizar o custo de uma chamada que não entregou resposta.
- **Desde:** 2026-10-27 (apontado pelo autor; pergunta e conversa não anexadas).

### P-049 — Campo `codigo` do modelo do projeto na base não tem uso · `ABERTO` · banco/schema

- **Sintoma:** o modelo do projeto guarda um campo `codigo` que, segundo o autor, é quase inútil.
- **Causa:** não investigada quanto a consumidores; o campo existe no schema e no modelo.
- **Contorno:** nenhum; o campo fica sem efeito.
- **Correção:** remover a coluna por migration nova (sem editar a já aplicada), ajustando DTOs, repository e `docs/SCHEMA.md`. Rodar `gerenciamento-de-impacto` antes.
- **Desde:** 2026-10-29 (apontado pelo autor).

### P-059 — Teste de `modelagem.page.spec` instável na suíte inteira · `ABERTO` · frontend/testes

- **Sintoma:** `escolher uma relação no painel passa para a outra tabela` falha às vezes em `npm run test --workspace=frontend` (por tempo esgotado com o limite antigo de 5 s; três vezes com o limite de 20 s, o que indica trava e não só lentidão; o teste espera `whenStable` depois de clicar na relação do painel, e o diagrama parece manter algo pendente sob carga) e passa sozinho (22 testes) e na rodada seguinte, sem mudança de código.
- **Causa:** não investigada; parece carga da suíte inteira, como o antigo P-034. O `demanda-grafo.component.spec` (também SVG) travou do mesmo jeito em duas rodadas seguidas em 2026-10-30 e passou sozinho: o padrão é de teste que espera estabilizar um diagrama SVG. Ajudou a limpar processos `node --watch` do backend que sobraram da verificação ao vivo antes de rodar a suíte.
- **Contorno:** o `atualizar()` de `montarComponente` agora espera a estabilidade da zona no máximo 8 s e segue (a trava vira só uma espera, e as afirmações do teste continuam conferindo o estado); rodar o arquivo sozinho ou repetir a suíte também resolve. Aplicado em 2026-10-30 depois de o teste falhar no CI do PR 27; **a causa da trava segue desconhecida**.
- **Correção:** achar o temporizador que não termina (suspeita: transição do d3, no diagrama da Modelagem e no grafo, que roda dentro da zona) e tirá-lo da zona ou pará-lo; só então remover o teto. Observação: com a CPU três vezes sobrecarregada o arquivo passou (3 s viraram 11 s), então não é só lentidão.
- **Desde:** 2026-10-30 (visto nos fechos dos P-035/P-038/P-041/P-055 e dos P-050/P-051/P-058; 10 rodadas completas, 4 falhas dele; depois mais 3 rodadas com falha e uma no CI do PR 27).

### P-086 — Contrato do OpenSearch: a busca ainda acha o texto antigo de uma mensagem editada · `ABERTO` · chat/armazenamento

- **Sintoma:** com `CHAT_INTEGRACAO=1`, o cenário `alterarMensagem` da suíte de contrato do OpenSearch falha em "e não o antigo": depois de editar a mensagem, a busca pelas palavras do texto antigo ainda a encontra. O mesmo cenário passa no Postgres. Aparece também no código anterior à task 246.
- **Causa:** não investigada (o texto novo é achado, então a atualização parcial grava; suspeita de `match` ou de análise do campo `texto` no OpenSearch local).
- **Contorno:** nenhum necessário no uso normal; só a suíte de contrato do OpenSearch fica com 1 falha.
- **Correção:** investigar a atualização parcial (`update` com `doc`) e o analisador; reindexar o campo se for o caso.
- **Desde:** task 313 (edição de mensagem); percebido em 2026-11-12.

### P-087 — Frontend: `ng test` falha inteiro no Node 26 (`localStorage` indefinido) · `CONTORNADO` · frontend/testes

- **Sintoma:** com Node 26 (visto em 26.13.0), quase toda a suíte do frontend falha com `Cannot read properties of undefined (reading 'getItem'|'setItem'|'clear')`, inclusive arquivos que ninguém tocou (`guards.spec`, interceptors). O mesmo arquivo passa se não usar `localStorage`.
- **Causa:** o Node 25+ define um `localStorage` global próprio (Web Storage experimental) que, sem arquivo de armazenamento, vem indefinido; o Vitest/jsdom não o sobrescreve.
- **Contorno:** rodar com `NODE_OPTIONS=--no-experimental-webstorage` (suíte inteira: 222 arquivos, 2701 testes, todos passam).
- **Correção:** fixar a opção no script de teste do frontend (ou no setup do Vitest) e/ou fixar a versão do Node do projeto; conferir a versão usada no CI.
- **Desde:** 2026-11-12 (Node 26.13.0 na máquina do autor).
