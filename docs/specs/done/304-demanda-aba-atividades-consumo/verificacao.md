# Verificação — task 304 (2026-11-03)

**Ao vivo** (Postgres, backend e frontend reais; demanda "Cadastro com consumo" de 10h, 4 atividades com execuções registradas e uma em andamento; usuário auxiliar):

- Aba Atividades da Árvore em **1920×1080, 1366×768, 1080×1920, 720×1280 e 960×1080**, tema **claro e escuro**: resumo "4h 50min consumidas pela demanda" com a barra dividida (azul 31%, verde 62%, laranja 7% pelo status), contadores, filtros Todas/Minhas/Em aberto, 4 cartões; a que está em execução ganha borda, fundo e o selo "Em execução"; a sem execução mostra "sem execução ainda". Sem rolagem horizontal em nenhum formato.
- Após a verificação: removido o limite de altura da lista (cortava o último cartão); a coluna rola.

**Limites:** não vistos ao vivo os estados vazio, carregando e erro (cobertos por teste de componente; erro é do host); só um usuário (auxiliar) em cada tema.

**Depois (2026-11-03, a pedido do autor): play e pause no cartão.** O diálogo "Iniciar execução" saiu da `atividade-listagem.page` para o componente `execucao-iniciar-dialog` (a listagem passou a usá-lo); o cartão da atividade ganhou o play e o pause com a mesma regra da listagem (§14: auxiliar, gestor e administrador em qualquer atividade, desenvolvedor só nas suas; play só em Planejada e Desenvolvendo). Ao vivo, como auxiliar: pausar a que rodava (diálogo compartilhado "Encerrar execução"), depois iniciar a planejada ("Iniciar execução" com a descrição) e o cartão passou a "Em execução" com o pause; os botões de Pendente e Desenvolvida ficam desligados. Capturas: `.artifacts/304/exec-*.png`.

**Ainda fora:** o cronômetro ao vivo (o DTO não traz o início da execução ativa); a verificação ao vivo desta parte foi só em 1920×1080, tema claro.
