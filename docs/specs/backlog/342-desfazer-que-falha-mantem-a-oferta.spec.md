# 342-desfazer-que-falha-mantem-a-oferta.spec.md

> Task 14/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-017 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/casca.

## Objetivo

Se a requisição do "Desfazer" falhar, a oferta volta para a tela com o prazo reiniciado, em vez de sumir.

## Contexto

**A-017 · Baixa · 'Desfazer' que falha some sem nova chance**

DesfazerService.executar() retira a oferta da tela antes de chamar a reversão e só trata o sucesso. Se a chamada falhar (rede, 500), o toast de desfazer já sumiu, aposDesfazer não roda e o registro continua excluído, sem outro caminho na interface para restaurar.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/core/services/desfazer.service.ts:60-73 — oferta.set(null) antes do subscribe; subscribe só com next
- frontend/src/app/shared/components/toast-desfazer/toast-desfazer.component.html:1-10 — o botão só existe enquanto oferta() não é nulo

Como observar: Excluir uma tag ou atividade, marcar 'Offline' no DevTools e clicar 'Desfazer': aparece o toast de erro, o de desfazer some e o item segue excluído.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Entregáveis

1. Em `core/services/desfazer.service.ts`, no erro da ação, a mesma oferta é reposta.
2. Teste do serviço para o erro.

## Critérios de Aceite

- Ao vivo: com o backend parado, clicar em "Desfazer" mostra o erro e mantém o botão; com o backend de volta, o segundo clique desfaz.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.
