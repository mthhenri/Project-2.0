# 104 — Atividade detalhe: faixa de execução com timer, pausar e trocar em 1 clique

**Origem:** Revisão de UI/UX — print `prints/18-atividade-detalhe.png`, análise `analise-detalhada/atividade-detalhe.md`

**Depende de:** 95 (signal compartilhado de execução ativa), 97

**Entrega:** o detalhe da atividade vira a tela de trabalho: faixa hero com **timer ao vivo** (reusa `ExecucaoTimerComponent`), pausar em 1 clique, início rápido inline (sem dialog) com "Reutilizar última descrição", guarda de execução dupla com **"Pausar lá e iniciar aqui"**, e as mesmas regras de exibição da listagem.

> **Frontend apenas.**

---

## Escopo

1. **Faixa de execução** com 3 estados: (A) execução ativa nesta atividade → timer grande + descrição + botão Pausar (1 clique, mantém a descrição; editar ao pausar é popover secundário); (B) sem execução → input "O que você vai fazer? (Enter inicia)" + chip "↩ Reutilizar última: …" (some se não há execuções; descrição opcional p/ dono gestor); (C) execução ativa em **outra** atividade → aviso âmbar + botão "Pausar lá e iniciar aqui" (encadeia encerrar + iniciar) e link para a outra atividade.
2. **Permanecer na página** ao iniciar: remover o `router.navigate(['/execucao'])`; atualização otimista (faixa vira estado A; nova linha "em andamento" nas execuções recentes).
3. **Regras visíveis** (mesmos predicados da listagem): faixa oculta p/ dev sem posse; desabilitada com aviso quando status Pendente/Desenvolvida; select de status **bloqueado durante execução ativa** com tooltip; `alterarStatus` com rollback em erro.
4. **Cabeçalho**: breadcrumb "Atividades › {projeto} · Demanda #{id} — {nome}" (link real para a demanda; requer expor `nomeDemanda`/`nomeProjeto` no `AtividadeRecuperadaDto` — o backend já retorna esses nomes em outros DTOs) + `p-tag` de status + "Criada em {createdDate}".
5. **Execuções recentes**: executor (avatar + `nomeUsuario`), horários "hoje 09:12 → 11:27", duração via pipe (2h15, nunca "135 min"), timer compacto + pausa inline na linha ativa; botão "＋ Registrar tempo" (gestor, mesmo dialog da task 103); empty com CTA "Iniciar primeira execução".
6. **Descrição click-to-edit** no lugar do dialog; **tags** em popover de chips (padrão da listagem). Skeleton no carregamento; "não encontrada" com botão de voltar; re-sync em `visibilitychange`.

## Critérios de aceite

- Pausar: 1 clique sem sair da tela. Trocar de atividade: 1 clique. Iniciar não navega para /execucao.
- Dev sem posse não vê a faixa; status não editável durante execução.

## Backend (mínimo)

- Acrescentar `nomeDemanda`/`nomeProjeto` ao `AtividadeRecuperadaDto` (SELECT com JOIN já usado em outros DTOs do módulo).

## NÃO implementar nesta task

- Mudanças na listagem (102) e nos dialogs compartilhados (103).
