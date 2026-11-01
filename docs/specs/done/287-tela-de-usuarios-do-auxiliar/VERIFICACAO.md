# Verificação ao vivo — tasks 286 e 287 (tipo Auxiliar)

**Ambiente (isolado, para não tocar no stack do autor):** banco `project20_verify` (migrations 0001–0074), backend na porta 3001 (`CHAT_ARMAZENAMENTO=postgres`) e `ng serve` na 4201 com proxy para a 3001, navegador embutido do app. O cenário foi montado por API como gestor (projeto, pasta, demandas, atividades, uma execução do desenvolvedor em andamento) com um Auxiliar, dois desenvolvedores e o gestor inicial. Scripts e logs em `.artifacts/286-287-auxiliar/` (ignorada pelo Git).

## A matriz contra a API real, como Auxiliar

Permitido (2xx): listar usuários (seletores), ponto de todos, controle de horas, execuções de todos, criar tag, restaurar e alterar a atividade de outro, mudar o status da demanda de outro, atribuir membro a demanda de outro, registrar execução na atividade de outro, criar demanda raiz, criar atividade (o dono pedido é ignorado e a atividade fica do Auxiliar), excluir atividade (feito, sem querer, pelo menu da tela; restaurada pela API).
Recusado (403): criar usuário, perfil de outro usuário, editar e criar projeto, descrição do cliente, excluir demanda, calendário (criar), relatório de execução, justificar ponto, Configurações da IA.

## Telas (Auxiliar), 1920×1080, tema claro

Atividades (coluna Usuário e filtro de usuário, ⋮ com "Registrar execução" e "Excluir", play/pause nas atividades de outros, sem seleção em massa), Demandas (Árvore, Grafo e Controle de horas; Nova Demanda; Editar; **sem** o botão de excluir demanda, achado e corrigido nesta verificação), detalhe do projeto (só Nova Demanda; sem Relatório, volume nem troca de status), Execuções (filtro de usuário, editar e excluir; sem Relatório), Ponto (equipe de hoje com filtro de pessoa; sem Justificar nem Imprimir), Tags. `/usuario` leva de volta ao Ponto (guard); a barra lateral não mostra Calendário, Usuários, Supervisão nem IA.

## Formatos e temas

Atividades (Auxiliar) a 1366×768, 1080×1920, 720×1280 e 960×1080 sem corte nem sobreposição; tema escuro (alternado pelo botão do app) em Atividades, Demandas e Usuários. Tela de Usuários (gestor) a 1920, 1366, 960 e 720: filtro "Auxiliares", selo verde do Auxiliar e o formulário com as quatro opções de tipo.

## Achados da verificação (corrigidos)

1. O botão "Excluir demanda" aparecia ao Auxiliar (a troca de `eGestor()` por `podeEditarDemanda()` o liberou, mas a rota é do gestor): voltou a `eGestor()`.
2. Com quatro tipos, a Senha ficava cortada ao lado do seletor de Tipo: o Tipo ocupa a linha toda.
3. A 720 de largura, o filtro de tipos (com "Auxiliares") era cortado: o grupo quebra em duas linhas.

## Limites

- Não exercitei no navegador, uma a uma, todas as ações de gravação do Auxiliar (a cobertura é a API real, os testes de componente e as telas acima).
- A leitura do Calendário por URL segue aberta (como ao desenvolvedor) e o Imprimir do ponto ficou escondido do Auxiliar: os dois dependem de confirmação do autor.
- IA e chat não foram exercitados (sem chave de provedor no ambiente isolado); o que vale para eles é a permissão `'AUXILIAR'` das ferramentas, coberta por teste.
