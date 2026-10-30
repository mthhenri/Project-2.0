# 262-ia-pesquisa-na-internet-e-ajustes-de-chat.spec.md

> Origem: `IDEAS.md` I-007 (reinterpretada pelo autor em 2026-10-30), I-032 e I-003. Três entregas pequenas pedidas juntas; trabalho feito direto, sem passar pelo backlog.

## Objetivo

Dar à IA uma ferramenta de pesquisa na internet para dúvidas de código difíceis ou recentes (no lugar de escalar para um modelo maior), apagar o fundo da mensagem do usuário no chat da IA e permitir tabelas no editor e no visualizador de Markdown.

## Entregáveis

1. **`pesquisar_na_internet`** (I-007): ferramenta `LEITURA`, de qualquer usuário, entrada `PesquisaWebConsultarDto { consulta }` (3 a 200 caracteres), até 5 resultados (`titulo`, `url`, `trecho` sem HTML) e um aviso de conteúdo de terceiros. A busca passa pela abstração `BuscaWeb`; a implementação é `BuscaWebBrave` (Brave Search, `BUSCA_WEB_CHAVE`). Sem a chave a ferramenta não aparece; prazo de 8 s e recusa viram erro de negócio que o modelo lê.
2. **Balão cinza** (I-032): `chat__balao` passa de `--p-primary-600` para `--app-surface-200`, com a cor de texto do tema.
3. **Tabelas** (I-003): botão **Tabela** e botões `+L`/`+C`/`−L`/`−C`/`✕` no editor formatado; `app-markdown-visualizador` com `comTabelas` ligado por padrão.

## Critérios de Aceite

- Testes: `busca-web.test.ts` e `pesquisar-na-internet.ferramenta.test.ts` (backend), `markdown-formatado.test.ts`, `markdown-editor.component.spec.ts` e `markdown-visualizador.component.spec.ts` (frontend); suítes inteiras e builds verdes.
- Ao vivo em `1920×1080`, `1366×768` e `1080×1920`, tema claro e escuro (balão) e a barra com a tabela inserida, linha e coluna novas (tabela).
- A pesquisa real **não** foi exercitada: o ambiente não tem a chave do Brave; o cliente HTTP é coberto por teste com requisição simulada.

## Fora de Escopo

- Escolher outro serviço de busca, limitar o número de buscas por turno ou por usuário, e mostrar no chat de onde veio a resposta além do que a IA citar no texto.
- Alterar o prompt `DUVIDA_CODIGO` (versão nova na aba Prompts, passo do administrador).
- Balão do check-in e chat entre colaboradores (continuam como estão; o chat entre colaboradores segue mostrando tabela como texto).
- Criar tabela por digitação ou colagem, e alinhamento de colunas pela barra.

## Dependências

Tasks 134 (editor formatado), 138 (laço da IA com ferramentas) e 188–191 (dúvidas de código); P-039 (tabelas no interpretador).
