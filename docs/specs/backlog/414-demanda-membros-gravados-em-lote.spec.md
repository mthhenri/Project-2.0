# 414-demanda-membros-gravados-em-lote.spec.md

> Task 86/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-118 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-14.
> Severidade: Baixa. Área: backend/demanda e frontend/demanda. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Salvar membros deixa de fazer um `POST` ou `DELETE` por pessoa seguido da releitura da lista.

## Contexto

**A-118 · Baixa · Membros são gravados com uma requisição por pessoa e a lista é relida em seguida**

Salvar membros na edição ou no diálogo "Membros" dispara um POST ou DELETE por pessoa adicionada ou removida (em paralelo), e o diálogo ainda relê GET /demanda/:id/membro depois; "Participar" do desenvolvedor faz POST e depois GET da lista. Tags já têm o formato em lote (PUT /demanda/:id/tag com a lista).

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component.ts:301-307 — um atribuirMembro ou removerMembro por usuário
- frontend/src/app/modules/demanda/components/demanda-membro-lista/demanda-membro-lista.component.ts:86-92 e 100 — idem no diálogo de membros, seguido de carregarMembros()
- frontend/src/app/modules/demanda/components/demanda-membros-cabecalho/demanda-membros-cabecalho.component.ts:107-116 — participar(): POST e, no next, listarMembros
- backend/src/modules/demanda/controllers/demanda.controller.ts:303 e 318 — só rotas unitárias POST :id/membro e DELETE :id/membro/:usuarioId; linha 264 — PUT :id/tag em lote

Como observar: Editar uma demanda marcando 3 membros novos e desmarcando 1: três POST /demanda/:id/membro e um DELETE /demanda/:id/membro/:usuarioId na aba de rede.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor pendente

**Antes:** tags já são gravadas em lote (`PUT /demanda/:id/tag` com a lista final); membros, não.

**Opções:**

1. Rota em lote `PUT /demanda/:id/membro` com a lista final, devolvendo os membros (rota e DTO novos).
2. Só front: manter uma chamada por pessoa e montar a lista local, sem reler.

## Entregáveis

1. A opção escolhida; na 1, a rota aplica as mesmas regras de `atribuirMembro` e `removerMembro` numa transação, com teste de integração.

## Critérios de Aceite

- Ao vivo: trocar três membros gera uma requisição (opção 1) ou três sem a releitura (opção 2).
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. Depois de `381-demanda-membro-so-quem-atua-como-desenvolvedor` (a regra de quem pode ser membro precisa estar na service).

