# 261-ia-roteamento-hibrido-por-nivel-e-esforco.spec.md

> Origem: decisão do autor em 2026-10-28, após comparar qualidade, latência, tokens e custo do Project 2.0. **Remodelada com o autor em 2026-11-04** (a escolha de modelagem é do autor; ver "Decisões do autor"): em vez de um provedor principal por nível sobre uma cadeia global, **cada nível tem a sua própria cadeia** de provedor, modelo e esforço. Task de configuração e compatibilidade entre provedores; **não troca modelos silenciosamente em produção**. Depende das tasks [129](../done/129-ia-configuracao-modelo-e-api.spec.md), [130](../done/130-ia-interface-de-provedor-e-niveis-de-modelo.spec.md), [202](../done/202-custos-pelas-mensagens-do-chat.spec.md), [203](../done/203-ia-provedores-e-fallback.spec.md) e [204](../done/204-configuracao-ia-redesenho-da-tela.spec.md). A lista de modelos vinda dos provedores é a spec [309](309-ia-listar-modelos-dos-provedores.spec.md), à parte.

## Objetivo

Permitir que **cada nível da IA (`RAPIDO`, `PADRAO`, `ANALITICO`) tenha a sua própria cadeia ordenada de itens `{provedor, modelo, esforço}`**, dentro da mesma configuração versionada. O primeiro item é o principal do nível e os seguintes são a contingência, de tamanho livre (no mínimo 1). O provedor global, os fallbacks globais, o mapa de modelos por provedor e o esforço só do Analítico deixam de existir: tudo passa a morar nos itens das cadeias. Habilitar, como configuração desejada do Project 2.0:

| Nível | Item principal | Modelo da API | Esforço |
|---|---|---|---|
| `RAPIDO` | Anthropic | `claude-haiku-5-5` | `MEDIO` |
| `PADRAO` | OpenAI | `gpt-6.1-sol` | `MEDIO` |
| `ANALITICO` | Anthropic | `claude-opus-5-5` | `MEDIO` (inicial); `ALTO` selecionável pelo administrador |

Os fallbacks de cada nível são escolhidos pelo administrador (por exemplo, o Rápido na OpenAI com esforço `ALTO` e, na falha, a Anthropic com `MEDIO`; o Analítico pode ter só um item). Os identificadores devem ser confirmados numa chamada real e na documentação do provedor antes da ativação. A configuração permanece editável: **não fixar esses modelos nem provedores no código**. O Opus High usa o mesmo modelo e tarifa por token, alterando apenas o esforço.

## Situação atual e premissas

- `configuracao_ia` guarda o provedor padrão em `tipo_provedor_ia_id` (FK), os `fallbacks` (JSONB, até 2, em ordem), `modelos_provedor` (JSONB: provedor → três modelos, de todo provedor já configurado, na cadeia ou não) e `esforco_analitico`; a configuração é versionada e a versão antiga nunca é alterada pela aplicação (`docs/SCHEMA.md`, migrations `0033` e `0049`). `ConfiguracaoIaResumoDto` e `ConfiguracaoIaCriarDto` espelham esses campos.
- `IaService.montarCadeia()` percorre a mesma cadeia para qualquer nível e `modeloDoNivel()` escolhe o modelo correspondente dentro do provedor corrente. Isso impede o híbrido.
- `IaService.montarSolicitacaoDoProvedor()` só fornece esforço explícito para `ANALITICO`; `RAPIDO` e `PADRAO` dependem do default de cada SDK.
- O estado da IA (`EstadoIaEnum`) é calculado em `obterEstado()`: `DESLIGADA` pelo administrador; `FORA_DO_AR` sem chave em nenhum provedor da cadeia ou, com a detecção automática ligada, depois de a cadeia inteira falhar (`ultimoResultado`, **um só, global**, em memória); caso contrário `NO_AR`.
- O histórico do chat é guardado em formato **neutro** (`IaBloco`: `texto`, `uso_ferramenta`, `resultado_ferramenta`) e cada adaptador o traduz; a única parte específica de provedor é a `assinatura` opaca do Gemini (`thoughtSignature`). Cada rodada de ferramenta recomeça a cadeia pelo primeiro item.
- A mensagem da IA grava `nivel` e `modelo`, que vêm do `TurnoIa` (o maior nível usado no turno e o modelo da última chamada desse nível); não grava se houve fallback.
- O adaptador OpenAI usa Chat Completions e reconhece parâmetros de raciocínio por uma expressão que contempla série `o` e `gpt-5`, mas não `gpt-6`; é preciso verificar suporte real do Sol a streaming, ferramentas e esforço.
- A aba Custos já calcula por modelo realmente registrado na mensagem (`precos_modelo` é indexado pelo nome do modelo), mas alguns indicadores de modelos em uso partem dos três níveis do provedor global.
- As propostas têm validação, confirmação e autonomia próprias; o roteamento **não pode enfraquecer** essas garantias.

