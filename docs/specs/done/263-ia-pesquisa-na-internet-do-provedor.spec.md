# 263-ia-pesquisa-na-internet-do-provedor.spec.md

> Origem: `IDEAS.md` I-007 e a decisão do autor em 2026-10-30, depois de a [262](262-ia-pesquisa-na-internet-e-ajustes-de-chat.spec.md) entregar uma ferramenta nossa de busca (Brave): **cada provedor usa a própria ferramenta de pesquisa**. Esta task substitui o entregável 1 da 262 (a 262 fica como registro).

## Objetivo

A IA pesquisa na internet em dúvidas de código difíceis ou recentes usando a pesquisa nativa do provedor que responde, sem serviço de busca externo, chave extra nem ferramenta própria.

## Entregáveis

1. Sai a ferramenta `pesquisar_na_internet`, a camada `BuscaWeb`/`BuscaWebBrave`, o DTO `PesquisaWebConsultarDto` e a variável `BUSCA_WEB_CHAVE` (config, `.env.example`, README).
2. `IaSolicitacao.pesquisaWeb` (neutro, opcional) liga a pesquisa do provedor.
3. **Anthropic:** acrescenta `{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }` às ferramentas; os blocos que o servidor devolve (`server_tool_use`, resultado da busca) não viram ferramenta do projeto, só o texto final chega.
4. **Google:** acrescenta `{ googleSearch: {} }`; misturado com as ferramentas do projeto só em `gemini-3*` (com `toolConfig.includeServerSideToolInvocations`); nos outros modelos, com ferramentas na chamada, o pedido é ignorado.
5. **OpenAI:** ignora o pedido (a Chat Completions não pesquisa; a `web_search` é da Responses API, spec 261).
6. O chat liga `pesquisaWeb` só no contexto `CHAT` com `duvidasCodigo` ligado.

## Critérios de Aceite

- Testes dos três provedores (parâmetros enviados, mistura com ferramentas, blocos do servidor ignorados), do chat (liga e desliga) e da configuração; suítes e build verdes.
- **Não verificado ao vivo:** nenhuma chave de provedor neste ambiente. Pendente conferir contra a API real: (a) a Anthropic aceitar `web_search_20250305` com as nossas ferramentas e o `max_uses`; (b) a mistura Google Search + `functionDeclarations` no Gemini 3 e o formato das partes de servidor (`includeServerSideToolInvocations`); (c) `pause_turn` da Anthropic, hoje tratado como `outro`.

## Fora de Escopo

- Custo das buscas na aba Custos e a pesquisa da OpenAI (`IDEAS.md` I-041).
- Alterar o prompt `DUVIDA_CODIGO`; mostrar as fontes na tela além do que a IA citar no texto.

## Dependências

[262](262-ia-pesquisa-na-internet-e-ajustes-de-chat.spec.md), tasks 188–191 (dúvidas de código) e 203 (provedores).
