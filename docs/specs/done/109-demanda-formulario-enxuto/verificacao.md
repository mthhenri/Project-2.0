# Task 109 — verificação

Data: 2026-10-16. Frontend apenas.

**Análogo escolhido:** o formulário de criação anterior (shell, campos, chips de tag) e o padrão de dialog da task 97
(`dialogFormulario`: autofocus, Enter envia).

## O que foi feito

- **Um só componente** para criar e editar: `app-demanda-formulario-dialog` ganhou `demandaId` (modo edição) e
  `demandaAlterada`; `app-demanda-edicao-dialog` foi removido e seus 3 usos (detalhe ×2, painel da árvore) passaram
  ao formulário unificado. Mesma largura (660 px), mesmos campos e labels ("Estimativa (horas|dias)" com o sufixo
  ` h` em ambos), e Tags/Membros também na edição para o gestor (grava só o diff: PUT `/tag`, POST/DELETE de membro).
- **Ordem do caminho feliz:** Nome (autofocus) → Demanda pai (select com busca pelo caminho "A › B", pré-preenchida
  no contexto) → Estimativa + Previsão (atalhos "+1 sem", "+2 sem", "Fim do mês") → checkbox estrutural → "Mais
  opções ▾" (Status — padrão Planejada —, Membros, Tags), recolhido por padrão.
- **Estrutural esconde Estimativa e Previsão** (com uma dica de uma linha). Criar estrutural manda `horasEstimadas: 0`;
  editar um estrutural não envia esses campos (os valores existentes ficam intactos).
- A dica de caracteres proibidos aparece só no erro (já era assim; a diretiva de bloqueio segue removendo-os).
- **Footer:** Cancelar · "Criar e adicionar outra" (mantém pai/status/tags/membros e refoca o Nome) · "Criar Demanda"
  (criação) ou "Salvar" (edição). Enter envia (diretiva da 97). **Esc com guarda:** com texto (ou alteração, na edição)
  abre "Descartar alterações?"; sem nada a perder fecha direto. Overlays abertos (select, calendário) tratam o Esc antes.
- `utils/demanda-datas.util.ts` concentra os atalhos de data e a conversão `YYYY-MM-DD` (usado pelo formulário e pelas
  métricas do detalhe).

## Verificação ao vivo (Chromium, API real; gestor)

- Criação simples: "Nova Demanda" → digitar → Enter = 1 `POST /demanda` e dialog fechado (2 interações).
- Campos na ordem esperada; estrutural esconde Estimativa/Previsão e mostra a dica; "Mais opções" revela Status,
  Membros e Tags.
- Esc com "Rascunho": confirm "Descartar alterações?"; "Continuar editando" mantém o texto; "Descartar" fecha. Esc sem
  texto fecha direto. Na edição a mesma guarda aparece e o detalhe por trás permanece aberto.
- Sub-demanda pelo `+` da árvore: pai pré-preenchido; "Criar e adicionar outra" limpa o nome, mantém o pai e foca o
  Nome; Enter cria e fecha.
- Edição (pelo "Editar tudo" do detalhe): mesmos campos, valores carregados (estimativa 8 h, pai "Módulo Integração › Fase 1
  — Gemini"), "Mais opções" com status, tags (API, Backend) e membros; alterar nome/estimativa/tag + Enter = `PUT /demanda/14` e
  `PUT /demanda/14/tag`, o detalhe mostra "Estimado 10h" e as tags novas. Editar um estrutural mostra só Nome, Pai e o
  checkbox.
- 1920×1080, 1366×768 e 1080×1920: sem overflow; no notebook o corpo rola quando "Mais opções" está aberto. Capturas em
  `.artifacts/109-demanda-formulario-enxuto/`.

## Achados da verificação

- Os botões do footer quebravam em duas linhas a 560/600 px: largura única de 660 px e `whitespace-nowrap`.

## Limites / pendente

- Criar e adicionar outra mantém também tags/membros escolhidos (comportamento anterior preservado).
- O erro "Nome é obrigatório" aparece assim que o campo perde o foco vazio (por exemplo, ao abrir "Mais opções").
- Não é possível mover uma demanda de volta para a raiz na edição (`demandaPaiId` nulo não é enviado): limitação do
  contrato de alteração, anterior a esta task.
- Membros na edição por diff de POST/DELETE individuais: a regra do backend que impede remover o último membro
  continuaria barrando o salvamento (erro via toast); não exercitado nesta passada.
- Frontend sem testes automatizados (P-001).