## Decisões do autor (2026-11-04)

Registro das escolhas que remodelaram a spec. Qualquer mudança nelas volta ao autor.

1. **Modelagem A:** três colunas JSONB na própria linha da versão, `cadeia_rapido`, `cadeia_padrao` e `cadeia_analitico`, cada uma uma lista de itens. (Foram avaliadas também uma coluna única `cadeias_nivel` e uma tabela filha; a escolhida segue o que `fallbacks`, `niveis_proposta` e `precos_modelo` já fazem.)
2. **Item da cadeia:** `{ provedor, modelo, esforco }`. O esforço é de cada item, não do nível.
3. **Tamanho:** quantos itens o administrador quiser, **no mínimo 1**; fallback não é obrigatório.
4. **Provedor não repete** na mesma cadeia (regra de hoje, agora por nível).
5. **Chave ausente:** a configuração **salva mesmo assim**; na tela, o item mostra o aviso **"Chave de Provedor não configurada"**. Em execução, o item sem chave é pulado.
6. **Modelos de provedor fora das cadeias:** o mapa `modelos_provedor` deixa de existir e o modelo digitado de um provedor que sai das cadeias se perde (as versões antigas continuam no histórico). A lista de modelos do provedor, para não precisar digitar, é a spec 309.
7. **Estado `FORA_DO_AR`:** só quando **nenhum item de nenhuma cadeia** tem chave, ou quando todos os níveis falharam na última chamada (detecção automática). Um nível sem provedor utilizável **não derruba o sistema**: só as funcionalidades daquele nível falham. O "último resultado" passa a ser **por nível**, em memória.
8. **Troca de provedor entre rodadas de ferramenta:** o fallback **continua o turno** com o histórico neutro, sem refazer o turno e sem repetir efeitos de ferramenta, descartando a `assinatura` quando o provedor muda. Se o Gemini recusar uma chamada de ferramenta vinda de outro provedor, só **esse turno** falha, com mensagem clara.
9. **Alerta "Fallback utilizado":** a mensagem da IA ganha o campo `modelo_planejado` (o modelo do primeiro item da cadeia do nível na chamada). O alerta aparece quando ele difere de `modelo`.

## Decisões funcionais

