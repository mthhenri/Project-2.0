# 261-ia-roteamento-hibrido-por-nivel-e-esforco.spec.md

> Origem: decisão do autor em 2026-10-28, após comparar qualidade, latência, tokens e custo do Project 2.0. Task de configuração e compatibilidade entre provedores; **não troca modelos silenciosamente em produção**. Depende das tasks [129](../done/129-ia-configuracao-modelo-e-api.spec.md), [130](../done/130-ia-interface-de-provedor-e-niveis-de-modelo.spec.md), [202](../done/202-custos-pelas-mensagens-do-chat.spec.md), [203](../done/203-ia-provedores-e-fallback.spec.md) e [204](../done/204-configuracao-ia-redesenho-da-tela.spec.md).

## Objetivo

Permitir que **cada nível da IA use um provedor principal diferente** dentro da mesma configuração versionada, mantendo a contingência já existente e a escolha administrativa dos modelos. Habilitar, como configuração desejada do Project 2.0:

| Nível | Provedor principal | Modelo da API | Esforço |
|---|---|---|---|
| `RAPIDO` | Anthropic | `claude-haiku-5-5` | `MEDIO` |
| `PADRAO` | OpenAI | `gpt-6.1-sol` | `MEDIO` |
| `ANALITICO` | Anthropic | `claude-opus-5-5` | `MEDIO` (inicial); `ALTO` selecionável pelo administrador |

Os identificadores devem ser confirmados numa chamada real e na documentação do provedor antes da ativação. A configuração permanece editável: **não fixar esses modelos nem provedores no código**. O Opus High usa o mesmo modelo e tarifa por token, alterando apenas o esforço.

## Situação atual e premissas

- `ConfiguracaoIaResumoDto` e `ConfiguracaoIaCriarDto` guardam `provedor`, `fallbacks` (até 2, em ordem), `modelosProvedor` (três modelos por provedor) e `esforcoAnalitico`; a configuração é versionada.
- `IaService.montarCadeia()` percorre a mesma cadeia para qualquer nível. `modeloDoNivel()` escolhe o modelo correspondente **dentro do provedor corrente**. Isso impede o híbrido pretendido.
- `IaService.montarSolicitacaoDoProvedor()` só fornece esforço explícito para `ANALITICO`; `RAPIDO` e `PADRAO` dependem do comportamento de cada SDK/modelo.
- O adaptador OpenAI usa Chat Completions e reconhece parâmetros de raciocínio por uma expressão que contempla série `o` e `gpt-5`, mas não `gpt-6`; é preciso verificar suporte real do Sol a streaming, ferramentas e esforço.
- A aba Custos já calcula por modelo realmente registrado na mensagem, mas alguns indicadores de modelos em uso partem dos três níveis do provedor global.
- As propostas têm validação, confirmação e autonomia próprias; o roteamento **não pode enfraquecer** essas garantias.

## Decisões funcionais

