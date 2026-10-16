# 97 — Padrão único de formulário em dialogs: autofocus, Enter, footer e pós-criar

**Origem:** Revisão de UI/UX — achados globais G2/G17 (`docs/reviews/ui-ux/README.md`)

**Depende de:** —

**Entrega:** todos os dialogs de formulário do sistema seguem o mesmo contrato de interação: **autofocus** no primeiro campo útil, **Enter envia** (`ngSubmit`), **Ctrl+Enter** envia a partir de textareas, **Esc cancela**, footer padronizado (`Cancelar` + primário à direita, hint de atalhos à esquerda) e comportamento pós-criar único: **criar fecha + toast**; onde há cadastro em série, botão explícito **"Criar e adicionar outra"** (persiste, limpa, refoca).

> **Frontend apenas.** Task de padronização mecânica — as reestruturações de conteúdo de cada dialog ficam nas tasks da tela.

---

## Escopo

Aplicar o contrato aos dialogs existentes (lista de verificação):

- Demanda: formulário criar/editar (hoje **não fecha ao criar** — reset silencioso que parece bug), tags, membros, conexão.
- Atividade: nova atividade (dialog da listagem), iniciar/encerrar execução, registrar execução, atribuir tags.
- Ponto: justificativa (salvar sai do corpo para o footer; `ngSubmit`).
- Usuário: criar/editar, alterar senha, perfil.
- Projeto: criar/editar. Calendário: criar/editar. Tag: editar.

Para cada um: autofocus (`pAutoFocus`/`afterNextRender`) no primeiro campo vazio ou no campo de contexto; `(ngSubmit)` ligado ao botão primário (quando o botão vive no footer do `p-dialog`, fora do form, chamar o método diretamente); dica de caracteres proibidos deixa de ser permanente (só como erro); "Criar e adicionar outra" onde a análise indicou série (demanda, dia não útil, atividade).

## Critérios de aceite

- Nenhum dialog do sistema exige clique para focar o primeiro campo; Enter conclui todos os formulários de 1 coluna.
- Criar demanda fecha o dialog com toast; "Criar e adicionar outra" mantém pai/contexto e refoca o Nome.

## NÃO implementar nesta task

- Mudanças de conteúdo/estrutura dos dialogs (campos novos, disclosure) — tasks por tela.
- Guarda de alterações não salvas (spec 84 já cobre editores rich-text).