1. **Cadeia por nível.** A configuração tem `cadeiaRapido`, `cadeiaPadrao` e `cadeiaAnalitico`, cada uma uma lista ordenada de itens `{ provedor: TipoProvedorIaEnum, modelo: string, esforco: EsforcoIaEnum }`. Para uma chamada de nível N, a service percorre a cadeia de N na ordem, pulando o item sem chave. Cada tentativa usa **o modelo e o esforço do próprio item**.
2. **Validação (regra pura em `shared`, a mesma na service e na tela).** Cada cadeia: no mínimo 1 item; nenhum provedor repetido; `provedor` é um `TipoProvedorIaEnum`; `modelo` é texto não vazio de até 100 caracteres e pertence ao provedor do item (a regra de prefixo `modeloPertenceAoProvedor` continua); `esforco` é um `EsforcoIaEnum` válido. Como não há repetição de provedor, cada cadeia tem no máximo um item por provedor (hoje, 3). Item cujo provedor não tem chave **não** invalida a configuração.
3. **Compatibilidade.** Cada versão histórica é **convertida pela migration** em três cadeias iguais, copiando a que ela já tinha (provedor padrão, depois os fallbacks, na ordem, cada um com o modelo daquele nível). O esforço dos itens do Analítico é o `esforco_analitico` da versão; Rápido e Padrão recebem `MEDIO` explícito. O comportamento de uma versão antiga é o de hoje, **exceto** que o esforço de Rápido e Padrão deixa de ser o default do SDK e passa a ser `MEDIO`. A migration não ativa o híbrido nem altera preços (`precos_modelo`) ou qualquer outra coluna. Modelos de provedores fora da cadeia da versão não têm onde morar e se perdem.
4. **Sem mudança na segurança do streaming.** Fallback só pode começar antes de emitir conteúdo ao usuário; após o primeiro trecho, preservar o erro sem repetir resposta. Provedor sem chave é pulado.
5. **Esforço por item.** Aplicar o esforço do item de forma explícita quando o modelo/provedor admitir esse parâmetro, em vez de depender do default do fornecedor (`MEDIO` na configuração desejada de Rápido e Padrão). Preservar a semântica de `BAIXO`, quando escolhida. Parâmetros não suportados exigem adaptação documentada, sem falha silenciosa nem envio de argumento inválido.
6. **Alta capacidade sob controle.** Nesta task, a troca `MEDIO` ↔ `ALTO` é administrativa e versionada, editando o esforço do item. Um botão para o usuário escalar somente uma mensagem, escalonamento automático por confiança/erro ou retentativa deliberada em High exigem decisão e spec próprias.
7. **Estado da IA.** `DESLIGADA` continua sendo o desligamento manual. `FORA_DO_AR` quando nenhum item de nenhuma cadeia tem chave. Com a detecção automática ligada, o "último resultado" é guardado **por nível** (em memória; cada nível nasce `NO_AR`), uma chamada que esgota a cadeia do seu nível marca **aquele nível** como fora do ar, a primeira chamada bem-sucedida do nível o recupera, e o sistema só fica `FORA_DO_AR` quando **todos** os níveis estão assim. Uma chamada de um nível sem item utilizável falha com `IaException` `INDISPONIVEL` e mensagem que cita o nível.
8. **Troca de provedor dentro do turno.** Uma rodada que falha depois de o turno já ter feito chamadas de ferramenta segue para o próximo item da cadeia **com o mesmo histórico neutro** (sem recomeçar o turno). Ao mudar de provedor, a `assinatura` opaca é descartada. Não pode haver perda silenciosa de dados nem aplicação incorreta ou repetida de propostas. O ponto de risco conhecido é o Gemini receber uma chamada de ferramenta que não é dele: se ele recusar, o turno falha com mensagem clara; documentar o limite e confirmar com chave real.
9. **Fallback visível.** A mensagem da IA grava `modelo_planejado` junto com `modelo`, **ambos referentes à mesma chamada** (a que `TurnoIa` já escolhe para `modelo`: a última do maior nível). `modelo_planejado` é o modelo do primeiro item da cadeia do nível naquela chamada; vale também quando o primeiro item foi pulado por falta de chave. Mensagem antiga fica com o campo nulo e não mostra alerta. A resposta nunca é atribuída ao provedor que falhou.
10. **Sem efeitos colaterais de comportamento.** Check-ins, chat, planejamento, propostas, prompt de teste, relatórios e assistência de descrição devem continuar selecionando o mesmo `NivelIaEnum` de antes; apenas a resolução nível → provedor/modelo/esforço é alterada. Permissões, autonomia e necessidade de aprovação das propostas permanecem inalteradas.

## Entregáveis

### 1. Contrato, persistência e migration

