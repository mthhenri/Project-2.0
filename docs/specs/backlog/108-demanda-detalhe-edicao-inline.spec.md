# 108 — Demanda detalhe: edição inline, tags/membros no cabeçalho e conexões com busca

**Origem:** Revisão de UI/UX — print `prints/12-demanda-detalhe-dialog.png`, análise `analise-detalhada/demanda-dialogs.md`

**Depende de:** 97, 99 (undo de associações)

**Entrega:** dialog de detalhe deixa de ser somente leitura: status como dropdown-tag, título com lápis, métricas click-to-edit (estimado/previsão), **tags e membros promovidos ao cabeçalho** (popover-toggle e autocomplete — eliminam 2 abas e 2 dialogs redundantes), conexões com criação inline + autocomplete com busca, navegação interna com "← Voltar" instantâneo e empty states acionáveis.

> **Frontend apenas.** Endpoints existentes (PUT demanda, POST/DELETE membro/conexão, PUT tags).

---

## Escopo

1. **Cabeçalho**: breadcrumb clicável + "← Voltar" restaurando a demanda anterior de cache (sem refazer as ~8 chamadas); título editável (lápis, Enter salva); status-dropdown com PUT imediato; ícones de descrições com ponto de "preenchida" e tooltips completos; "Editar tudo" abre o formulário completo como fallback.
2. **Tags**: chips + "+ Tag" → popover com todos os chips em toggle, salvando na hora (o dialog "Editar Tags" morre). **Membros**: pilha de avatares + `+` → autocomplete inline (Enter adiciona, POST individual); hover → remover com toast+Desfazer; dev vê "Participar"/"Sair" (sem confirm). Sem a tag "Dev" repetida (todo membro é dev por regra).
3. **Métricas**: Estimado e Previsão click-to-edit (datepicker com atalhos +1 sem/+2 sem/fim do mês); "— definir" quando nula; Status e "Estrutural" saem do grid (já estão no cabeçalho).
4. **Conexões**: linha de criação inline (autocomplete com filtro + toggle "→ Depende de | ↔ Bidirecional" + Adicionar desabilitado sem destino; Enter confirma; erro de ciclo do backend exibido inline); itens com tooltip semântico da direção; link navega **dentro** do dialog; lixeira remove com undo.
5. **Aba Atividades**: botão "+ Nova Atividade" pré-preenchida com a demanda; "Ver todas ↗" abre `/atividade?demandaId=` sem fechar o dialog. Empty states de todas as seções com CTA.
6. **Exclusão da demanda**: mantém confirm, com texto honesto (sem "não pode ser desfeita").

## Critérios de aceite

- Marcar Concluída pelo detalhe: 2 cliques (antes 5 com GET+spinner).
- Alternar 1 tag: 2 cliques; adicionar 1 membro: ≤3.
- Adicionar conexão digitando o nome: ≤3 interações; voltar da sub-demanda: 1 clique instantâneo.

## NÃO implementar nesta task

- Formulário criar/editar (109).
