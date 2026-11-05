# 309-ia-listar-modelos-dos-provedores.spec.md

> Origem: decisão do autor em 2026-11-04, durante a remodelagem da [261](261-ia-roteamento-hibrido-por-nivel-e-esforco.spec.md). Na Configuração da IA, o campo de modelo de cada item da cadeia passa a oferecer **a lista de modelos do próprio provedor**, obtida pela API dele, em vez de depender só de texto livre. **Depende da 261 em `done/`** (a tela de cadeias por nível, onde o campo mora). Não implementar antes.

## Objetivo

O administrador escolhe o modelo de um item da cadeia numa lista (select) dos modelos que o provedor realmente oferece e que servem ao projeto. Quando o provedor não tem chave ou a listagem falha, o campo volta a ser de **digitação à mão**, como hoje.

## Decisões do autor (2026-11-04)

1. **Fonte:** a API de listagem de cada provedor, pelo SDK que o backend já usa. Sem catálogo de modelos gravado no banco e sem tabela nova.
2. **Contrato (opção B):** por provedor, se a listagem está disponível e a lista de `{ id, nome }`; o select **mostra o nome amigável e grava o `id`**.
3. **Sem chave ou listagem com falha:** o campo abre para **digitar o nome do modelo à mão**.
4. **Cache:** em memória no backend, **30 minutos** por provedor (constante nomeada; passar a 1 hora é só ajustar o valor).
5. **Só administrador** consulta a lista, como o estado completo da IA.

## Contexto verificado

A documentação online dos três provedores não estava acessível no ambiente em que esta spec foi escrita. O que está abaixo vem dos **tipos dos SDKs nas versões do `package.json`** (`@anthropic-ai/sdk` 1.4.0, `openai` 7.50.0, `@google/genai` 2.32.0), lidos em 2026-11-04. **Antes de implementar, conferir cada ponto na documentação oficial e numa chamada real**, e registrar a data da conferência.

| Provedor | Chamada do SDK | O que cada modelo traz | Dá para filtrar só o que interessa? |
|---|---|---|---|
| Anthropic | `client.models.list({ lifecycle: ['active'] })`, paginada (`for await`) | `id`, `display_name`, `lifecycle` (`active`/`deprecated`/`retired`), `capabilities` (inclui `effort`, `thinking`, `structured_outputs`), `max_input_tokens`, `max_tokens`, `created_at` | **Sim, pela própria API.** A lista só tem modelos da Messages API; o padrão da API inclui `deprecated`, então pedir só `active`. Nome = `display_name` |
| OpenAI | `client.models.list()`, paginada | `id`, `created`, `object`, `owned_by`, `shutdown_date?` | **Não há campo de capacidade nem nome amigável.** A lista mistura chat, embeddings, imagem, áudio, moderação. O filtro é pelo `id` (abaixo). Nome = `id` |
| Google | `ai.models.list({ config: { queryBase: true, pageSize } })`, paginada (`Pager`) | `name` (`models/<id>`), `displayName`, `description`, `supportedActions`, `inputTokenLimit`, `outputTokenLimit`, `thinking` | **Sim, em parte:** `supportedActions` deve incluir `generateContent`; `queryBase: true` deixa de fora modelos ajustados. Variantes só de imagem/áudio ainda passam e precisam do filtro pelo `id`. Nome = `displayName`; o `id` é o `name` sem o prefixo `models/` |

### Regras de filtro (ponto de partida, a confirmar)

Aplicar sempre antes da regra de prefixo já existente em `shared/src/utils/provedor-ia.ts` (`modeloPertenceAoProvedor`: `claude-`, `gemini-`/`gemma-`, `gpt-`/`chatgpt-`/`o<dígito>`).

- **Anthropic:** `lifecycle = active`. Nada além.
- **OpenAI:** passar pelo prefixo e **excluir** os ids de outras funções por trecho do nome (por exemplo `embedding`, `whisper`, `tts`, `transcribe`, `audio`, `realtime`, `image`, `dall-e`, `moderation`, `sora`, `search`), e os que tenham `shutdown_date` já passada. A lista de trechos é provisória: montar a partir da documentação de modelos da OpenAI e de uma chamada real, e guardar numa constante nomeada e testada. Modelos que só funcionam na Responses API (por exemplo variantes `-pro` e `-codex`) só entram se o adaptador da 261 os suportar.
- **Google:** `supportedActions` contém `generateContent`, prefixo `gemini-`/`gemma-` e exclusão por trecho do `id` (por exemplo `embedding`, `imagen`, `veo`, `tts`, `image`, `aqa`), mais `queryBase: true`.
- A lista devolvida é ordenada do mais novo ao mais antigo quando o provedor informar a data (`created_at`/`created`); sem data, por nome.

## Contrato

