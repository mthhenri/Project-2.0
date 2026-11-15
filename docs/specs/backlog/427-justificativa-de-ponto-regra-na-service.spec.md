# 427-justificativa-de-ponto-regra-na-service.spec.md

> Task 99/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-125 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/ponto-justificativa.

## Objetivo

A rota deixa de aceitar o que a IA recusa: o gestor justificar o próprio ponto, ou justificar para quem não atua como desenvolvedor ou está inativo.

## Contexto

**A-125 · Baixa · Justificativa: a rota aceita o próprio ponto e qualquer alvo; a IA recusa o próprio**

PontoJustificativaService.criar só valida existência do alvo, horas e duplicidade: não compara o alvo com quem pede nem confere se o alvo atua como desenvolvedor ou está ativo. A regra 'só de outra pessoa' vive apenas na ferramenta e no executor da IA, então a mesma ação tem resultado diferente pela rota.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/ponto-justificativa/services/ponto-justificativa.service.ts:28-65 — criar: recuperar alvo (32), teto de horas (37), duplicidade (43-49); nenhum uso de usuarioAtivo além de gestorId (53)
- backend/src/modules/ponto/executores/justificar-ponto.executor.ts:32 — 'Só se justifica o ponto de outra pessoa, não o seu'
- backend/src/modules/ponto/ferramentas/propor-justificar-ponto.ferramenta.ts:35-37 — mesma recusa na proposta
- backend/src/modules/ponto-justificativa/services/ponto-justificativa.service.test.ts:11 — ator dos testes é { sub: 1, login: 'g' } sem tipo; nenhum caso de alvo = ator

Como observar: Como GESTOR: POST /ponto-justificativa {usuarioId:<próprio id>, diaData:'2026-11-10', nome:'x', descricao:'y', horasCobertas:1} → 201. Pela IA a mesma ação dá 400 'Só se justifica o ponto de outra pessoa, não o seu'. Vale também com usuarioId de outro gestor/administrador (que não tem ponto) ou de usuário inativo.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. `PontoJustificativaService.criar` aplica a regra única (não o próprio; alvo que `atuaComoDesenvolvedor` e ativo); a cópia sai do executor e da ferramenta de IA.
2. Teste da service por tipo de alvo e para si mesmo.

## Critérios de Aceite

- `POST /ponto-justificativa` com o próprio id responde 400.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

