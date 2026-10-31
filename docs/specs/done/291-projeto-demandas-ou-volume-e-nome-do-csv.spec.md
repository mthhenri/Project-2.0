# 291-projeto-demandas-ou-volume-e-nome-do-csv.spec.md

> Task solta, pedido do autor logo depois da 290 (2026-10-31). Substitui a seção recolhível de volume da 290 por uma troca entre as duas visões e muda o nome do CSV do relatório.

## Objetivo

No detalhe do projeto, ver **ou** as demandas **ou** o volume (não os dois ao mesmo tempo), e baixar o relatório de execuções com um nome que diga o projeto e o mês.

## Entregáveis

1. **Demandas ou Volume.** O detalhe do projeto (gestor) tem um seletor "Demandas | Volume" entre o cabeçalho e o corpo; o corpo mostra uma visão por vez. A escolha fica lembrada neste navegador (`projeto.detalhe.visao`); o padrão é Demandas. As demandas ficam montadas (só escondidas) enquanto se vê o volume, para voltar à mesma pasta, demanda e filtro. O desenvolvedor não vê o seletor, vê sempre as demandas e nunca pede o volume. Substitui a seção "Volume" recolhível da 290; o volume segue sendo o `app-projeto-volume` com `projetoId` (anual por padrão).
2. **Nome do CSV.** `<código do projeto>-relatorio-<AAAA-MM>.csv`, por exemplo `dev-agenda-relatorio-2026-10.csv`. Código em minúsculas e sem acento nem símbolo (só letras, dígitos e hífen); o mês é o do período; período que atravessa meses vira `<AAAA-MM do início>-a-<AAAA-MM do fim>`. Antes era `relatorio-execucoes_<código>_<início>_<fim>.csv`. Função pura `nomeDoArquivoDoRelatorio`.

## Critérios de Aceite

- Testes: a função do nome (mesmo mês, meses diferentes, código com acento e símbolo, código vazio), o serviço do relatório com o nome novo, e o detalhe do projeto (abre em Demandas, troca para Volume e pede o anual, esconde as demandas sem desmontá-las, lembra a escolha, o desenvolvedor não vê nem pede). Build e `repo:verificar` ok.
- Ao vivo: o seletor troca as duas visões; `GET /relatorio/execucao/download` devolve `Content-Disposition: attachment; filename="dev-agenda-relatorio-2026-10.csv"`.

## Fora de Escopo

- O volume dos usuários (horas por usuário e mês): virou ideia (`IDEAS.md` I-045), sem prioridade.
- O formato XLSX do relatório, o nome do arquivo da impressão do Ponto e os demais downloads.

## Dependências

- 290 (a seção de volume no projeto) e o relatório de execuções (`relatorio.service.ts`).

## Notas

- O autor escreveu "relatório" no exemplo do nome; o arquivo usa **"relatorio"** sem acento, por segurança em qualquer sistema. Trocar é uma linha em `nome-do-arquivo-do-relatorio.ts`. **Decisão do autor (2026-10-31): sem acento.**