- **Antes → depois de `configuracao_ia`:** saem `tipo_provedor_ia_id` (e a FK), `modelos_provedor`, `fallbacks` e `esforco_analitico`; entram `cadeia_rapido`, `cadeia_padrao` e `cadeia_analitico`, `JSONB NOT NULL`, sem `DEFAULT`, cada uma com `CHECK (jsonb_typeof(...) = 'array' AND jsonb_array_length(...) >= 1)`. Cada item guarda `provedor`, `modelo` e `esforco`. O provedor é o código do `TipoProvedorIaEnum`, validado pela service e pelo `shared` (como `fallbacks` hoje), sem FK. Atualizar `docs/SCHEMA.md`.
- Migration reversível (próximo número livre ao implementar), no estilo da `0049`: adicionar as três colunas anuláveis, preencher a partir das colunas antigas conforme a decisão funcional 3, só então `SET NOT NULL` e os `CHECK`, e por fim derrubar as quatro colunas antigas. Pelas regras que a `master` trouxe em 2026-11-04 (o banco não carrega lógica; `is_deleted = true` é morto): a migration **não cria trigger nem função**; o `UPDATE` de preenchimento grava `updated_date = NOW()` nas linhas vivas, porque converter é alterar; e, como o `SET NOT NULL` exige cadeia em **toda** linha, o preenchimento converte também as linhas com `is_deleted = true` (exceção ao filtro de exclusão, só neste `UPDATE` de migration, declarada no comentário dela: uma linha sem cadeia faria o `NOT NULL` falhar), **sem tocar o `updated_date` delas**, porque o excluído é morto e excluir não é alterar (regra do autor, P-074). Os `CHECK` (tipo `array` e lista não vazia) seguem o prefixo `chk_` e o precedente da `0049`; provedor, modelo e esforço dentro dos itens seguem o precedente de `fallbacks` e `esforco_analitico` (texto validado pela service e pelo `shared`, sem tabela de referência, como a `docs/SCHEMA.md` já documenta). O `DOWN` perde informação e deve ser **documentado e testado**: devolve o provedor padrão e os fallbacks a partir da cadeia do Padrão, os modelos de cada provedor a partir dos itens das três cadeias (com regra explícita para o provedor ausente de alguma cadeia) e o esforço do Analítico a partir do primeiro item da sua cadeia; as diferenças entre as cadeias dos níveis se perdem. Antes de qualquer rollback em produção, apresentar ao autor o que seria perdido.
- A tabela `tipo_provedor_ia` e o seu seed **permanecem** (passam a não ser lidos pela configuração); removê-la fica fora de escopo e é registrado em `docs/context/` como pendência.
- DTOs em `shared/src/dtos/configuracao-ia/`: um DTO do item da cadeia e os campos `cadeiaRapido`, `cadeiaPadrao` e `cadeiaAnalitico` em `ConfiguracaoIaCriarDto` e `ConfiguracaoIaResumoDto`, saindo `provedor`, `fallbacks`, `modelosProvedor` e `esforcoAnalitico` (nomes finais pela skill `project20-dto-conventions`). Reescrever `shared/src/utils/provedor-ia.ts` conforme a decisão funcional 2.
- Atualizar o repository e a criação de versões: a nova versão copia as três cadeias e `precos_modelo`; preservar histórico, retorno das versões antigas e a atualização do cache da configuração ativa. Rodar `npm run impacto` nos arquivos compartilhados alterados: os consumidores atuais de `provedor`, `fallbacks` e `modelosProvedor` incluem o `IaService`, o repository e a service de configuração, `ia-custo.service`, a página de Configurações da IA, `configuracao-ia.util.ts` e o histórico de versões.

### 2. Resolução, estado e turno em `IaService`

- Resolver a cadeia pelo nível da requisição, usar modelo e esforço do item e pular item sem chave.
- Estado por nível conforme a decisão funcional 7 (`obterEstado()`, `ultimoResultado` por nível, `recuperarEstadoCompleto()` com `provedoresComChave` inalterado).
- Preservar captura do modelo real, nível solicitado, entrada, saída, cache, motivo de parada e blocos de ferramentas; não atribuir ao provedor original uma resposta proveniente do fallback. O `TurnoIa` passa a registrar também o modelo planejado da chamada.
- Troca de provedor dentro do turno conforme a decisão funcional 8, reaproveitando o formato neutro `IaBloco` e as regras existentes de cada adaptador; documentar os limites dos provedores.

### 3. Compatibilidade OpenAI — GPT-6.1 Sol

