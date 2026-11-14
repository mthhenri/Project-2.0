# 339-encerrar-execucao-sem-reler-a-ativa.spec.md

> Task 11/67 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-014 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/casca.

## Objetivo

Depois de `PATCH /execucao/:id/encerrar`, o interceptor atualiza a execução ativa pelo id da URL em vez de pedir a rota de novo.

## Contexto

**A-014 · Baixa · Todo PATCH /execucao/:id/encerrar é seguido de GET /execucao/ativa, embora a resposta e o id da URL já digam o resultado**

O interceptor recarrega a execução ativa depois de qualquer encerramento. Se a execução encerrada é a do chip, o resultado só pode ser 'nenhuma' (o chip já faz definir(null)); se é a de outra pessoa (gestor ou auxiliar encerrando), a execução do usuário logado não mudou. Nos dois casos a leitura não traz informação. No início de execução a leitura é necessária, porque a resposta não diz quem é o dono.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/interceptors/execucao-ativa.interceptor.ts:6 e 18-28 — PATCH .../encerrar com sucesso chama execucaoAtiva.carregar()
- frontend/src/app/shared/layout/topbar/chip-execucao-ativa/chip-execucao-ativa.component.ts:63-65 — aposEncerrar já faz execucaoAtiva.definir(null)
- shared/src/dtos/execucao/ExecucaoEncerradaDto.ts — a resposta traz id e fimData
- shared/src/dtos/execucao/ExecucaoIniciadaDto.ts — a resposta do início não traz o dono (por isso o GET segue necessário no POST)

Como observar: Pausar pelo chip: depois do PATCH /execucao/N/encerrar aparece um GET /execucao/ativa que responde dados: null.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Em `core/interceptors/execucao-ativa.interceptor.ts`, no encerrar: se o id é o da execução ativa conhecida, o sinal vira `null`; se não é, nada muda. `POST /execucao` e as propostas da IA continuam relendo.
2. Teste do interceptor para os dois casos.

## Critérios de Aceite

- Ao vivo: encerrar pela topbar gera só o `PATCH`; o chip some na hora.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

