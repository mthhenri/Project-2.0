# Pesquisa nativa: decisões de design da task 294

> Anexo da [spec](../294-pesquisa-internet-provedores-custos-e-fontes.spec.md), 2026-10-31. Especificação futura; não atesta implementação nem teste contra APIs reais.

## Interface aprovada

O globo ocupa o espaço ao lado do selo de nível da mensagem, sem chip textual permanente. Seu tooltip é **Pesquisa realizada na internet**. As fontes são bolinhas de link no rodapé, com identificação acessível; as citações continuam nos trechos do texto. Um provedor executar busca sem devolver fontes não autoriza criar referências fictícias.

O interruptor **Pesquisa na internet** é pequeno e fica no cabeçalho **Modelos: <provedor>**, ao lado do título, com explicações só em tooltip. Cada provedor guarda sua opção, inclusive quando usado como fallback. Ligado permite decidir; desligado retira a ferramenta. Usar componentes, densidade e tokens da `chat.page` e da `provedor-aba`, incluindo a sutileza do esforço analítico, em ambos os temas. O mock aprovado é referência de direção, não nova biblioteca de componentes.

## Limite de confiança e isolamento

A configuração administrativa não altera o domínio autorizado: só dúvida pública de programação pode originar busca externa. A tarefa 263 atualmente habilita `pesquisaWeb` pelo contexto de chat e `duvidasCodigo`; esse controle é insuficiente para provar isolamento de uma conversa misturada.

A service deve decidir elegibilidade e preparar uma chamada com contexto público isolado antes de o adaptador disponibilizar a ferramenta. Não basta classificar `CODIGO`, instruir “não exponha dados” ou pedir a um modelo com acesso à busca que anonimice os dados que já recebeu. Histórico interno e resultados de ferramentas internas não podem entrar na chamada com pesquisa; em caso de separação ambígua, responder internamente sem busca. O custo dessa restrição é reduzir a pesquisa em perguntas misturadas; a vantagem é impedir que a query nativa carregue contexto privado. Testes inspecionam o payload completo, inclusive após retomadas e fallback, com dados artificiais detectáveis.

## Normalização sem perder evidência

Diferenças de evento, fonte, citação e uso pertencem aos adaptadores. A service orquestra e conserva o resultado neutro; os três armazenamentos guardam-no na mensagem e o frontend só apresenta. Definir nomes e DTOs na implementação, depois de conferir os contratos da task 261, evitando uma estrutura prematura nesta proposta.

Há três fatos distintos: ferramenta disponível, pesquisa executada e uso tarifável medido. Somente o segundo acende o globo; o terceiro exige quantidade e unidade comprovadas. Falta de metadados em mensagens antigas permanece desconhecida. Fontes deduplicadas não modificam o consumo faturável nem dispensam citações inline.

## Custos e compatibilidade

A própria mensagem guarda consumo e base de preço/custo da ocasião. Isso permite agregação existente sem tabela de uso e evita que preço novo altere o histórico novo. Mensagens antigas continuam estimativas identificadas. Não converter fontes em buscas nem franquia presumida em desconto; quando não houver medição suficiente, mostrar a limitação. Tokens incluídos no `usage` não entram duas vezes.

Anthropic, Gemini e OpenAI têm pesquisa nativa, mas modelos, endpoints, eventos e tarifas diferem. A OpenAI depende da Responses da 261; Gemini exige conferência por modelo da combinação de ferramentas. A implementação registra uma matriz datada com suporte, formato e unidade, usando documentação oficial e smoke tests; não atualiza SDKs além do necessário. Adaptações obrigatórias de atribuição do fornecedor devem caber na apresentação sem remover citações exigidas.

Fontes oficiais consultadas para delimitar o contrato, sem fixar tarifas ou versões de ferramenta:

- [Anthropic: Web search tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool).
- [Gemini: Grounding with Google Search](https://ai.google.dev/gemini-api/docs/google-search/).
- [OpenAI: Web search](https://developers.openai.com/api/docs/guides/tools-web-search).

## Limites da decisão

O comando manual do usuário continua ideia futura da I-044. Não há autorização nesta spec para pesquisar dados do Project na internet, mudar autonomia de propostas, construir tabela de uso ou reescrever custos antigos. Verificação visual e APIs reais ficam para a implementação, com pendências explícitas quando ambiente ou credenciais faltarem.