- Atualizar `backend/src/modules/ia/provedores/openai.provedor.ts` e `backend/src/modules/ia/ia.module.ts` para suportar o modelo escolhido com a **Responses API**, quando exigida pelo modelo, sem quebrar compatibilidade com outros modelos OpenAI configuráveis.
- Adaptar geração normal, streaming incremental, `function_call`, resposta das ferramentas, associação de IDs, JSON de argumentos, mensagens de sistema, motivos de parada e `usage` (inclusive tokens de entrada em cache e tokens de raciocínio contabilizados na saída), sem perder o contrato `IaProvedor`.
- Aplicar `reasoning.effort` do item (`medium` no Sol do Padrão); confirmar o nome e o suporte do parâmetro contra a documentação oficial e, se houver chave, por smoke test real.
- Tratar explicitamente erro de modelo/endpoint/parâmetro, limite de tokens e resposta sem texto mas com ferramentas. Não montar argumentos de `Chat Completions` e enviá-los diretamente à `Responses API`.

### 4. Chat: modelo planejado e alerta "Fallback utilizado"

- **Antes → depois da mensagem da IA:** além de `nivel`, `modelo` e tokens, passa a guardar `modelo_planejado` (texto, anulável, mesmo tipo e tamanho de `modelo`; nulo nas mensagens antigas e nas que não são da IA).
- Persistência nos armazenamentos do chat: coluna `chat_mensagem.modelo_planejado` (migration própria, reversível, anulável e sem `DEFAULT`), campo `modelo_planejado` (`keyword`) no mapeamento do índice (`chat-consultas.ts`, Elasticsearch e OpenSearch) e no documento (`chat-mensagem.documento.ts`), com os testes de contrato de `ArmazenamentoDeChat` cobrindo os três. `ChatMensagemResumoDto` ganha `modeloPlanejado: string | null`.
- O evento de fim do streaming que hoje informa o nível e o modelo da resposta passa a levar também o modelo planejado, para o alerta aparecer ao vivo e sobreviver ao recarregar.
- Frontend: na mensagem da IA, um alerta discreto no canto com tooltip **"Respondeu `<modelo>` no lugar de `<modelo planejado>`"** (rótulo curto "Fallback utilizado"), exibido só quando os dois campos existem e diferem. Reaproveitar o selo de nível e a linha de metadados que a mensagem já tem; sem ruído visual quando não há fallback.

### 5. Configurações da IA — frontend

- Na aba **Provedor e modelos**, mostrar **uma cadeia por nível** (Rápido, Padrão, Analítico), cada uma uma lista ordenada de itens editável: adicionar, remover e reordenar; escolher o provedor (provedor já presente na cadeia fica desabilitado), o modelo e o esforço. O primeiro item é identificado como principal e os demais como contingência. A cadeia não pode ficar vazia (a remoção do último item é impedida) e a validação da decisão funcional 2 é mostrada no campo.
- O campo de modelo continua **texto livre** com as sugestões fixas atuais (`SUGESTOES_MODELOS`); a lista vinda dos provedores é a spec 309.
- Item cujo provedor não está em `provedoresComChave` mostra o aviso **"Chave de Provedor não configurada"**; o aviso **não impede salvar**. Mostrar também quando um nível não tem nenhum item utilizável.
- Exibir com clareza o trio configurado (item principal de cada nível com modelo e esforço). A seleção de esforço é a do item; o `Salvar nova versão`, o aviso de alterações pendentes e a validação existentes são preservados. Mostrar no histórico as três cadeias de cada versão; versões antigas mostram as três cadeias convertidas.
- Não expor chaves de API. Preservar mensagens de erro, responsividade e temas claro e escuro. Aplicar o processo visual do `CLAUDE.md` (análogo aprovado, todos os formatos de desktop).

### 6. Custos e observabilidade

- A aba **Custos** deve indicar quais modelos estão configurados **por nível** (o item principal e a contingência de cada cadeia), incluindo níveis pertencentes a provedores diferentes. O total financeiro continua baseado no modelo e nos tokens de fato retornados e armazenados; fallback não pode ser contabilizado duas vezes.
- Permitir precificar separadamente os modelos (entrada, saída, cache) mantendo os preços editáveis. Usar os preços oficiais apenas como referências datadas, nunca como tarifas fixadas no código.
- Manter a limitação atual: o custo por mensagem é estimado quando o turno envolve múltiplos modelos ou trabalhos fora do chat. Não prometer medição exata por operação sem um mecanismo de uso por chamada (fora do escopo).
- Na verificação, comparar ao menos 1 fluxo de cada nível, 1 fluxo com ferramenta e 1 fallback: registrar modelo efetivo, tokens de entrada, saída e cache, latência até o primeiro trecho quando houver streaming, duração total e resultado funcional. Nunca registrar prompts sensíveis ou chaves em logs versionados.

