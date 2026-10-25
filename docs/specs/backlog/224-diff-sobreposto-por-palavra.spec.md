# 224-diff-sobreposto-por-palavra.spec.md

> Task 1/8 (fase 2) da guarda-chuva [`chat-propostas.spec.md`](chat-propostas.spec.md) e **fase 1 da guarda-chuva
> [`chat-planejamento.spec.md`](chat-planejamento.spec.md)** (decisão 10). **Esta spec pertence às duas guarda-chuvas**: é uma task só,
> feita uma vez e usada pelas duas. Origem: conversa com o autor em 2026-10-25 (`IDEAS.md` I-026).

## Objetivo

Toda mudança de texto mostrada pelo sistema passa a ser um **diff sobreposto por palavra**: um texto só, com o que sai riscado em
vermelho e o que entra em verde, também em código. Esta task entrega a regra, o componente e a troca nos cartões de proposta e no pad.

## Entregáveis

1. **Regra pura no `shared`** (arquivo novo em `shared/src/utils/`, exportado por `shared/src/utils/index.ts`): recebe o texto antes e o
   depois e devolve a sequência de trechos `IGUAL`, `REMOVIDO` e `ADICIONADO`, por palavra (espaços e quebras de linha preservados).
   Sem dependência nova de pacote se um LCS simples bastar; texto grande tem teto de custo (cai para trecho inteiro trocado, nunca trava).
   Teste ao lado (`node:test`): igual, só inclusão, só remoção, troca no meio, acento e Markdown, texto vazio dos dois lados, texto grande.
2. **Componente de exibição** em `frontend/src/app/shared/components/` (standalone, Signals, `.scss` com BEM em português, cores pelos
   aliases `--app-surface-*` e utilitários semânticos, nunca `--p-surface-N`): recebe antes e depois e desenha o diff sobreposto. Variante
   para **código** (fonte monoespaçada, mantém a indentação e as quebras de linha, mesmo realce). Teste de componente (`*.spec.ts`).
3. **Troca nos cartões de proposta** (`frontend/src/app/modules/chat/components/proposta-cartao/`), conforme a decisão 3 da guarda-chuva:
   - `DESCREVER_DEMANDA`: hoje mostra só o texto novo; passa a mostrar o diff entre o texto atual e o novo (Mudanças, Antes e Depois).
   - `ANOTAR_PAD` com troca (`TROCAR`): o trecho trocado como diff.
   - documentação de `ALTERAR_DEMANDA`; nome de `ALTERAR_ATIVIDADE` e de `ALTERAR_DEMANDA` (hoje só "Novo nome"; passa a mostrar o nome
     atual contra o novo, usando `atividadeNome` e `demandaNome` já gravados na proposta); horários e duração de `CORRIGIR_EXECUCAO`.
4. **Troca no pad** onde ele hoje mostra mudança de texto (conferir no código e listar no fecho; se o pad fora do chat não tiver tela de
   diff, só os cartões entram e o fecho diz isso).
5. Se faltar o texto "antes" na proposta de algum tipo, completar o dado gravado na criação da proposta (DTO no `shared`, validação em
   `backend/src/modules/proposta-ia/domain/validar-dados-da-proposta.ts`), sem migration se couber no JSON `dados` da proposta. Proposta
   antiga sem o "antes" continua mostrando o texto novo como hoje.
6. Aplicar a skill `gerenciamento-de-impacto` (`npm run impacto -- frontend/src/app/modules/chat/components/proposta-cartao/proposta-cartao.component.ts`)
   e listar os consumidores avaliados no fecho.

## Critérios de Aceite

- `npm run test --workspace=shared` com os testes da regra; `npm run test --workspace=frontend` com o spec do componente e dos cartões
  (um caso por tipo da lista do entregável 3); builds de `shared`, `backend` e `frontend` passam.
- Verificação ao vivo no chat (skill `verify`) com propostas reais de cada tipo da lista, em 1920×1080, 1366×768 e 1080×1920, tema claro e
  escuro, comparando com o cartão atual da `proposta-cartao` (análogo aprovado); estados: sem mudança, mudança pequena, texto longo,
  código.
- A regra e o componente ficam prontos para o planejamento consumir sem mudança (a spec do planejamento só os importa).

## Fora de Escopo

- Cartão compacto (226), grupo de propostas (227) e autonomia (228).
- O documento do plano e a edição por trecho do planejamento (guarda-chuva `chat-planejamento.spec.md`).
- Diff por linha ou por caractere; diff fora de texto (campos que não são texto seguem como chips de antes → depois).

## Dependências

Nenhuma (independente das demais da guarda-chuva das propostas). A 226 e a 227 reaproveitam o componente.

## Riscos e Mitigação

- Texto longo deixar o cartão lento ou ilegível. Mitigação: teto de custo da regra e rolagem interna do diff longo.
- O cartão é compartilhado por 16 tipos. Mitigação: só os tipos do entregável 3 mudam; os demais ficam como estão (teste de regressão).
