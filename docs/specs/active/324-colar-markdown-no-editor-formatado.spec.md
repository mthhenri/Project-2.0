# 324-colar-markdown-no-editor-formatado.spec.md

> Task solta. Origem: `PROBLEMS.md` P-078 (relato do autor, 2026-11-11, corrigido: o defeito é ao **colar** Markdown no editor formatado, não a exibição).

## Objetivo

Colar texto puro que contém Markdown no editor formatado insere o conteúdo já formatado (`**Olá!** Seja bem vindo` vira negrito; uma tabela colada vira tabela), em vez de aparecer literal.

## Entregáveis

1. `pareceMarkdown(texto)` (`shared/components/markdown-editor/parece-markdown.ts`): detecta sinais de Markdown (negrito, tachado, código em linha, link `http(s)`/`mailto`, título, lista, citação, cerca de código, tabela). Texto sem esses sinais segue o caminho normal.
2. Plugin `colarMarkdown` em `markdown-formatado.ts`: só trata colagem **sem HTML junto** (colar de página ou Word segue o ProseMirror), fora de bloco de código, com `pareceMarkdown` verdadeiro. Imagem em Markdown colado vira o texto alternativo, sem criar `<img>`.
3. Tabela colada vira tabela do editor (a regra de digitação continua sem criá-la; só o botão e a colagem).
4. Testes: `parece-markdown.test.ts` (sinais e falsos positivos) e colagem em `markdown-formatado.test.ts` (negrito, tabela, no meio do parágrafo, lista e título, HTML junto, bloco de código, imagem).

## Critérios de Aceite

- Testes e lint do frontend sem erro novo.
- Ao vivo (skill `verify`), nos formatos de desktop e nos dois temas: colar `**Olá!** Seja bem vindo` e uma tabela no editor da descrição da demanda e no campo do chat; salvar e reabrir mantém a formatação e a tabela aparece no visualizador.
- Conferir que o compositor do chat continua tratando colagem de código antes (bloco de código) e que o Enter/Ctrl+Enter não mudaram.

## Fora de Escopo

Copiar do editor como Markdown (o plugin de área de transferência do Milkdown também mudaria o texto copiado; ficou de fora de propósito); mudar a exibição (`app-markdown-visualizador`); tabela por digitação.

## Dependências

Nenhuma. Editor compartilhado: `npm run impacto` listou 3 consumidores (`markdown-editor`, `editor-mensagem`, compositor do chat).

## Riscos e Mitigação

- Falso positivo da heurística: texto puro com `# comentário` (código) ou `- ` no começo da linha é lido como título ou lista. A colagem de código no chat é tratada antes pelo compositor; o desfazer (Ctrl+Z) desfaz a colagem.
