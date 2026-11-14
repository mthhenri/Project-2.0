# 393-supervisao-e-o-gestor-rebaixado.spec.md

> Task 65/81 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-080 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/mensagem-direta. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Decidir o que vale para o histórico de um gestor que virou desenvolvedor ou auxiliar: hoje a elegibilidade usa o tipo de agora, então tudo o que ele escreveu como gestor passa a ser lido pela supervisão.

## Contexto

**A-080 · Baixa · Gestor rebaixado: conversas antigas dele viram supervisionáveis**

A elegibilidade usa o tipo de agora dos participantes, na lista e na leitura. Se um gestor passa a desenvolvedor ou auxiliar, todo o histórico dele com desenvolvedores, escrito quando era gestor, fica legível pela supervisão, contra "conversa que envolve gestor é privada". O próprio comentário do repository diz "privada para sempre" e "o tipo é o de hoje" na mesma frase.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/mensagem-direta/services/mensagem-direta-supervisao.service.ts:98-100 — tipos lidos na hora por `listarTiposPorIds`
- backend/src/modules/mensagem-direta/domain/mensagem-direta-regras.ts:87-89 — "A decisão é do tipo de agora, nunca gravada na mensagem"; só a promoção é comentada
- backend/src/modules/usuario/repositories/usuario.repository.ts:633-634 — "a conversa de um deles é privada para sempre ... O tipo é o de hoje"
- backend/src/modules/mensagem-direta/services/mensagem-direta-supervisao.service.test.ts:129 — só a promoção tem teste

Como observar: Gestor G (id 7) conversa com o desenvolvedor 4; um administrador altera G para DESENVOLVEDOR; outro GESTOR faz GET /api/v1/mensagem-direta/supervisao/conversa/4-7. Esperado pela regra escrita: 403 (conversa privada). O código responde 200 com todo o histórico.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** o comentário do repository diz "privada para sempre", mas a consulta olha o tipo atual dos participantes.

**Opções:**

1. Vale o tipo de agora: escrever a regra assim e corrigir o comentário.
2. A conversa guarda que já envolveu gestor (coluna ou marca nova: mudança de modelagem) e continua privada.

## Entregáveis

1. A opção escolhida; na 2, a migration e a regra na service, pela skill `sql-migrations`.

## Critérios de Aceite

- Teste de integração: gestor conversa com desenvolvedor, é rebaixado, outro gestor abre a supervisão.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima (a opção 2 é modelagem).

