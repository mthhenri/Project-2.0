# Verificação parcial — task 264

Os avisos azuis individuais e de grupo definem localmente os tokens de hover e de clique dos botões secundários de texto do PrimeNG. A busca de impacto apontou `proposta-cartao` como consumidor da linha e a página de chat como consumidora do grupo; nenhuma cor ou botão global foi alterado. O análogo é o próprio aviso azul anterior.

A aplicação real foi levantada em portas separadas, sem interromper o stack existente. Com uma proposta já feita pela IA, o botão Ver detalhes foi observado em hover nos temas claro e escuro: no claro o fundo passou de aproximadamente RGB (231, 240, 254) para (212, 227, 253), e no escuro usou azul mais intenso. O cartão foi inspecionado também em 1920×1080, 1366×768 e 1080×1920. O build do frontend passou com os avisos de orçamento e CommonJS já conhecidos; a suíte do frontend passou 2.290/2.290.

Em 2026-10-29 foi criado um intermediário local temporário, sem gravar propostas ou mensagens, que forneceu ao frontend uma proposta feita pela IA dentro do prazo e um grupo misto com uma proposta feita e outra pendente. O hover de Desfazer foi observado nos avisos individual e de grupo nos temas claro e escuro; enquanto pressionados, os dois controles permaneceram azuis nos dois temas. O grupo foi inspecionado em 1920×1080, 1366×768 e 1080×1920; o aviso individual e Ver detalhes já haviam sido inspecionados nos três tamanhos. Ações de proposta foram bloqueadas no cenário fictício. Foram observados conversa vazia e cartões em carregamento e erro, com opção de tentar novamente. A verificação visual cobre a apresentação, não a execução ou o desfazer de propostas reais.

Revisão do diff: os dois tokens são locais aos avisos, usam a cor primária do tema e não alteram botões globais. O projeto não possui lint (P-001).