- Rota nova, só administrador, no módulo `ia`: `GET /ia/modelos`, devolvendo `StandardResponse` com **um registro por provedor**: `{ provedor: TipoProvedorIaEnum, disponivel: boolean, modelos: { id: string, nome: string }[] }`. `disponivel = false` (e `modelos` vazio) quando o provedor não tem chave **ou** a listagem falhou; o front não precisa saber qual dos dois.
- DTOs no `shared` (um para a resposta e um para o item do modelo; nomes finais pela skill `project20-dto-conventions`). Nenhuma chave de API trafega.
- Contrato novo do adaptador, em `IaProvedor`: listar os modelos já filtrados e no formato do item, sem vazar tipos do SDK. O `IaService` orquestra, aplica o cache e monta a resposta; o controller só repassa.
- Provedor sem chave **não é chamado**. A listagem tem tempo limite (por exemplo 10 s) para a tela não travar; chamadas simultâneas ao mesmo provedor compartilham a mesma requisição em andamento. **Falha não é guardada em cache** (a próxima abertura tenta de novo); só sucesso entra no cache de 30 minutos. A falha é registrada no log sem chave nem dado sensível.

## Frontend

- A aba **Provedor e modelos** (da 261) carrega a lista **uma vez ao abrir**, para os três provedores, com estado de carregamento discreto.
- Item de provedor com `disponivel = true`: o campo de modelo vira um **select com busca**, mostrando o `nome` e gravando o `id`. Mantém uma opção final **"Outro modelo…"** que abre o campo de digitação, porque o filtro é heurístico e um modelo recém-lançado pode ainda não passar nele (proposta; o autor confirma ou remove na revisão).
- Item de provedor com `disponivel = false`: o campo é de **texto livre**, como hoje, com as sugestões fixas (`SUGESTOES_MODELOS`) como apoio.
- Se o valor já salvo no item não está na lista (modelo retirado, filtrado ou digitado à mão), o campo **mostra o valor salvo** assim mesmo, sem apagá-lo nem marcá-lo como erro; a validação de salvar é a da 261 (prefixo do provedor, tamanho).
- Preservar temas claro e escuro, responsividade, aviso de alterações pendentes e o aviso "Chave de Provedor não configurada". Seguir o processo visual do `CLAUDE.md`.

## Critérios de aceite

- [ ] `GET /ia/modelos` responde só ao administrador e devolve os três provedores; sem chave, `disponivel = false` sem chamar o provedor.
- [ ] Anthropic lista só modelos `active`; OpenAI e Google listam apenas modelos de texto/chat (sem embeddings, imagem, áudio, moderação), conferido por chamada real e por teste das regras de filtro com listas de exemplo.
- [ ] O cache de 30 minutos evita nova chamada ao provedor, expira, e uma falha não é guardada; duas chamadas simultâneas geram uma só requisição ao provedor.
- [ ] Na tela: select com nome amigável e `id` gravado quando há lista; texto livre quando não há chave ou a listagem falha; valor salvo fora da lista continua visível; "Outro modelo…" permite digitar.
- [ ] Testes: adaptadores com clientes falsos (paginação, filtros, lista vazia, erro), service (cache, expiração, falha, simultaneidade, provedor sem chave), controller (permissão), componente (os quatro estados do campo) e utilitário das regras de filtro. Smoke test real com as chaves disponíveis; **sem credenciais, registrar a verificação pendente e não afirmar compatibilidade**.
- [ ] Rodar testes de `shared`, `backend` e `frontend`, builds, `npm run lint:tudo` e `npm run repo:verificar`; verificar a tela ao vivo em todos os formatos de desktop do `CLAUDE.md`, claro e escuro.
- [ ] Atualizar `docs/SYSTEM.SPEC.md` (a rota), `docs/context/CONTEXT.md` e `HISTORY.md`.

## Fora de escopo

- Catálogo de modelos gravado no banco, ou preços buscados automaticamente (os preços continuam editados na aba Custos).
- Escolher o modelo por preço, benchmark ou capacidade; esconder o esforço que o modelo não suporta (a Anthropic informa `capabilities.effort` por modelo, o que fica como ideia futura).
- Botão de recarregar a lista (a lista se renova pelo cache de 30 minutos).
- Mudar a validação de salvar: o nome digitado ou escolhido continua tendo de pertencer ao provedor pelo prefixo.

## Referências técnicas

- `backend/src/modules/ia/` (`ia.service.ts`, `ia.module.ts`, `provedores/{anthropic,openai,google}.provedor.ts`, `domain/ia.tipos.ts`)
- `shared/src/utils/provedor-ia.ts`; `frontend/src/app/modules/configuracao-ia/utils/configuracao-ia.util.ts` (`SUGESTOES_MODELOS`)
- Anthropic: https://docs.anthropic.com/en/api/models-list ; OpenAI: https://platform.openai.com/docs/api-reference/models/list ; Google: https://ai.google.dev/api/models

**Ordem sugerida de execução:** conferir a documentação e uma chamada real de cada provedor → contrato e adaptadores com filtros + testes → service, cache e rota → frontend → integração, smoke tests e documentação.
