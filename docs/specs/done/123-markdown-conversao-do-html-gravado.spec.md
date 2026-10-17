# Task 123 — Markdown: conversão do HTML já gravado

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 3 (3 de 4).

## Objetivo

Converter, **uma única vez**, o HTML que o Quill gravou para Markdown, sem perder conteúdo
relevante, para que a troca das telas (124) encontre os dados já no formato novo.

## Entregáveis

### 1. Conversor HTML → Markdown (função pura)

- Cobre a saída do Quill 2: parágrafos (`<p>`, `<p><br></p>` como linha em branco), `<br>`,
  `<strong>`, `<em>`, `<s>`, `<u>`, `<a href>`, títulos `<h1>`–`<h6>`, `<blockquote>`,
  `<pre class="ql-syntax">`, `<code>`, entidades (`&nbsp; &amp; &lt; &gt; &quot;`), listas, incluindo
  aninhamento por `ql-indent-N`. O Quill 2 emite listas como `<ol><li data-list="bullet|ordered|checked|unchecked">`:
  **confirmar nas amostras reais** e converter para `-`, `1.` e `- [ ]`/`- [x]`.
- Sem equivalente em Markdown (por exemplo `<u>`, cor e fonte): descartar a marcação e **manter o
  texto**. Relatar a quantidade desses casos no dry-run.
- Texto convertido deve resultar no mesmo conteúdo visível quando lido pelo interpretador da 121.
- Local e dependência: ver decisão em aberto. Testes com `node:test` sobre amostras reais
  (anonimizadas) e casos de borda.

### 2. Comando de execução única

- Script em `backend/src/database/scripts/` e comando npm (ex.: `db:converter-descricoes`),
  **fora do runner de migrations** (as migrations do projeto são `.sql` e não conseguem converter HTML).
- Campos: `demanda.descricao_cliente`, `demanda.descricao_tecnica`, `demanda.documentacao` e
  `usuario.anotacoes`. Levantar na task se o Quill é usado em algum outro campo.
- **`--dry-run` obrigatório e padrão**: lista quantas linhas seriam convertidas por campo, quantos
  casos com perda (`<u>` etc.) e amostras antes/depois. Só converte com `--aplicar`.
- **Idempotente:** converte apenas valores identificados como saída do Quill (começam por tag de bloco
  conhecida). Rodar duas vezes não altera o que já é Markdown. Registrar a heurística e os falsos
  positivos possíveis (Markdown que começa com `<p>` literal).
- Uma transação; falha desfaz tudo. O trigger de `updated_date` roda no `UPDATE`. A coluna
  `anotacoes_alteracao_data` (data da última edição do usuário) **não** é alterada.
- **Irreversível:** exige backup (`pg_dump`) antes de `--aplicar`, dito pelo próprio comando. Não há `DOWN`.

### 3. Documentação

- Procedimento de execução (dry-run, backup, aplicar, conferir) em `README.md`/`docs`, e o resultado
  da execução no `HISTORY.md` quando for aplicada.

## Decisões em aberto

1. **Como converter:** (a) conversor próprio, pequeno, já que o subconjunto do Quill é fechado e a
   task é descartável (proposta: mantém "sem dependências novas"); ou (b) `turndown` como
   `devDependency` só do script. O autor decidiu "sem biblioteca" para o editor e o interpretador; a
   conversão é um caso à parte.
2. **Quando aplicar:** a conversão só deve ser **aplicada junto com o deploy da 124**. Com Quill ainda
   em uso, os dados em Markdown ficariam ilegíveis; com a 124 no ar e dados em HTML, o HTML apareceria
   como texto. Proposta: validar com `--dry-run` agora e aplicar no mesmo ato do deploy da 124.

## Critérios de Aceite

- `npm run test --workspace=backend` (ou `shared`, conforme a decisão de local) passa com os testes do
  conversor, cobrindo todas as construções acima.
- Em banco com dados reais (cópia): `--dry-run` não altera nada e relata contagens; `--aplicar` converte;
  uma segunda execução converte **zero** linhas.
- Amostra revisada pelo autor: pelo menos 10 registros reais (demandas e pads) antes/depois, vistos no
  visualizador da 121, sem perda de conteúdo além da lista de marcações sem equivalente.
- Build do backend passa.

## Fora de Escopo

- Trocar telas ou remover o Quill (124).
- Mover o texto do pad para as seções estruturadas (bloco 8, que o leva inteiro para "Pessoal").
- Converter Markdown em HTML ou reverter a conversão.

## Dependências

Em termos de código, nenhuma; a validação da amostra usa o visualizador da **121**. A **aplicação**
acontece com a **124**.