1. **Escolha por nível.** Adicionar à configuração versionada um mapa explícito `provedoresNivel` com as chaves `RAPIDO`, `PADRAO` e `ANALITICO` e valores de `TipoProvedorIaEnum`. Cada valor deve pertencer à cadeia de provedores já configurada (provedor global + fallbacks), ter modelos preenchidos e ser selecionável apenas por administrador.
2. **Compatibilidade.** Se uma versão histórica não possuir `provedoresNivel`, os três níveis resolvem para o campo legado `provedor`, exatamente como hoje. A migration não deve ativar automaticamente o híbrido, alterar modelos existentes nem modificar versões antigas. Uma nova versão salva pela tela passa a persistir o mapa completo.
3. **Fallback por chamada e nível.** Para uma chamada de nível N, tentar primeiro `provedoresNivel[N]`; depois os demais provedores da cadeia global existente, na ordem original e sem repetição. Exemplo, cadeia global `[ANTHROPIC, OPENAI, GOOGLE]`: Rápido `[ANTHROPIC, OPENAI, GOOGLE]`; Padrão `[OPENAI, ANTHROPIC, GOOGLE]`; Analítico `[ANTHROPIC, OPENAI, GOOGLE]`. Cada tentativa usa **o modelo daquele mesmo nível** configurado no provedor tentado.
4. **Sem mudança na segurança do streaming.** Fallback só pode começar antes de emitir conteúdo ao usuário; após o primeiro trecho, preservar o erro sem repetir resposta. Provedor sem chave é pulado; a IA fica indisponível somente quando não há provedores utilizáveis na cadeia aplicável.
5. **Esforço.** Aplicar `MEDIO` de forma explícita ao Rápido e ao Padrão quando o modelo/provedor admitir esse parâmetro, em vez de depender do default do fornecedor. O Analítico continua usando `esforcoAnalitico` da configuração atual, inicialmente `MEDIO`, podendo ser alterado para `ALTO` pelo administrador ao salvar outra versão. Preservar a semântica de `BAIXO`, quando escolhida. Parâmetros não suportados exigem adaptação documentada, sem falha silenciosa nem envio de argumento inválido.
6. **Alta capacidade sob controle.** Nesta task, a troca `MEDIO` ↔ `ALTO` é administrativa e versionada, utilizando o controle de esforço do Analítico já existente. Um botão para o usuário escalar somente uma mensagem, escalonamento automático por confiança/erro ou retentativa deliberada em High exigem decisão e spec próprias.
7. **Sem efeitos colaterais de comportamento.** Check-ins, chat, planejamento, propostas, prompt de teste, relatórios e assistência de descrição devem continuar selecionando o mesmo `NivelIaEnum` de antes; apenas a resolução nível → provedor/modelo/esforço é alterada. Permissões, autonomia e necessidade de aprovação das propostas permanecem inalteradas.

## Entregáveis

### 1. Contrato, persistência e migration

- Adicionar `provedoresNivel` aos DTOs e ao modelo de configuração, usando `NivelIaEnum` e `TipoProvedorIaEnum`; validar mapa completo, provedor integrante da cadeia, ausência de entradas inválidas e modelos correspondentes.
- Criar migration reversível (usar o próximo número livre ao implementar) para persistir o mapa numa coluna JSONB `configuracao_ia.provedores_nivel`, **sem `DEFAULT` no banco**, seguindo `SYSTEM.SPEC.md`. Versões antigas podem ter valor nulo e devem continuar interpretáveis.
- Atualizar o repository e a criação de versões. Preservar histórico, retorno das versões antigas, cópia dos preços e atualização do cache da configuração ativa. O `DOWN` deve impedir perda silenciosa de configurações que dependam do roteamento híbrido: documentar claramente as condições e o procedimento de rollback.
- Manter `provedor`, `fallbacks` e `modelosProvedor` existentes; evitar reescrever o banco de modelos por provedor nesta task.

### 2. Resolução de provedores em `IaService`

- Resolver o provedor principal pelo nível da requisição e construir fallback sem duplicações, preservando a prioridade descrita acima.
- Passar o esforço apropriado em cada nível (Medium nos dois primeiros, `esforcoAnalitico` no terceiro) e respeitar os limites de saída e de raciocínio de cada SDK.
- Preservar captura do modelo real, nível solicitado, entrada, saída, cache, motivo de parada e blocos de ferramentas; não atribuir ao provedor original uma resposta proveniente do fallback.
- Tratar com segurança a troca de provedor **entre turnos de ferramentas**: mensagens, IDs, assinaturas ou blocos incompatíveis não podem causar perda silenciosa de dados ou aplicação incorreta de propostas. Reaproveitar as regras existentes e documentar limites dos provedores.

### 3. Compatibilidade OpenAI — GPT-6.1 Sol

