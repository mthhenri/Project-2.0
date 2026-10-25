# 247-grupo-livre-frontend-e-desktop.spec.md

> Task 2/5 da guarda-chuva [`chat-grupos.spec.md`](chat-grupos.spec.md), fase 1 (lado do cliente). Depende da [`246`](246-grupo-livre-backend.spec.md). Altera a janela do Project Desktop
> entregue na [`213`](../done/213-mensagem-direta-project-desktop.spec.md) (em `done/`): a alteração é task nova, como a modelagem previu.

## Objetivo

Levar o grupo livre à interface: no **popup** do chat (lista e conversa de grupo, criar, renomear, adicionar, sair), com **avisos** e `@todos`, e no **seletor do Project Desktop**, que passa a
listar pessoas e grupos.

## Entregáveis

1. **Lista do popup** (`mensagem-direta-lista`): conversas e grupos juntos, ordenados pela última mensagem, com o avatar do grupo, nome, prévia, não lidas e silenciada; busca pelos dois.
   Estado vazio e de carga como hoje. Análogo aprovado: o popup atual (210).
2. **Avatar do grupo:** reaproveita `mensagem-direta-avatar` (cor do tema e primeira letra de cada palavra do nome). Confirmar na task se o componente aceita um nome de grupo sem mudar o uso
   atual; se precisar mudar, aplicar `gerenciamento-de-impacto` nele.
3. **Conversa de grupo** (`mensagem-direta-conversa`): cabeçalho com o nome, o número de membros e o menu (renomear, ver membros, adicionar pessoas, silenciar, sair); balões com o **nome do autor**
   (no um a um não aparece); mensagens do sistema como linha central; "Lida" **não** se aplica ao grupo (decidir: sem indicador de leitura por pessoa, só o contador de não lidas de quem lê). Cartões
   `#demanda`, bloco de código copiável e demais recursos do compositor (211, 216, 218) valem sem mudança.
4. **Criar grupo:** fluxo no popup (nome e seleção de pessoas a partir de `GET /mensagem-direta/pessoas`); **adicionar membro** a grupo existente; **renomear**; **sair** com confirmação
   (aviso de que o grupo fecha se for o último). Ver os membros mostra quem saiu? Padrão: só membros atuais.
5. **`@todos`:** o menu de menção do compositor (211) oferece `@todos` só no grupo; o aviso (212) chega a todos os membros ativos, respeitando silêncio e preferências de cada um.
6. **Avisos** (212): grupo entra no contador total do botão do topbar, na notificação (com o nome do grupo e do autor), no silêncio por conversa e no som; mesma regra `decidirAviso`.
7. **Aviso permanente de privacidade:** o texto do popup passa a refletir grupos ("Gestores e administradores podem ler as conversas entre desenvolvedores e os grupos sem gestor"),
   texto final a confirmar com o autor.
8. **Seletor do Project Desktop:** a janela `/chat-popup` (`ChatPopupPage`) e o seletor "Para" do atalho listam **pessoas e grupos**; escolher um grupo semeia o rascunho de código nele.
   O código do Desktop (`desktop/`) muda só se a ponte ou a política exigirem (o seletor é do front); se mudar, nova versão do executável e `desktop/README.md`, e a verificação de versão
   da 198 avisa quem estiver atrasado.
9. **Estado e eventos:** `MensagemDiretaEstadoService` aplica os eventos de grupo (mensagem, sincronizar, entrada e saída) sem duplicar; reconexão relê lista e conversa aberta como hoje.
   Lógica pura nova em `utils/` com teste.
10. **Testes:** unitários da lógica pura; de componente (Vitest) para lista mista, conversa de grupo, criar, adicionar, renomear, sair, `@todos`, estados vazio, carregando, erro e sem conexão;
    do Desktop se mudar. Documentação: `docs/SYSTEM.SPEC.md`, `CONTEXT.md`, `HISTORY.md`, `MEMORY.md`.

## Critérios de Aceite

- `npm run test --workspace=frontend`, `npm run build --workspace=frontend` e, se mudou, `npm run test --workspace=desktop` passam; `npm run repo:verificar` passa.
- **Ao vivo, três usuários em janelas diferentes** (`1920×1080`, `1366×768` e `1080×1920`, claro e escuro): criar grupo; todos recebem em tempo real; `@todos` avisa os três; um membro silencia e
  não é avisado; renomear aparece para todos; sair tira o grupo da lista; readicionado, volta a ver o histórico; a conversa um a um segue idêntica.
- **Desktop** (Electron real): o seletor mostra pessoas e grupos; código copiado em outro programa vai para o grupo escolhido.
- Comparado com o popup atual (análogo aprovado) e, para o cabeçalho e o menu, com o chat da IA, antes de apresentar ao autor.
- Sem `ngModel`, `innerHTML`, `title` nem `style=""` inline; tooltip só `pTooltip`; classes BEM em português.

## Fora de Escopo

- Canais de projeto e de demanda (248), resumo com IA (249), fixar e busca no grupo (250). Foto própria enviada para o grupo; remover membro; anexos.
- Supervisão (tela do gestor para grupos): a tela da 214 passa a listar grupos pelo contrato da 246; ajuste de apresentação só se a 246 não o tiver coberto (decidir ao abrir; se necessário,
  entra aqui como item).

## Dependências

`246`. Fontes: `chat-grupos.spec.md`, mockups do popup da guarda-chuva `chat-colaboradores`, tasks 210, 211, 212 e 213.

## Riscos e Mitigação

- **Popup já extenso:** `mensagem-direta-conversa` e o estado têm muita responsabilidade; avaliar extrair a conversa de grupo em componente próprio em vez de ramificar por `if`, e registrar a
  decisão no fecho.
- **Contador de não lidas duplicado:** o total do topbar soma conversas e grupos uma vez; coberto por teste.
- **Desktop desatualizado:** o seletor novo é do front, mas depende do contrato de grupo; um Desktop antigo continua funcional, só sem grupos se a política dele filtrar; conferir.

## Pontos em aberto (padrão proposto; autor confirma ao abrir a task)

- Indicador de leitura no grupo: padrão = nenhum por pessoa.
- Lista de membros mostra quem já saiu: padrão = não.
- Texto do aviso de privacidade.
