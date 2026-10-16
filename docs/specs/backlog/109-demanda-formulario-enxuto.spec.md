# 109 — Demanda: formulário criar/editar unificado, adaptativo e enxuto

**Origem:** Revisão de UI/UX — print `prints/13-demanda-nova-dialog.png`, análise `analise-detalhada/demanda-dialogs.md`

**Depende de:** 97

**Entrega:** um único componente de formulário para criar e editar demanda (mesma largura, mesmos campos — inclusive Tags/Membros na edição p/ gestor, mesmos labels/sufixos), com o caminho feliz curto (Nome + pai + estimativa + estrutural) e o resto em "Mais opções" colapsado; marcar **estrutural esconde Estimativa/Previsão** (estruturais agregam os filhos).

> **Frontend apenas.**

---

## Escopo

1. Unificar criar × editar (hoje divergem em largura 560/600, campos, sufixo "h", label do checkbox e presença de Tags/Membros).
2. Ordem: Nome (autofocus) → Demanda pai (select com busca, opções com caminho "Projeto › Estrutural", pré-preenchida em contexto) → Estimativa + Previsão (atalhos de data) → checkbox estrutural (adaptativo) → "Mais opções ▾" (Status default Planejada, Membros, Tags).
3. Dica de caracteres proibidos só quando o erro ocorre.
4. Footer: Cancelar · "Criar e adicionar outra" (mantém pai, refoca Nome) · "Criar Demanda" (fecha + toast). Enter cria; Esc com guarda se houver texto.

## Critérios de aceite

- Criação simples: abrir → digitar nome → Enter (2 interações).
- Criar estrutural não exige horas/previsão; editar oferece os mesmos campos da criação.

## NÃO implementar nesta task

- Mudanças no detalhe (108).