## Critérios de aceite

- [ ] Toda versão histórica é convertida em três cadeias iguais à cadeia que tinha (provedor padrão, depois fallbacks, com o modelo de cada nível) e continua escolhendo os mesmos provedores e modelos nos três níveis; Rápido e Padrão passam a ter `MEDIO` explícito e o Analítico mantém o seu esforço; `precos_modelo` e as demais colunas não mudam. O `DOWN` está documentado e testado, com a perda descrita.
- [ ] A migration deixa as três colunas `NOT NULL` com `CHECK` de lista com ao menos 1 item e as quatro colunas antigas removidas, sem `DEFAULT`; `docs/SCHEMA.md` reflete o novo desenho.
- [ ] Nova configuração seleciona exatamente `RAPIDO → Anthropic/Haiku 5.5/MEDIO`, `PADRAO → OpenAI/GPT-6.1 Sol/MEDIO` e `ANALITICO → Anthropic/Opus 5.5/MEDIO`, desde que as chaves e os modelos estejam disponíveis, e cada nível pode ter fallback de tamanho próprio (inclusive nenhum).
- [ ] A regra de validação recusa cadeia vazia, provedor repetido, modelo vazio, longo ou de outro provedor e esforço inválido, na service e na tela com a mesma mensagem. Salvar com provedor sem chave é aceito.
- [ ] Alterar só o esforço do item do Analítico para `ALTO` cria nova versão; as chamadas seguintes usam Opus High; Rápido e Padrão permanecem Medium e seus itens não mudam.
- [ ] Fallback de cada nível usa o modelo e o esforço **do item seguinte da cadeia daquele nível**. Chave ausente e falha anterior ao streaming são cobertas; falha após emissão não duplica texto.
- [ ] Estado: com nenhum item utilizável em nenhuma cadeia a IA fica `FORA_DO_AR`; com um só nível sem item utilizável a IA continua `NO_AR`, as funcionalidades dos outros níveis funcionam e o nível sem item falha com mensagem que o cita; com a detecção automática, o "último resultado" é por nível e o sistema só fica `FORA_DO_AR` quando todos os níveis falharam na última chamada.
- [ ] Uma rodada de ferramenta que falha num provedor continua o turno no próximo item, sem repetir ferramenta nem proposta e sem a `assinatura` do provedor anterior; o caso recusado pelo Gemini falha só o turno, com mensagem clara. Cobertos por teste com clientes falsos e, havendo chave, por smoke test.
- [ ] A mensagem da IA grava `modelo_planejado` nos três armazenamentos do chat, no `ChatMensagemResumoDto` e no evento de fim do streaming; o alerta "Fallback utilizado" aparece quando difere de `modelo` (inclusive item principal pulado por falta de chave), não aparece em mensagem antiga nem quando coincidem, e o tooltip cita os dois modelos.
- [ ] Chat simples, check-in, planejamento e proposta com ferramenta continuam concluindo com seus mecanismos de permissão, confirmação e autonomia; parâmetros e resultados das ferramentas sobrevivem à integração OpenAI.
- [ ] `IaService` e adaptadores Anthropic/OpenAI têm testes com clientes falsos para resolução do nível, esforço por item, estado por nível, streaming, resposta com ferramentas, troca de provedor no turno, cache, raciocínio, limites e erros; a configuração tem testes unitários e de integração, inclusive conversão do legado e histórico.
- [ ] Custos exibem os modelos ativos por nível, de provedores distintos, e calculam pelo **modelo realmente utilizado**, sem dupla contagem; fallback aparece com seu modelo real.
- [ ] Rodar testes de `shared`, `backend` e `frontend`, `npm run test:integracao`, builds, `npm run lint:tudo` e `npm run repo:verificar`; documentar resultados e eventuais limitações (a falha preexistente de lint, P-001, relatada à parte).
- [ ] Verificar a tela ao vivo em todos os formatos de desktop do `CLAUDE.md`, temas claro e escuro, incluindo aviso de chave ausente, cadeia com um item, cadeia com vários, versão convertida, nova versão, histórico, e o alerta de fallback no chat.
- [ ] Realizar smoke test com API real (sem publicar tokens/chaves) para Sol Medium em texto, streaming e ferramenta, e para Opus Medium/High; **se não houver credenciais, registrar explicitamente a verificação pendente e não afirmar compatibilidade real**.
- [ ] Atualizar `docs/SYSTEM.SPEC.md`, `docs/SCHEMA.md`, `docs/context/CONTEXT.md` e `HISTORY.md`; ajustar `README.md` e `MEMORY.md` quando necessário.

