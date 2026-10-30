# Verificação — task 268

O teste reproduziu o valor anterior no formulário depois da transação do editor; após a mudança, confirmação imediata por Ctrl+Enter recebe o texto novo. Outro teste confere que um valor externo não emite alteração extra nem marca o controle como editado. Os 22 testes do editor e a suíte do frontend (2.296 testes em 185 arquivos) passaram. O build passou com avisos de orçamento e CommonJS. O projeto não tem lint (P-001).

Em 2026-10-30 a aplicação real foi conferida em descrições de Atividades e Demandas, painel de demandas do projeto, Documentações, documento de plano, prompts e pad. Uma demanda e atividade temporárias permitiram salvar texto e confirmar seu retorno; foram excluídas logicamente ao fim. Edições de inspeção nos demais usos foram desfeitas ou descartadas. O editor e a tabela foram inspecionados nos tamanhos 1920×1080, 1366×768 e 1080×1920, usando a própria apresentação existente como análogo. A confirmação com intervalo inferior a 200 ms é comprovada pelo teste de componente; a interação manual não mede esse intervalo.

## Impacto do editor compartilhado

Busca: `npm run impacto -- frontend/src/app/shared/components/markdown-editor/markdown-editor.component.ts`, complementada pelos seletores em templates. A correção da sincronização cobre todos os usos; não muda o contrato nem o formato do Markdown.

| Consumidor | Classificação e verificação |
|---|---|
| Atividades — descrição da demanda | Pedido; salvo e lido em registro temporário. |
| Demandas — `demanda-descricao-dialog` | Acompanha; texto salvo na demanda temporária. |
| Painel de demandas — `demanda-arvore-painel` | Acompanha; editor aberto, alteração desfeita e cancelada. |
| Documentações — `documentacao-demanda` | Acompanha; edição marcou alterações e descarte restaurou o valor. |
| Plano do chat — `plano-documento` | Acompanha; edição marcou alterações e desfazer restaurou o estado gravado. |
| Prompts — `prompts-aba` | Acompanha; editor aberto, edição desfeita sem salvar rascunho. |
| Anotações — `pad-painel`, inclusive usos no chat e diálogo de usuário | Acompanha; pad aberto e edição desfeita. A suíte cobre os componentes e o serviço de anotações. |

O editor atualiza os controles a cada transação; o pad mantém seu próprio agendamento de gravação, e plano, Documentações e prompts mantêm suas ações de gravação existentes. A atualização externa é protegida contra emissão de volta ao formulário.
