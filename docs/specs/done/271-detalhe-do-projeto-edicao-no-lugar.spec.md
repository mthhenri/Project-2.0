# 271-detalhe-do-projeto-edicao-no-lugar.spec.md

> Origem: pedido do autor em 2026-10-30, com a captura do cabeçalho do detalhe do projeto. Aprovado e "ajustando" depois do primeiro desenho; as sugestões do autor entram como novas tasks.

## Objetivo

O cabeçalho do detalhe do projeto fica mais enxuto e passa a editar no próprio lugar: nome, cor e as datas se editam com o botão direito (menu "Editar", depois campo ali mesmo e "Salvar alteração? Sim/Não", como a edição de horas em Execuções), e o botão "Editar" vira "Configurar volume".

## Entregáveis

1. Sai a faixa de resumo ("N demandas — Executado X de Y — barra — %"). Os botões **Grafo** e **Controle de horas** (só gestor) vão para as ações do cabeçalho, ao lado de Nova Demanda e Relatório.
2. Sai a linha de metas e o botão "Definir datas". As datas ficam no cabeçalho, depois do status, com espaçamento: **Início: dd/mm/aaaa** e **Fim: dd/mm/aaaa**; sem data, "Início: indefinido" e "Fim: indefinido" (o "Fim" é a previsão de término do projeto, `previsaoFimData`).
3. Componente `ProjetoCampoEditavelComponent` (`modules/projeto/components/projeto-campo-editavel/`): conteúdo exibido por projeção; com o botão direito (só gestor) abre o menu com "Editar"; a edição ocorre no lugar (texto, data ou cor), Enter ou sair do campo com mudança pergunta "Salvar alteração? Sim / Não", Esc cancela; "Sim" emite o valor novo. Usado no nome, na cor (selo) e nas duas datas.
4. A página aplica a alteração de forma otimista pelo `PUT /projeto/:id` e desfaz se a API recusar (como já faz com o status).
5. "Editar" vira **"Configurar volume"**: abre um dialog só com o volume esperado por vigência (`ProjetoVolumeVigenciasComponent`). O dialog completo de edição segue na listagem de projetos.

## Critérios de Aceite

- Testes de componente do campo editável (menu, confirmação, cancelamento, validação do nome) e da página (sem faixa de resumo, datas e "indefinido", edição que chama a API e desfaz na falha, botão "Configurar volume"); suíte e build verdes.
- Verificado ao vivo em 1920×1080, 1366×768 e 1080×1920.

## Fora de Escopo

- Apagar uma data já definida (a API não aceita limpar hoje).
- Editar status (já é inline), código (imutável) e a listagem de projetos.

## Dependências

Tasks 110 (edição inline de horas em Execuções), 251 (volume por vigência), 269 (relatório).
