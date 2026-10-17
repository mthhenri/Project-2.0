# Task 133 — Tela de Configurações da IA: aba de prompts

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 4 (5 de 5).

## Objetivo

Completar a tela de Configurações da IA (task 132) com a aba **Prompts**: o administrador escolhe um tipo de
prompt, edita em rascunho, ativa, vê o histórico e restaura o padrão, usando a API da task 131.

## Entregáveis

### 1. Aba "Prompts" (frontend)

- Lista dos 7 tipos (`CONVERSA`, `CHECKIN`, `DESCRICAO_EXECUCAO`, `PAD`, `PRIORIDADE`, `ENTREVISTA_DEMANDA`,
  `CONEXAO_DEMANDA`) com nome legível, versão ativa e se há rascunho. Escolher um tipo abre o painel dele.
- **Painel do tipo:** o texto da versão ativa em leitura (no `app-markdown-visualizador`; o prompt é Markdown, como o resto do sistema), o
  **rascunho** editável no `app-markdown-editor` e as ações "Salvar rascunho" (botão explícito, com aviso ao
  sair com mudança pendente) e "Ativar rascunho".
- **Histórico** do tipo (versão, status, autor, data) com "ver" e "usar como base do rascunho".
- **Restaurar padrão** (confirmação, `p-confirmdialog` do projeto): reativa a versão 1, a ativa anterior
  fica no histórico.
- Descartar rascunho, com o mesmo padrão de Desfazer das telas de exclusão.
- Aviso permanente de que o prompt vale para **todos os usuários** assim que é ativado.

### 2. Documentação

- `docs/SYSTEM.SPEC.md` (§ de telas) e `docs/context/`.

## Decisões tomadas pelo autor

1. **Editor do prompt:** o `app-markdown-editor`, porque tudo no sistema é Markdown.
2. **Salvar o rascunho** por botão explícito (efeito global, gravação deliberada).
3. **"Testar antes de salvar":** desejado, mas precisa do chat (bloco 5). A aba reserva o lugar do botão,
   desabilitado com a explicação, até essa task existir.

## Critérios de Aceite

- Para um tipo: editar o rascunho, salvar, ativar, ver a versão ativa mudar e a anterior no histórico;
  restaurar o padrão volta ao texto da versão 1; descartar o rascunho (e o Desfazer) funciona.
- Gestor e desenvolvedor não chegam à aba (a rota já os recusa, task 129); a API recusa chamadas diretas.
- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio e erro;
  análogo registrado.
- Testes e builds passam; frontend sem testes e sem lint declarado.

## Fora de Escopo

- Testar o prompt contra narrativas (task do bloco 5), variáveis e modelos de prompt por contexto.
- Comparação lado a lado de versões (diff).

## Dependências

Depende da **131** (API) e da **132** (a tela e as abas). Fecha o bloco 4.
