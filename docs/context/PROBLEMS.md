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

> P-079 a P-085 vêm da auditoria de requisições das telas (2026-11-11). Medição, reprodução e recomendação de cada um em
> [`DOSSIE.md`](../specs/active/auditoria-requisicoes-telas/DOSSIE.md), pelo código R-NN citado. Os achados de impacto baixo (R-06 a R-10, R-12, R-13, R-15, R-16) ficaram só no dossiê.

### P-085 — Ação em massa nas atividades faz uma requisição por item · `ABERTO` · frontend/atividade

- **Sintoma:** com N atividades selecionadas, "Mudar status", "Acrescentar tags", "Excluir" e "Desfazer" fazem N chamadas (`PUT`, `PUT .../tag`, `DELETE`, `PATCH .../restaurar`) e depois recarregam a lista. Se uma falhar, a operação fica pela metade (R-14).
- **Causa:** não há rota em lote; a tela percorre a seleção chamando a rota de um item.
- **Contorno:** nenhum.
- **Correção:** rota em lote numa transação. Envolve contrato novo, decisão do autor.
- **Desde:** 2026-11-11 (auditoria de requisições).

### P-084 — Excluir uma demanda mostra "Não encontrado" e recarrega a tela inteira · `ABERTO` · frontend/demanda

- **Sintoma:** depois de `DELETE /demanda/:id` com sucesso, a tela pede `GET /demanda/:id` da demanda excluída (404), mostra o aviso "Não encontrado: Registro não encontrado" e faz mais 11 requisições. Reproduzido três vezes (R-11). Desfazer a exclusão não recarrega nada (R-15).
- **Causa:** não investigada no código; pelo tráfego, a seleção continua apontando para a demanda excluída quando a tela recarrega.
- **Contorno:** ignorar o aviso; a exclusão foi feita.
- **Correção:** trocar a seleção antes de recarregar e não pedir a demanda excluída.
- **Desde:** 2026-11-11 (auditoria de requisições; já aparecia na captura de 2026-11-05).

### P-083 — Seletores carregam uma página só e cortam itens acima do teto · `ABERTO` · frontend/listas

- **Sintoma:** com 108 usuários ativos, o seletor de usuário do Ponto não mostra quem passa de 100, enquanto a tabela da mesma tela mostra os 108; o seletor de Execuções mostra todos (R-05). O mesmo padrão existe, sem ter sido exercitado, em `/projeto?itensPorPagina=100`, `/demanda?itensPorPagina=200`, `/atividade?demandaId&itensPorPagina=100` e `/execucao?atividadeId&itensPorPagina=200`.
- **Causa:** as telas pedem `itensPorPagina=100` (ou 200) e usam só a primeira página; Execuções usa `allRows=true`.
- **Contorno:** nenhum. Hoje não dói porque o volume real está abaixo do teto.
- **Correção:** padronizar em `allRows` (ou num endpoint de opções) onde a tela precisa da lista inteira.
- **Desde:** 2026-11-11 (auditoria de requisições).

### P-082 — Tela de Usuários pede a listagem duas vezes ao abrir · `ABERTO` · frontend/usuario

- **Sintoma:** `GET /usuario?pagina=1&itensPorPagina=10` duas vezes em toda abertura da tela (R-04).
- **Causa:** `usuario-listagem.page.ts` chama `buscarUsuarios()` no `ngOnInit` e a tabela dispara o `onLazyLoad` inicial, que busca de novo.
- **Contorno:** nenhum; só custo.
- **Correção:** deixar a carga inicial com um dos dois.
- **Desde:** 2026-11-11 (auditoria de requisições).

### P-081 — `/ia/disponibilidade` e `/checkin/situacao` são pedidas em dobro em toda carga de página · `ABERTO` · frontend/layout

- **Sintoma:** duas chamadas de cada na carga; três de `/ia/disponibilidade` no login e mais uma ao entrar no Chat (R-03).
- **Causa:** `sidebar.component.ts` e `checkin-janelinha.component.ts` pedem a disponibilidade cada um por si; `checkin-janelinha` e `checkin-proximo` pedem a situação cada um por si.
- **Contorno:** nenhum; só custo.
- **Correção:** uma consulta compartilhada no serviço, com os componentes lendo o sinal.
- **Desde:** 2026-11-11 (auditoria de requisições).

### P-080 — Tela de Demandas: 13 requisições para abrir e 8 por demanda selecionada · `ABERTO` · frontend/demanda

- **Sintoma:** abrir `/demanda` faz 13 chamadas e cada clique numa demanda faz 8, refeitas ao voltar a uma já vista; voltar ao modo Árvore ou trocar de projeto recarrega `/tag` e a lista de usuários; abrir a edição busca de novo o que já está na tela (R-02).
- **Causa:** o detalhe é montado por rotas separadas (demanda, ancestrais, árvore, tags, membros, conexões, plano, atividades) e nada é reaproveitado entre seleções.
- **Contorno:** nenhum; só custo, que cresce com a lista de usuários (16 KB com 100).
- **Correção:** um detalhe agregado e catálogos mantidos em memória enquanto a tela está aberta. Detalhe agregado é contrato novo, decisão do autor.
- **Desde:** 2026-11-11 (auditoria de requisições).

### P-079 — Situação do check-in consultada a cada 20 s em toda aba, com ou sem execução · `ABERTO` · frontend/checkin

- **Sintoma:** `GET /checkin/situacao` a cada 20 s para todo usuário logado, mesmo sem execução ativa e com a IA desligada (cerca de 180 por hora por aba); na janela `/checkin` o intervalo é de 3 s (R-01).
- **Causa:** intervalo fixo em `checkin-janelinha.component.ts` (`INTERVALO_DA_CONFERENCIA_MS`) e em `checkin.page.ts` (`INTERVALO_DA_SITUACAO_MS`), sem condição.
- **Contorno:** nenhum; só custo.
- **Correção:** agendar a próxima consulta pelo `proximoCheckinData` da resposta e pelo início/fim de execução; não consultar sem execução ativa.
- **Desde:** 2026-11-11 (auditoria de requisições).

### P-078 — Textos de demanda fora de Markdown em algumas telas · `ABERTO` · frontend/demanda

- **Sintoma:** relato do autor (2026-11-11): em alguns lugares que exibem o texto da demanda, por exemplo na tela de Atividades, o Markdown não aparece formatado. A suspeita é das descrições de cliente e da documentação.
- **Causa:** não investigada. Texto rico deveria passar sempre por `app-markdown-visualizador` (`docs/CONVENTIONS.md`).
- **Contorno:** nenhum.
- **Correção:** percorrer todo lugar que exibe descrição técnica, descrição do cliente e documentação, conferir a renderização ao vivo e ajustar.
- **Desde:** 2026-11-11 (relato do autor).

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

