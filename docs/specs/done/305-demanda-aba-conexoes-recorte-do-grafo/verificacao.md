# Verificação — task 305 (2026-11-03)

**Ao vivo** (Postgres, backend e frontend reais; gestor; demanda "Cadastro com consumo" com conexões: sai para "Planejada sem atividades", mútua com "Exportação em PDF", sai para "Integração antiga" (cancelada), entra de "Recuperação de senha", e uma conexão entre duas ligadas):

- Aba Conexões da Árvore nos **5 formatos** (1920×1080, 1366×768, 1080×1920, 720×1280, 960×1080) e temas **claro e escuro**: o `demanda-grafo` em modo recorte mostra a demanda no centro com anel, as ligadas, a seta no destino (nas duas pontas na mútua), o texto "depende de" / "depende desta" / "mútua" ao longo de cada linha, a linha laranja para a cancelada com a faixa de aviso, e o × nos nós ligados. Sem rolagem horizontal.
- **Achado só na verificação:** o recorte feito pela lista da API escondia "depende desta" (a lista só trazia as que saem e as mútuas, P-074, já corrigido); o recorte sai do grafo do projeto. E o primeiro layout ficou minúsculo (repulsão do grafo grande); no recorte a repulsão e a distância são menores e o enquadramento amplia até 1,4×.

**Limites:** o grafo do projeto não foi posto lado a lado numa mesma captura (nós, cores e traço vêm do mesmo componente); "+ Conectar" e o × não foram clicados ao vivo (cobertos por teste de componente); arrastar nós no recorte não foi exercitado. O P-074 (lista e contador sem as "depende desta") foi corrigido depois, a pedido do autor, e verificado ao vivo: contador 4, grupo "Dependem desta demanda", remover pela lixeira e desfazer.