- Atualizar `backend/src/modules/ia/provedores/openai.provedor.ts` e `backend/src/modules/ia/ia.module.ts` para suportar o modelo escolhido com a **Responses API**, quando exigida pelo modelo, sem quebrar compatibilidade com outros modelos OpenAI configuráveis.
- Adaptar geração normal, streaming incremental, `function_call`, resposta das ferramentas, associação de IDs, JSON de argumentos, mensagens de sistema, motivos de parada e `usage` (inclusive tokens de entrada em cache e tokens de raciocínio contabilizados na saída), sem perder o contrato `IaProvedor`.
- Aplicar `reasoning.effort = medium` ao Sol no nível Padrão; confirmar o nome e o suporte do parâmetro contra a documentação oficial e, se houver chave, por smoke test real.
- Tratar explicitamente erro de modelo/endpoint/parâmetro, limite de tokens e resposta sem texto mas com ferramentas. Não montar argumentos de `Chat Completions` e enviá-los diretamente à `Responses API`.

### 4. Configurações da IA — frontend

- Na aba **Provedor e modelos**, mostrar uma escolha de **provedor principal por nível**, com o modelo efetivamente selecionado e um indicador de chave configurada/ausente. Preservar os cartões e o cadastro de modelos por provedor da task 204, adaptando os rótulos para distinguir **cadeia global de contingência** de **principal de cada nível**.
- Exibir com clareza o trio configurado: Rápido = Anthropic/Haiku/Medium, Padrão = OpenAI/Sol/Medium e Analítico = Anthropic/Opus/Medium ou High. Não permitir salvar um nível apontando a provedor fora da cadeia ou a modelo vazio.
- A seleção do esforço Medium/High do Analítico deve reutilizar o controle versionado atual. Mostrar no histórico os provedores de cada nível; versões antigas devem mostrar os três níveis usando seu provedor histórico.
- Não expor chaves de API. Preservar validação, mensagens de erro, aviso de alterações pendentes e botão **Salvar nova versão**, bem como responsividade e temas claro/escuro.

### 5. Custos e observabilidade

- A aba **Custos** deve indicar quais modelos estão configurados **por nível**, incluindo níveis pertencentes a provedores diferentes. O total financeiro continua baseado no modelo e nos tokens de fato retornados e armazenados; fallback não pode ser contabilizado duas vezes.
- Permitir precificar separadamente os modelos (entrada, saída, cache) mantendo os preços editáveis. Usar os preços oficiais apenas como referências datadas, nunca como tarifas fixadas no código.
- Manter a limitação atual: o custo por mensagem é estimado quando o turno envolve múltiplos modelos ou trabalhos fora do chat. Não prometer medição exata por operação sem um mecanismo de uso por chamada (fora do escopo).
- Na verificação, comparar ao menos 1 fluxo de cada nível, 1 fluxo com ferramenta e 1 fallback: registrar modelo efetivo, tokens de entrada, saída e cache, latência até o primeiro trecho quando houver streaming, duração total e resultado funcional. Nunca registrar prompts sensíveis ou chaves em logs versionados.

## Critérios de aceite

