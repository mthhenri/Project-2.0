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

### P-074 — Excluir um registro também grava `updated_date`, mas excluir não é alterar · `ABERTO` · banco/backend

- **Sintoma:** o soft delete (`BaseRepository.executarSoftDelete`) faz `SET is_deleted = true, deleted_date = NOW(), updated_date = NOW()`. Um registro excluído passa a parecer editado no instante da exclusão. Os 43 triggers `trg_<tabela>_updated_date` (legado, saem pela spec 277) fazem o mesmo em qualquer `UPDATE`.
- **Regra do autor (2026-11-05):** cada data tem um só motivo. `created_date` só na criação, `updated_date` só quando o objeto é alterado, `deleted_date` só na exclusão. **Deletar não é alterar:** a exclusão grava `is_deleted` e `deleted_date` e não toca `updated_date`.
- **Causa:** a regra escrita ("todo `UPDATE` grava `updated_date = NOW()`", `CLAUDE.md`/`AGENTS.md`, `SYSTEM.SPEC.md` §9.2 #14, `CONVENTIONS.md`, `SCHEMA.md`, skill `sql-migrations`) não separa a exclusão, e o `executarSoftDelete` a segue.
- **Correção:** tirar `updated_date = NOW()` do `executarSoftDelete` e de todo `UPDATE` de exclusão escrito à mão (o levantamento é o da spec 276), escrever a exceção nas regras e nos espelhos (`CLAUDE.md` e `AGENTS.md` idênticos, skills `.claude`/`.agents`), e ajustar os testes que esperam `updated_date` mudando na exclusão. Fazer junto com a 276/277, para não tocar o mesmo SQL duas vezes. Rodar `gerenciamento-de-impacto` antes.
- **Desde:** 2026-11-05 (decisão do autor, ao revisar a migration da spec 261).

