# Verificação parcial — task 264

Os avisos azuis individuais e de grupo definem localmente os tokens de hover e de clique dos botões secundários de texto do PrimeNG. A busca de impacto apontou `proposta-cartao` como consumidor da linha e a página de chat como consumidora do grupo; nenhuma cor ou botão global foi alterado. O análogo é o próprio aviso azul anterior.

A aplicação real foi levantada em portas separadas, sem interromper o stack existente. Com uma proposta já feita pela IA, o botão Ver detalhes foi observado em hover nos temas claro e escuro: no claro o fundo passou de aproximadamente RGB (231, 240, 254) para (212, 227, 253), e no escuro usou azul mais intenso. O cartão foi inspecionado também em 1920×1080, 1366×768 e 1080×1920. O build do frontend passou com os avisos de orçamento e CommonJS já conhecidos; a suíte do frontend passou 2.290/2.290.

**Pendente:** o cenário disponível já tinha ultrapassado o prazo de desfazer, então não foi possível observar ao vivo o hover de Desfazer nem o aviso de grupo misto; ambos usam os mesmos tokens locais. Os estados vazio, carregando e erro não foram percorridos. A task permanece ativa até a verificação visual obrigatória ficar completa. O projeto não possui lint (P-001).
