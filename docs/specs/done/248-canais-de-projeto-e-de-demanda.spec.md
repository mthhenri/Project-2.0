# 248-canais-de-projeto-e-de-demanda.spec.md

> Task 3/5 da guarda-chuva [`chat-grupos.spec.md`](chat-grupos.spec.md), fase 2. Depende da [`246`](246-grupo-livre-backend.spec.md) e da [`247`](247-grupo-livre-frontend-e-desktop.spec.md).

## Objetivo

Criar **canais** de chat por projeto e por demanda, abertos sob demanda por um botão "Criar chat", com **membros derivados de `demanda_usuario`**, sem lista própria, e legíveis pela supervisão.

## Decisões da guarda-chuva (autor, 2026-10-23)

- **Criação sob demanda**, por botão "Criar chat", por qualquer pessoa com acesso ao projeto ou à demanda; **um canal por projeto ou demanda**.
- **Membros derivados** de `demanda_usuario` (fonte da verdade). Cada demanda tem o seu canal, **sem incluir as filhas**. Quem sai de `demanda_usuario` **perde o canal inteiro, inclusive o
  histórico** (por ora; alternativa em `IDEAS.md` I-020).
- **Gestor e administrador** leem como supervisores (canal sempre legível por eles) e só viram membros se escreverem. O canal é **sempre legível** pela supervisão.
- `@pessoa`, `#demanda` e `@todos` valem como no grupo livre.

## Entregáveis

1. **Modelo:** `grupo.tipo` com `PROJETO` e `DEMANDA`, `projeto_id` e `demanda_id` (já criados na 246) preenchidos, com índices únicos parciais `is_deleted = false` (um canal por projeto e por demanda);
   migration só se a 246 não tiver deixado os índices prontos (a próxima livre na hora). Canal **não** tem linha em `grupo_membro`.
2. **Regra de membros e acesso (service):**
   - **Canal de demanda:** membro = quem tem linha ativa em `demanda_usuario` daquela demanda (só ela, sem filhas). Escrever e ler exigem isso; sair de `demanda_usuario` faz o canal sumir da lista e
     recusar a leitura, **com o histórico**.
   - **Canal de projeto:** definir ao abrir a task quem é membro (ver Ponto em aberto); a base é o acesso ao projeto pelas regras de `DemandaService`.
   - **Gestor e administrador:** leem por tipo (nunca por `demanda_usuario`), sem aparecer como membro; ao escrever, passam a contar como membros (efeito sobre `@todos` e as não lidas definido
     ao abrir a task) e a mensagem do sistema registra a entrada deles.
   - A regra de acesso é **uma só**, reaproveitando a de `DemandaService` (acesso do desenvolvedor por `demanda_usuario`, do gestor por tipo), sem duplicar SQL. Aplicar `gerenciamento-de-impacto`.
3. **Criar e abrir canal:** `POST` para criar (idempotente: se já existe, devolve o existente), rota para recuperar o canal de uma demanda e de um projeto, listagem junto com as conversas do usuário.
   O nome do canal vem do nome da demanda ou do projeto (acompanha renomeação; não é editável no canal).
4. **Leituras e não lidas** por membro (`grupo_leitura`), mensagem de grupo com `grupo_id` do canal (contrato da 246); a mensagem do sistema "canal criado".
5. **Supervisão:** a regra da 214 reconhece canal como sempre supervisionável; lista e leitura pela mesma área do gestor, com auditoria e aviso aos membros atuais, um por leitor, canal e dia.
6. **Frontend:** botão **Criar chat** (ou **Abrir chat**, quando já existe) na tela da **demanda** e na do **projeto** (conferir onde cabe nos cabeçalhos atuais e usar o análogo mais próximo de ação
   secundária), que abre o popup na conversa do canal; canal na lista do popup com ícone/avatar distinto do grupo livre e o nome da demanda ou do projeto. Estados: sem acesso, canal inexistente
   (oferece criar), vazio, erro. Aviso permanente no compositor: "este chat pode ser resumido por IA" (ponto em aberto, entra junto com a 249).
7. **Perda de acesso em tempo real:** quando `demanda_usuario` muda (usuário removido da demanda), o canal some da lista dele na próxima releitura e ao reconectar; decidir se há evento próprio
   (proposta: `SINCRONIZAR` da lista a partir do ponto que altera `demanda_usuario`).
8. **Testes:** service (membros por `demanda_usuario`, perda do canal ao sair, gestor lê sem ser membro, gestor passa a membro ao escrever, canal único), repositories (integração),
   contrato do armazenamento (cenário de canal), componente do botão e do popup. Documentação: `docs/SYSTEM.SPEC.md`, `docs/SCHEMA.md`, `CONTEXT.md`, `HISTORY.md`, `MEMORY.md`.

## Critérios de Aceite

- Testes de `shared`, `backend` (unitários e integração) e `frontend`, builds de backend e frontend e `npm run repo:verificar` passam.
- **Ao vivo** (desenvolvedor com e sem `demanda_usuario`, gestor e administrador; `1920×1080`, `1366×768` e `1080×1920`, claro e escuro): "Criar chat" cria um canal por demanda; o desenvolvedor
  da demanda lê e escreve; o de fora recebe 403/não vê; tirar o desenvolvedor de `demanda_usuario` faz o canal e o histórico sumirem para ele; o gestor lê sem ser membro e ao escrever vira
  membro; a demanda filha tem canal próprio; o canal aparece na área de supervisão com auditoria e aviso.

## Fora de Escopo

- Resumo com IA (249), fixar e busca (250); canal que inclua as sub-demandas; manter histórico para quem saiu da demanda (I-020); remover ou adicionar membros à mão no canal.

## Dependências

`246` e `247`. Fontes: `chat-grupos.spec.md`, `modelagem.md` §2 e §4, `DemandaService` (regra de acesso), `docs/SYSTEM.SPEC.md` §14.

## Riscos e Mitigação

- **Acesso duplicado:** duas implementações da regra de acesso a demanda divergem com o tempo; reaproveitar a de `DemandaService`.
- **Histórico some de vez:** a decisão do autor é perder o canal inteiro; documentar na tela (aviso discreto) para ninguém estranhar.
- **Gestor que escreve:** vira membro e entra em `@todos`; efeito colateral confirmado ao abrir a task.

## Pontos em aberto (padrão proposto; autor confirma ao abrir a task)

- Quem é membro do canal de **projeto**: padrão = quem tem linha em `demanda_usuario` em ao menos uma demanda do projeto (mesma regra de visibilidade do desenvolvedor sobre projetos).
- Efeito de o gestor "virar membro ao escrever" sobre `@todos` e não lidas: padrão = entra em ambos a partir da primeira mensagem.
- Onde ficam os botões nas telas de demanda e de projeto.
