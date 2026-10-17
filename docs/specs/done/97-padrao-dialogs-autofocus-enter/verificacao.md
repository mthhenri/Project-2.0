# Task 97 — verificação

Data: 2026-10-16. Frontend apenas.

## O que foi feito

- **`shared/directives/dialog-formulario.directive.ts`** (`p-dialog[dialogFormulario]`): autofocus no primeiro
  campo de texto vazio (senão o primeiro campo); **Enter** num `<input>` emite `dialogEnviar`; **Ctrl/Cmd+Enter**
  também a partir de `<textarea>`; `[dialogBloqueado]` ignora o atalho durante o envio; `[dialogSemAutofocus]`
  preserva o foco próprio (dialog "Registrar execução", que foca a descrição). Desliga o `focusOnShow` nativo
  do `p-dialog` (ele focava o primeiro focável e abria o calendário de um `p-datepicker`) e exclui
  `p-datepicker` do autofocus. Para dialogs que carregam dados ao abrir, espera o formulário aparecer (até 3 s).
  `focar()` (via `exportAs`) refoca após "Criar e adicionar outra".
- **`shared/components/dialog-dica-atalhos`**: dica "Enter confirma · Esc cancela" (ou "Ctrl+Enter confirma"
  com textarea) à esquerda do footer; escondida abaixo de 640 px.
- **Esc cancela**: é o `closeOnEscape` nativo do `p-dialog` (sem mudança).
- Aplicado em 21 dialogs: demanda (criar, editar, tags ×2, conexão, membros), atividade (nova, atribuir tags,
  iniciar/encerrar execução, registrar execução; detalhe: tags e iniciar execução), ponto (justificativa —
  o "Salvar justificativa" saiu do corpo para o footer), usuário (criar, editar perfil, alterar senha),
  projeto (criar, editar), calendário (criar/editar), tag (nova, editar).
- **Pós-criar**: criar demanda agora **fecha** o dialog (antes resetava em silêncio); "Criar e adicionar outra"
  em demanda (mantém pai, status, tags e membros; refoca Nome), atividade (mantém demanda, responsável, status
  e tags; refoca Nome) e dia não útil (mantém tipo e duração; limpa data e descrição).
- Dica permanente de caracteres proibidos removida dos dialogs (a mensagem de erro continua).

## Verificado ao vivo (Chromium, API + Postgres reais, `gestor.inicial`)

1920×1080: Tag nova (foco no Nome, Enter cria e fecha, hint no footer); Projeto novo (Enter cria) e editar;
Demanda nova (foco no Nome; "Criar e adicionar outra" cria A, mantém o dialog aberto, limpa e refoca; Enter
cria B e fecha; ambas listadas); Calendário (foco na Descrição, não no datepicker; "criar e adicionar outro"
limpa e foca a descrição); Usuário novo (foco no Login); Editar perfil e Alterar senha; Atividade nova;
Iniciar execução (Enter no textarea quebra linha; Ctrl+Enter envia e fecha); Registrar execução (foco na
descrição); Ponto justificar; Demanda editar (carregamento assíncrono: foco no Nome após carregar) e Tags;
Esc fecha os dialogs testados. 360×800: Nova Demanda com os três botões do footer sem overflow do dialog.
Evidências em `.artifacts/97-padrao-dialogs-autofocus-enter/` (não versionadas).

## Defeito encontrado e corrigido durante a verificação

Autofocus abria o calendário de um `p-datepicker` (foco nativo do `p-dialog` + primeiro campo) e o Esc então
fechava o calendário em vez do dialog; corrigido desligando o `focusOnShow` e excluindo datepickers do autofocus.

## Limites / pendente

- Não percorridos ao vivo: Tag editar, Atividade detalhe (tags e iniciar execução), Demanda conexão e membros,
  Projeto editar com Enter — usam a mesma diretiva e compilam; o comportamento é o do contrato.
- Calendário: "criar e adicionar outro" refoca a Descrição (não a Data, para não abrir o calendário).
- Ponto justificar: o primeiro campo vazio é "Horas cobertas"; a task 100 reestrutura esse dialog.
- Frontend sem testes automatizados (P-001): a diretiva não tem teste unitário.
- Topbar com overflow horizontal a 360 px é anterior (P-002).
- Build do frontend passa (avisos de budget pré-existentes).