- [ ] Versão antiga da configuração continua escolhendo o mesmo provedor e fallback nos três níveis; nenhuma versão histórica ou configuração ativa é alterada automaticamente pela migration.
- [ ] Nova configuração seleciona exatamente `RAPIDO → Anthropic/Haiku 5.5/MEDIO`, `PADRAO → OpenAI/GPT-6.1 Sol/MEDIO` e `ANALITICO → Anthropic/Opus 5.5/MEDIO`, desde que as chaves e os modelos estejam disponíveis.
- [ ] Alterar só o esforço do Analítico para `ALTO` cria nova versão; as chamadas seguintes usam Opus High; Rápido e Padrão permanecem Medium e seus provedores não mudam.
- [ ] Fallback de cada nível usa o modelo **do mesmo nível** no provedor de contingência e não duplica provedores. Chave ausente e falha anterior ao streaming são cobertas; falha após emissão não duplica texto.
- [ ] Chat simples, check-in, planejamento e proposta com ferramenta continuam concluindo com seus mecanismos de permissão, confirmação e autonomia; parâmetros e resultados das ferramentas sobrevivem à integração OpenAI.
- [ ] `IaService` e adaptadores Anthropic/OpenAI têm testes com clientes falsos para resolução do nível, esforço, streaming, resposta com ferramentas, cache, raciocínio, limites e erros; a configuração tem testes unitários e de integração, inclusive legado e histórico.
- [ ] Custos exibem os três modelos ativos de provedores distintos e calculam pelo **modelo realmente utilizado**, sem dupla contagem; fallback aparece com seu modelo real.
- [ ] Rodar testes de `shared`, `backend` e `frontend`, `npm run test:integracao`, builds e `npm run repo:verificar`; documentar resultados e eventuais limitações.
- [ ] Verificar a tela ao vivo em `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, incluindo erro de chave ausente, versão legada, nova versão e histórico.
- [ ] Realizar smoke test com API real (sem publicar tokens/chaves) para Sol Medium em texto, streaming e ferramenta, e para Opus Medium/High; **se não houver credenciais, registrar explicitamente a verificação pendente e não afirmar compatibilidade real**.
- [ ] Atualizar `docs/SYSTEM.SPEC.md`, `docs/SCHEMA.md`, `docs/context/CONTEXT.md` e `HISTORY.md`; ajustar `README.md` e `MEMORY.md` quando necessário.

## Fora de escopo

- Escolher modelos automaticamente por preço, confiança, complexidade, heurística ou benchmark; escalonar automaticamente Medium → High.
- Botão de esforço por mensagem para usuários finais ou execução de duas IAs em paralelo para escolher a melhor resposta.
- Trocar as regras de autonomia, aprovação, proposta ou o nível de modelo pedido pelos consumidores existentes.
- Construir uma nova tabela de uso por chamada, corrigir toda a medição histórica ou recalcular custos retroativamente.
- Implantar cache de prompts novo, resumir automaticamente conversas ou modificar as estratégias de contexto; podem ser evoluções futuras.

## Riscos e mitigação

- **Modelos com APIs distintas:** testar tool calling em múltiplos turnos e streaming; isolar diferenças no adaptador, mantendo `IaProvedor` neutro.
- **Configuração híbrida sem chave:** mostrar ausência de chave antes de salvar/ativar, manter fallback e falha explícita quando nenhum provedor atende ao nível.
- **Incompatibilidade com histórico:** normalização de `provedoresNivel = null` retorna comportamento antigo; testes com versões reais e migration reversível.
- **Custo e desempenho:** não inferir economia garantida a partir dos benchmarks. Comparar tarefas reais equivalentes; Sol tem tarifas por token semelhantes às do Sonnet, mas seus tokens de saída e número de chamadas podem variar conforme o contexto.
- **Regressão de propostas:** validar esquema de argumentos, identidade de chamadas, resultado de ferramenta e exigência de confirmação antes de permitir uso em produção.

## Referências técnicas

- `backend/src/modules/ia/services/ia.service.ts`
- `backend/src/modules/ia/provedores/{anthropic,openai,google}.provedor.ts` e `backend/src/modules/ia/ia.module.ts`
- `backend/src/modules/configuracao-ia/`; `shared/src/dtos/configuracao-ia/`
- `frontend/src/app/modules/configuracao-ia/components/provedor-aba/`
- `backend/src/modules/ia-custo/` e spec 202
- OpenAI: https://platform.openai.com/docs/guides/function-calling ; https://platform.openai.com/pricing
- Anthropic: https://docs.anthropic.com/en/docs/about-claude/models/overview

**Ordem sugerida de execução:** contrato + migration → roteamento + testes → adaptador Responses API + testes → frontend → custos → integração, smoke tests e documentação.
