# chat-grupos.spec.md

> Guarda-chuva dos **grupos** no chat entre colaboradores. Origem: conversa com o autor em 2026-10-23. **Não é uma task
> implementável**: registra as decisões e os pontos em aberto; cada task ganha a sua spec (a partir da **219**, o número é decidido na
> hora) antes de ser implementada. Estende a guarda-chuva `chat-colaboradores.spec.md` (conversa um a um, tasks 205–218), que
> tratava grupos como fora de escopo. A modelagem está em [`chat-grupos/modelagem.md`](chat-grupos/modelagem.md).

## Objetivo

Colaboradores conversam em **grupo** dentro do Project e do Project Desktop, com o mesmo popup, compositor e avisos da conversa um a um.
Há três tipos: **grupo livre** entre pessoas, **canal de projeto** e **canal de demanda**. Nos canais, a IA pode **resumir** a conversa e
propor gravar o resumo na documentação da demanda.

## Decisões (autor, 2026-10-23)

### Grupo livre

1. **Membros:** qualquer membro adiciona pessoas; **ninguém remove ninguém**, cada um só sai por conta própria. Quem saiu pode ser
   readicionado. O novo membro **vê todo o histórico**, mas a contagem de não lidas começa na entrada.
2. **Nome e foto:** qualquer membro renomeia. A foto é a do perfil: cor do tema e primeira letra de cada palavra do nome (reaproveitar o
   avatar existente; confirmar o componente base na spec).
3. **Fim:** o último membro que sai fecha o grupo; tudo é soft delete e o histórico permanece.
4. **Gestor e administrador** podem entrar. Quando entra um, o grupo passa a ser **privado** para a supervisão, com mensagem do sistema
   avisando. A elegibilidade é decidida na hora da leitura, pelos membros atuais.

### Canais

5. **Criação sob demanda**, por botão "Criar chat", por qualquer pessoa com acesso ao projeto ou à demanda; um canal por projeto ou demanda.
6. **Membros derivados** de `demanda_usuario` (fonte da verdade), sem lista própria. Cada demanda tem o seu canal, sem incluir as filhas.
   Quem sai de `demanda_usuario` **perde o canal inteiro, inclusive o histórico** (decisão por ora; alternativa em `IDEAS.md` I-020).
7. **Gestor e administrador** leem como supervisor (canal sempre legível por eles) e só viram membros se escreverem.

### Supervisão e mensagens

8. Grupo livre **sem** gestor ou administrador entre os membros é legível pela supervisão, com o mesmo aviso aos membros e a mesma
   auditoria da task 214. Canal de projeto ou demanda é sempre legível.
9. `@pessoa` e `#demanda` valem como hoje; **qualquer membro** pode usar `@todos`.
10. **Fixar mensagem** no grupo ou canal, **busca** dentro do grupo (estende a da task 208) e comando **`/resumir`** no compositor.
11. O **seletor do Project Desktop** passa a listar pessoas e grupos.

### Resumo com a IA

12. Ação explícita de um membro. **Período livre**, com a data do último resumo à vista. O servidor pega **todas** as mensagens do
    período, resume **em blocos** e manda os resumos dos blocos para fechar num **único** texto, sem limite visível de mensagens; antes
    de rodar mostra uma **estimativa** e pede confirmação. O texto termina com uma linha dizendo que **foi gerado por IA** (no espírito
    do trailer de coautoria dos commits).
    **Sem nomes:** o resumo não cita os autores (opção de citar em `IDEAS.md` I-021).
13. **Consentimento:** aviso a quem aciona de que as mensagens vão ao provedor de IA configurado. Os demais membros **não** são
    avisados por mensagem (decisão do autor: só um aviso).
14. **Código:** a cada resumo, escolher se envia código; se não, os blocos viram `[trecho de código omitido]` **antes** de sair do
    servidor (usa `contem_codigo`).
15. **Onde grava:** no campo `demanda.documentacao`, **acrescentando** ao fim com data e período, por **proposta** (tasks 145/159) que o
    usuário revisa e confirma; quem aciona precisa poder editar a demanda. Canal de demanda → a própria demanda; canal de projeto → o
    usuário escolhe uma **demanda de destino**. Grupo livre → só gera o texto para copiar.
16. O custo do resumo entra na aba **Custos** (task 202), atribuído a quem acionou. Ao gravar, o canal recebe uma **mensagem do sistema**
    com cartão clicável da demanda.

## Pontos em aberto (padrão proposto; confirmar na spec de cada task)

- Quem entra num grupo que já tinha histórico lido pela supervisão: padrão = o estado atual vale (grupo com gestor fica privado).
- Limite de membros do grupo livre: padrão 50.
- Aviso permanente no compositor de canal: "este chat pode ser resumido por IA", por causa de dados sensíveis que não são código.

## Fora de Escopo

- Resumo automático ao concluir a demanda; remover membro de grupo; anexos e imagens; chamadas.
- Canal que inclua as sub-demandas.

## Fases sugeridas (numeração decidida na hora, a partir da 219)

1. **Grupo livre:** modelo, membros, nome e foto, sair, supervisão, popup, avisos e seletor do Desktop.
2. **Canais** de projeto e demanda.
3. **Resumo com a IA** (`/resumir`, etapas, código, proposta e custos).
4. **Fixar mensagem** e **busca** no grupo.

Antes de alterar o `shared` e o executor de demanda, aplicar a skill `gerenciamento-de-impacto` (`npm run impacto`). A task **214**
(supervisão) deve já aceitar N participantes na regra de elegibilidade, para evitar retrabalho.
