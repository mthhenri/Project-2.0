# 103 — Atividades: dialogs de execução sem atrito (iniciar, registrar, visualizar)

**Origem:** Revisão de UI/UX — prints `prints/07..09-*.png`, análise `analise-detalhada/atividade-listagem.md`

**Depende de:** 97 (padrão de dialog)

**Entrega:** os três dialogs do fluxo de execução otimizados: **Iniciar** com "Usar esta descrição" (reaproveita descrições das últimas execuções, já carregadas), **Registrar** (gestor) com defaults e chips de duração, **Visualizar** acionável (contexto, tempo total, status inline, tags editáveis, Play/Pause no footer, descrição em modo leitura).

> **Frontend apenas.**

---

## Escopo

1. **Iniciar/Encerrar**: linha de contexto (projeto · demanda · dono); cada item de "Últimas execuções" ganha botão "↩ Usar esta descrição" que copia o texto para o textarea; Ctrl+Enter confirma; descrição opcional quando o dono é gestor (regra do DTO).
2. **Registrar (gestor)**: defaults Início = agora−1h, Fim = agora; chips de duração (30min · 1h · 2h · 4h · Manhã 9h–12h) recalculam retroativamente; validação "fim > início" inline; autofocus na descrição (mantido).
3. **Visualizar**: linha Projeto · Demanda + Tempo total (dados já presentes no resumo que abriu o dialog); status = mesmo seletor inline da tabela; tags editáveis (popover); aba Descrição abre em **leitura** com botão "Editar" (Quill só carrega ao editar, e só para quem pode); footer com botão contextual ▶ Iniciar / ⏸ Encerrar respeitando permissão/status.

## Critérios de aceite

- Retomar o trabalho de ontem: iniciar com 1 clique em "Usar esta descrição" + Enter (zero digitação).
- Registrar 2h retroativas: chip "2h" + descrição + Registrar (3 interações).
- Agir a partir do Visualizar sem fechar o dialog.

## NÃO implementar nesta task

- Detalhe da atividade (104).
