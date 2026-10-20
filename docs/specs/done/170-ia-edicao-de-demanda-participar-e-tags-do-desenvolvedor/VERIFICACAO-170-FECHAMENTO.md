# Verificação ao vivo — fecho da task 170 (2026-10-19)

Segunda rodada da verificação, depois da correção do P-019 (`459e8d9`). Conversa real com a IA (chave do ambiente de desenvolvimento), backend na `:3000`,
frontend na `:4200`, banco de dev conferido por SQL depois de cada Confirmar e de cada Desfazer. A primeira rodada está em `VERIFICACAO-167-A-170.md`.

## Montagem e limpeza

- Conta `dev.teste` (desenvolvedor). Para os cartões do gestor ela foi **promovida a gestor no banco de dev, com autorização do autor, e devolvida a desenvolvedor** no fim
  (`tipo_usuario_id` 1 → 2 → 1; conferido por SQL).
- Dados plantados: uma demanda "Integracao com ERP" sem membros (por SQL, sob "Relatórios"), para o desenvolvedor; e, pela API do gestor, duas demandas de estrutura
  ("Estrutura Verif Alfa" e "Estrutura Verif Beta") e uma de trabalho ("Trabalho Verif", com documentação inicial) sob a Alfa. Todas excluídas por soft delete no fim;
  a contagem de demandas ativas voltou a 7.
- A IA já estava ligada (configuração v21) e foi mantida.

## Resultado

| Critério da spec | Resultado |
|---|---|
| Desenvolvedor: "quero participar da demanda X" propõe entrar | **Conferido (era o P-019).** Pelo **nome** ("Integracao com ERP"), a IA achou a demanda ("Relatórios > Integracao com ERP. Projeto Demo") e gerou o cartão "Atribuir membro". Confirmar gravou a linha em `demanda_usuario` (usuário 3). |
| Desenvolvedor: "sai da demanda X" | Conferido: a IA recusou por ser o **único membro** ("o sistema não permite remover o último membro"). O **Desfazer** da entrada também foi recusado pela mesma regra (`400 Não é possível remover o último membro da demanda`). |
| Gestor ou membro: "acrescenta na documentação da X" gera cartão; confirmar mantém o anterior e acrescenta | Conferido: cartão "Acrescenta à documentação" com o texto; depois de Confirmar a documentação ficou `Texto inicial…\n\nSegunda parte…`. |
| Desfazer devolve o anterior | Conferido: `POST /proposta-ia/28/desfazer` devolveu a documentação ao texto inicial. |
| Gestor: "move a demanda X para dentro da Y" gera cartão "Pai: A → B" | Conferido: cartão "Pai: Estrutura Verif Alfa → Estrutura Verif Beta"; Confirmar mudou `demanda_pai_id` de 17 para 18; Desfazer (`/proposta-ia/29/desfazer`) voltou a 17. |
| Desenvolvedor marca tag na própria atividade; tentar em demanda é recusado | Primeira rodada (tag na própria atividade). A regra de tag em demanda do desenvolvedor mudou depois por decisão do autor (P-011): ele passa a poder nas demandas de que é membro, e o código e os testes seguem essa decisão. Não repetido ao vivo. |
| Cartões em `1920×1080`, `1366×768` e `1080×1920`, claro e escuro | Conferido para os cartões "Atribuir membro" (desenvolvedor), "Acrescenta à documentação" e "Pai: A → B" (gestor): 1366×768 por captura nos dois temas e os três viewports por medida do DOM em ambos os temas (sem rolagem horizontal, cartão dentro da tela, nenhum elemento cortado; 726 px em 1366 e 1920, 546 px em 1080). Contraste: texto `rgb(51,65,85)` sobre branco no claro e branco sobre `rgb(24,24,27)` no escuro. |

## Comportamentos do modelo observados (sem item próprio)

- Na primeira tentativa com a demanda recém-criada, a IA respondeu que não achava "Trabalho Verif" (reaproveitou a lista antiga da conversa); depois de pedir
  para consultar de novo, achou e gerou o cartão. É a mesma observação da primeira rodada.
- Um texto da IA veio com a frase "Encontrei a demanda … Confirme no cartão para gravar." repetida; é saída do modelo, sem efeito no cartão.
- A IA corrigiu sozinha, na mensagem do mover, uma afirmação anterior dela sobre a documentação ("só aparece como gravada depois da confirmação").

## Limites

- As capturas dos viewports grandes saem cortadas pelo painel do navegador; por isso a conferência foi por medida do DOM.
- Não foi exercitada ao vivo a recusa de mover para dentro de uma filha (ciclo) nem a tag em demanda pelo desenvolvedor; ambas têm teste de unidade.
- Sem lint no projeto (P-001); nenhum código de produção foi alterado nesta rodada.
