# <nome-do-arquivo>.spec.md

> Contexto de uma linha: task solta, task de fase (`Task N/M da fase <arquivo>.spec.md`) ou
> guarda-chuva. Cite o `PROBLEMS.md`/`IDEAS.md` de origem, se houver.

## Objetivo

*(obrigatória)* O que a task entrega, em 1–3 frases. Não é o "como" — isso vai em Entregáveis.

## Entregáveis

*(obrigatória)* Lista **numerada** — cada item é uma coisa verificável, não uma frase vaga.
Prosa quando o "como" importa (decisão de ferramenta, formato de arquivo, exemplo de código);
não force todo entregável a virar um bullet de uma linha se a task pedir mais contexto.

1. Primeiro entregável concreto.
2. Segundo entregável concreto.

## Critérios de Aceite

*(obrigatória)* O que prova que os Entregáveis estão prontos — comandos que rodam de verdade,
números que batem, gate visual quando há UI (viewports e análogo aprovado, se o projeto tiver o
gate de fidelidade visual documentado). Não repita os Entregáveis com outras palavras; um
critério é uma forma de **verificar**.

## Fora de Escopo

*(obrigatória)* O que a task explicitamente não faz, mesmo que pareça próximo — principalmente
o que um agente apressado tentaria "aproveitar para corrigir também". Achado fora do escopo vira
entrada em `PROBLEMS.md`/`IDEAS.md`, nunca diff desta task.

## Dependências

*(obrigatória, "Nenhuma" se não houver)* Specs que precisam estar em `done/` antes, ou documentos
que a task consulta como fonte de verdade.

## Riscos e Mitigação

*(opcional)* Só quando a task tem um jeito óbvio de sair errado que vale nomear antes de começar
— um atalho tentador, uma ambiguidade que parece resolvida mas não é. Task pequena e direta não
precisa desta seção.

---

Use a skill `task-flow` para abrir, implementar e fechar a task que usar este template.
