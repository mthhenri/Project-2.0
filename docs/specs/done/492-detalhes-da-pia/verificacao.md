# Verificação — task 492

Data: 2026-11-25. Branch `claude/stoic-shannon-c8w7xi`, stack isolado com IA de mentira.

- Frontend 2994 testes (com `NODE_OPTIONS=--no-experimental-webstorage`, Node 26), backend 1891, shared 369, 0 falha;
  build e `npm run lint:tudo` limpos (avisos de orçamento já existentes).
- Texto reconhecido, nos 5 formatos e 2 temas: 4 osciladores, avatar balançando, campo vazio, nenhum envio ao servidor,
  nada na tela, sem erro de página.
- Manhã (relógio fixado): 04:59 e 08:01 não tocam; 05:00 e 08:00 tocam; a segunda abertura do dia não toca.
- 29/03 toca uma vez; a segunda abertura e o dia 30/03 não.
- Áudio suspenso: nada antes do clique, toca no primeiro, não repete no segundo.

## Limites

- O navegador de teste libera o áudio mesmo com a política de bloqueio: o estado suspenso foi simulado.
- O som não foi ouvido pelo agente (o volume é julgamento do autor). Não verificado no Project Desktop.
- Com a conversa só com mensagem do sistema não há avatar na tela: toca sem balanço.
