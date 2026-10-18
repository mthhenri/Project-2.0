# Task 143 — Prioridade de atividade nas telas e cor pelo administrador

> Origem: guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 6. Seção "Prioridade de atividades".

## Objetivo

Mostrar, escolher e ordenar a prioridade nas telas de atividade e deixar o administrador ajustar a cor de cada prioridade.

## Entregáveis

1. Selo colorido da prioridade (a cor vem da API, com contraste legível nos temas claro e escuro) na listagem de atividades, no detalhe, no dialog de visualização e onde a atividade aparecer resumida (`npm run impacto -- <arquivo>` para achar os consumidores).
2. Seletor de prioridade na criação e na edição de atividade (padrão INDEFINIDA); a listagem ordena por prioridade por padrão, sem remover as ordenações que já existem.
3. Administrador edita a cor de cada prioridade numa seção das Configurações da IA ("Prioridades"), com pré-visualização do selo; os demais usuários só veem o selo.
4. Registrar o análogo visual (listagem de atividades atual e a aba Provedor e modelos) e conferir o gate visual.

## Critérios de Aceite

- `1920×1080`, `1366×768` e `1080×1920`, temas claro e escuro, estados vazio, carregando, cheio e erro (análogo registrado na task).
- Trocar a cor de uma prioridade reflete nas telas sem recarregar o cache da API; gestor e desenvolvedor não veem a seção.
- Build do `frontend`; sem testes e sem lint (P-001), declarado.

## Fora de Escopo

- Cartões de proposta do chat (145).
- Criar ou renomear prioridades.

## Dependências

`142`.
