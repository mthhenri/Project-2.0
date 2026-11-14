# 352-gravacoes-de-texto-com-resposta-enxuta.spec.md

> Task 24/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-031 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/anotacao e demanda. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

A resposta de gravar uma seção do pad e de gravar os textos da demanda traz só o que a tela lê (`updatedDate`, `versao`), não o texto que acabou de ser enviado.

## Contexto

**A-031 · Baixa · Gravações do pad e dos textos da demanda devolvem o texto inteiro que acabaram de receber; a tela só lê `updatedDate` e `versao`**

`PUT /anotacao/:usuarioId/:tipo` responde a seção inteira (`AnotacaoAlteradaDto = AnotacaoResumoDto`) e o pad usa só `updatedDate`. `PATCH /demanda/:id/textos` responde os três textos, mesmo gravando um, e a tela usa só `versao`.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/anotacao/repositories/anotacao.repository.ts:20-26 e 185-186 — `RETURNING` com `texto`
- shared/src/dtos/anotacao/AnotacaoAlteradaDto.ts — `AnotacaoAlteradaDto = AnotacaoResumoDto`
- frontend/src/app/modules/usuario/services/pad.service.ts:340-342 — só `resposta.dados?.updatedDate` é lido
- backend/src/modules/demanda/repositories/demanda.repository.ts:1281-1286 — `RETURNING` dos três textos e da versão
- frontend/src/app/modules/documentacao/components/documentacao-demanda/documentacao-demanda.component.ts:327 — só `resposta.dados?.versao` é lido

Como observar: Digitar no pad e abrir a resposta do `PUT /anotacao/…`: o corpo repete o texto da seção. Gravar um texto em Documentações: a resposta do PATCH traz os três.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** `PUT /anotacao/:usuarioId/:tipo` devolve a seção inteira (`AnotacaoAlteradaDto = AnotacaoResumoDto`) e `PATCH /demanda/:id/textos` devolve os três textos.

**Opções:**

1. DTOs de saída enxutos (`{ tipo, updatedDate }` no pad; `{ id, versao }` nos textos).
2. Manter: o custo é a banda de um texto por gravação.

## Entregáveis

1. Os DTOs de saída escolhidos pelo autor, no `shared`, e as services ajustadas.
2. O front continua lendo os mesmos campos; testes de service e de componente ajustados.

## Critérios de Aceite

- A resposta das duas rotas não contém mais o texto; o conflito de versão (409) continua igual.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. Rodar `npm run impacto` nos dois DTOs antes de mudar (a IA também grava no pad).
