---
name: conventions-check
description: >
  Revisar diff, conferir convenções, checar padrão e nomenclatura antes de commitar, fechar uma
  task ou declarar uma alteração pronta. Use ao revisar mudanças, fazer passe final, conferir SQL,
  DTO, enum, controller, formulário ou estilo — mesmo quando o pedido só disser "confira".
---

# Conventions Check — passe final do diff

> As regras vivem em `docs/CONVENTIONS.md` (sobretudo "Proibições — Resumo Rápido"),
> `docs/SYSTEM.SPEC.md` e `CLAUDE.md`/`AGENTS.md`; esta skill só transforma a revisão em um
> passe repetível. Passe mecânico limpo não substitui ler o diff nem os testes.

## Regra de escopo — leia antes de buscar

O escopo padrão é **somente o diff desta task**: arquivos de `git diff --name-only HEAD`. Não
corrija uma violação preexistente em arquivo que a task não tocou. Registre-a em
`docs/context/PROBLEMS.md`, com o caminho e o impacto, e mantenha o diff no escopo da spec.
Auditoria do repositório inteiro só acontece por pedido explícito; seus achados também viram
problema/spec própria, nunca correção oportunista.

## 1. Preparar o recorte

Confirme o recorte:

```bash
git diff --name-only --diff-filter=ACMR HEAD
```

Se a lista está vazia, inclua também as mudanças já preparadas com `git diff --cached --name-only`
ou faça o passe antes de preparar o commit. Para o conteúdo do patch, use
`git diff --unified=0 HEAD` (não estoura limite de argumentos com listas grandes). Para auditar
um commit já mergeado, troque esse prefixo por `git diff <commit>^ <commit> --unified=0`.

As buscas mecânicas do projeto — com o que cada uma significa e seus falsos positivos conhecidos —
estão em [`references/buscas.md`](references/buscas.md).

## 2. Passe mecânico

1. Rode as buscas cadastradas sobre o recorte e marque cada acerto como violação, exceção listada
   ou falso positivo explicado.
2. Se houver SQL, DTO ou regra de domínio, as skills especializadas (`sql-migrations`,
   `project20-dto-conventions`) continuam sendo a instrução completa — este é apenas
   o check final.
3. Se houver alteração visual, confira a tela renderizada com a skill `verify`; esta skill não a
   observa.

## 3. Leitura manual obrigatória

Leia o diff completo, procurando o que busca textual não prova:

- controller/handler com regra, `if` ou `try/catch`;
- regra de domínio duplicada entre camadas ou permissão fora da service dona;
- DTO de negócio herdando outro DTO de negócio; primitivo em assinatura de service/repository;
- query de um módulo no repositório de outro; escrita recebida por canal de tempo real.

Cheque ainda que a alteração atende à spec e que cada acerto mecânico não é só texto, comentário,
fixture ou caso explicitamente permitido. A ausência de acertos não demonstra essas propriedades.

## 4. Fecho

No relato da task, registre: recorte revisado; buscas relevantes e seu resultado resumido;
achados preexistentes encaminhados (sem misturá-los ao diff); e a leitura manual. Só então siga os
gates de `task-flow` (testes/lint/build proporcionais, spec para `done` e contexto). Nunca use
este passe para declarar pronto algo cuja verificação obrigatória ainda não ocorreu.
