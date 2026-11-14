# 330-ia-disponibilidade-pausa-com-a-aba-oculta.spec.md

> Task 2/61 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-002 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-03, corrigido e conforme (uma consulta por carga); o intervalo de 60 s é ganho além da decisão.
> Severidade: Média. Área: frontend/casca. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

A consulta periódica de `GET /ia/disponibilidade` só roda com a aba (ou a janela do Desktop) à vista, e reconfere uma vez quando ela volta.

## Contexto

**A-002 · Média · Barra lateral pede GET /ia/disponibilidade a cada 60 s em toda aba, visível ou oculta**

O intervalo de 60 s da barra lateral usa forcar: true e não olha a visibilidade da aba nem da janela do Desktop. Depois da correção do check-in, é a única requisição contínua da casca: 60 por hora por aba aberta, de todo usuário, inclusive em aba esquecida em segundo plano. A resposta só muda o menu e a janelinha, que ninguém vê com a aba oculta.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/shared/layout/sidebar/sidebar.component.ts:15 — INTERVALO_DISPONIBILIDADE_MS = 60_000
- frontend/src/app/shared/layout/sidebar/sidebar.component.ts:47-51 — setInterval(() => carregar({ forcar: true })) sem condição de visibilidade
- frontend/src/app/core/services/ia-disponibilidade.service.ts:54-56 — forcar pula a janela de frescor; só a consulta em curso segura
- frontend/src/app/core/services/project-desktop.service.ts:59-76 — já existe paginaOculta() (aba oculta ou janela do Desktop oculta)
- backend/src/modules/autenticacao/strategies/jwt.strategy.ts:29 — toda requisição autenticada faz um SELECT do usuário
- docs/specs/backlog/auditoria-requisicoes-telas/verificacao-320-325.md:13 — o intervalo de 1 por minuto foi mantido de propósito na task 321

Como observar: Abrir qualquer tela, deixar a aba em segundo plano por 5 min e voltar: a aba de rede mostra 5 GET /ia/disponibilidade feitos enquanto ela estava oculta.

Verificação na auditoria: medido na aplicação rodando em 2026-11-14: 180 s parado em `/ponto`, sem execução, geram 3 `GET /ia/disponibilidade` e nenhuma outra requisição (60 por hora por aba).

## Decisão do autor pendente

A task 321 decidiu manter o intervalo de 60 s da barra lateral com `{ forcar: true }`. Esta spec revê essa decisão só para a aba oculta.

**Antes:** toda aba aberta, visível ou não, pede `/ia/disponibilidade` a cada 60 s.

**Opções:**

1. Pausar com a aba oculta e reconferir ao voltar (a resposta só muda o menu e a janelinha, que ninguém vê com a aba oculta).
2. Manter como está (a decisão da 321 continua valendo inteira) e descartar esta spec.

Recomendação da auditoria: opção 1.

## Entregáveis

1. Em `shared/layout/sidebar/sidebar.component.ts`, o tique de 60 s é pulado quando `ProjectDesktopService.paginaOculta()` (ou `document.hidden`) for verdadeiro.
2. Ao voltar a ficar visível, uma chamada a `IaDisponibilidadeService.carregar()` sem `forcar` (a janela de 5 s da task 321 evita duplicar com as outras consultas da volta).
3. Teste de componente: com a aba oculta o intervalo não chama o serviço; ao voltar, chama uma vez.

## Critérios de Aceite

- Ao vivo: 3 minutos com a aba oculta não geram `GET /ia/disponibilidade`; ao voltar sai uma.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

O intervalo de 60 s com a aba visível e a regra de 5 s do serviço.

## Dependências

Nenhuma.
