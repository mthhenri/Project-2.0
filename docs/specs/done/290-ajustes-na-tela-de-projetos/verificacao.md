# Verificação — 290 Ajustes na tela de projetos

Feita em 2026-10-31 no stack de desenvolvimento, com o gestor.

## Gates automáticos

- Frontend (Vitest): 2381 -> **2392 testes em 192 arquivos**. Entraram: Cancelar nos campos de texto e de data, a cor pelo popover (Salvar, Cancelar, fechar), o volume com `projetoId` (anual por padrão, só o projeto, sem link, Mensal disponível, e a tela de Projetos igual a antes) e a seção Volume do detalhe (gestor vê, recolher fica lembrado, desenvolvedor não vê nem pede).
- `npm run build --workspace=frontend` e `npm run repo:verificar` ok. Backend e shared não mudaram. Sem lint (`PROBLEMS.md` P-001).

## Ao vivo

Navegador embutido, gestor, projeto "Portal do Cliente". Tamanhos: **1366×768** (claro e escuro) e **1080×1920** (claro); 1920×1080 não visitado.

- **Cancelar:** ao editar o nome aparece "Cancelar" ao lado do campo; com o nome alterado, o clique real no botão descartou sem abrir "Salvar alteração?" (o `mousedown` não tira o foco do campo).
- **Cor:** o lápis do selo abre o popover ancorado nele, com a paleta e "Cancelar"/"Salvar" no rodapé (Salvar desabilitado até escolher outra cor). O cabeçalho não se espalha mais. Cancelar e Esc fecham o popover sem salvar. Como a cor do projeto de teste (#2563eb) não está na paleta, o seletor completo (roda e hex) já abriu junto, que é o comportamento de `app-seletor-cor` ("Outra cor" aberto quando a cor está fora da paleta).
- **Volume:** a seção "Volume" aparece entre o cabeçalho e as demandas, já no Anual de 2026, com o esperado tracejado e os botões Mensal/Anual, ano anterior/próximo e "Ano atual".

## Limites (não verificado)

- 1920×1080. Salvar de verdade uma cor nova (só por teste), a edição das datas ao vivo, o Mensal dentro do projeto, recolher/reabrir a seção no navegador e a visão de desenvolvedor (só por teste).
- O volume continua vindo de `GET /projeto/volume/anual` com **todos** os projetos, filtrado no cliente; vira filtro `projetoId` no backend se pesar.
- O seletor de cor em si (`app-seletor-cor`) não mudou: ele continua com a roda e o hex à mostra quando a cor está fora da paleta, também no popover. Se isso ainda destoar, é ajuste no componente (e em Tags).