## Fora de escopo

- Lista de modelos vinda da API dos provedores (select no lugar do texto livre): spec [309](309-ia-listar-modelos-dos-provedores.spec.md).
- Remover a tabela `tipo_provedor_ia` e o seu seed.
- Escolher modelos automaticamente por preço, confiança, complexidade, heurística ou benchmark; escalonar automaticamente Medium → High.
- Botão de esforço por mensagem para usuários finais ou execução de duas IAs em paralelo para escolher a melhor resposta.
- Trocar as regras de autonomia, aprovação, proposta ou o nível de modelo pedido pelos consumidores existentes.
- Construir uma nova tabela de uso por chamada, corrigir toda a medição histórica ou recalcular custos retroativamente.
- Implantar cache de prompts novo, resumir automaticamente conversas ou modificar as estratégias de contexto; podem ser evoluções futuras.

## Riscos e mitigação

- **Modelos com APIs distintas:** testar tool calling em múltiplos turnos e streaming; isolar diferenças no adaptador, mantendo `IaProvedor` neutro.
- **Nível sem chave:** mostrar a ausência antes de salvar (sem impedir), manter o fallback e falhar explicitamente só o nível sem item utilizável.
- **Migration destrutiva:** a conversão das versões antigas e o `DOWN` com perda são testados com versões reais (cadeias de 1, 2 e 3 provedores, modelos de provedor fora da cadeia); migration aplicada nunca é editada.
- **Troca de provedor no meio do turno:** a `assinatura` do Gemini é o ponto frágil; cobrir com teste e smoke test e falhar só o turno quando recusado.
- **Estado por nível em memória:** reinício do backend zera os níveis para `NO_AR`, como já acontece hoje com o resultado global.
- **Custo e desempenho:** não inferir economia garantida a partir dos benchmarks. Comparar tarefas reais equivalentes; Sol tem tarifas por token semelhantes às do Sonnet, mas seus tokens de saída e número de chamadas podem variar conforme o contexto.
- **Regressão de propostas:** validar esquema de argumentos, identidade de chamadas, resultado de ferramenta e exigência de confirmação antes de permitir uso em produção.

## Referências técnicas

- `backend/src/modules/ia/services/ia.service.ts`; `backend/src/modules/ia/domain/{ia.tipos,turno-ia}.ts`
- `backend/src/modules/ia/provedores/{anthropic,openai,google}.provedor.ts` e `backend/src/modules/ia/ia.module.ts`
- `backend/src/modules/configuracao-ia/`; `shared/src/dtos/configuracao-ia/`; `shared/src/utils/provedor-ia.ts`
- `backend/src/modules/chat/` (`chat.service.ts`, `domain/chat-mensagem.documento.ts`, `domain/chat-consultas.ts`, repositórios) e `shared/src/dtos/chat/ChatMensagemResumoDto.ts`
- `frontend/src/app/modules/configuracao-ia/components/provedor-aba/`
- `backend/src/modules/ia-custo/` e spec 202; migrations `0033`, `0049`, `0055`
- OpenAI: https://platform.openai.com/docs/guides/function-calling ; https://platform.openai.com/pricing
- Anthropic: https://docs.anthropic.com/en/docs/about-claude/models/overview

**Ordem sugerida de execução:** contrato + migration → roteamento, estado por nível e turno + testes → `modelo_planejado` nos armazenamentos do chat → adaptador Responses API + testes → frontend (configuração e alerta) → custos → integração, smoke tests e documentação.
