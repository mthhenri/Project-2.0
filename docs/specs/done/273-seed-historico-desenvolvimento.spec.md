# 273 — Seed de histórico de desenvolvimento

## Objetivo
Criar um cenário fictício reproduzível em SQL para desenvolvimento, sem alterar o seed mínimo existente nem os dados do autor.

## Entregáveis
1. SQL separado das migrations com três projetos, seis desenvolvedores do Mateusverso, demandas hierárquicas com descrições, conexões acíclicas, atividades e execuções encerradas dos últimos 90 dias.
2. Executor manual que exige APP_AMBIENTE=development, recusa NODE_ENV=production e DB_SSL=true, e passa a indicação de ambiente à transação SQL. Preservar gestor inicial e recusar colisões parciais; repetição completa não duplica dados.
3. Instruções de execução e testes de segurança e integração. Arquivos versionáveis, sem commit nesta tarefa.

## Critérios de Aceite
Testes de bloqueio de ambiente; execução SQL em banco de teste com contagens, idempotência, ausência de sobreposição, ausência de execuções abertas e preservação do gestor; build backend e repo:verificar. Registrar limites se o banco estiver indisponível.

## Fora de Escopo
UI, migrations, apagar/resetar dados, chats fictícios, execução automática no startup, commit e push.

## Dependências
SYSTEM.SPEC.md §9 e §14, SCHEMA.md e seed mínimo da task 162.
