# Verificação — 295

Em 2026-10-31, stack de desenvolvimento, gestor, 1366×768, tema claro.

- **Testes:** frontend (usuário) 108 em 13 arquivos; shared 298; backend 1590 unitários e 367 de integração (o repository troca o login); builds de frontend e backend ok; `repo:verificar` ok. Sem lint (P-001).
- **Ao vivo:** clicar na linha de "Mateus Caranguejo" não abriu dialog (7 linhas, nenhum diálogo); o lápis abriu o Editar com nome, cargo, **login** e horas diárias, o tipo na linha de baixo e nenhum switch de status; trocar o login para `dev.mateus.caranguejo2` salvou ("Usuário alterado com sucesso") e a tabela mostrou o novo; tentar `gestor.inicial` foi recusado ("Login já está em uso") com o dialog aberto; o login original foi restaurado. O criar, digitando "Matheus Caranguejo", preencheu login `matheus.caranguejo` e senha `Dev@MCaranguejo!`; o Alterar Senha abriu com `Dev@MCaranguejo!`; nenhum dos dois tem "Gerar outra senha".
- **Limites:** 1920×1080, 1080×1920 e o tema escuro não foram revisitados (só mudou a disposição de campos do dialog); desenvolvedor editando o próprio perfil só por teste; o login do próprio usuário trocado não renova o token (ver Fora de Escopo).
