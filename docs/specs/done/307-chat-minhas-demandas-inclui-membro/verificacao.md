# Verificação — task 307 (2026-11-03)

**Ao vivo** (Postgres, backend e frontend reais; auxiliar `aux.teste` membro de uma demanda PLANEJADA sem atividades; gestor inicial):

- Auxiliar, em **1920×1080, 1366×768, 1080×1920, 720×1280 e 960×1080**: a lateral "Minhas demandas" lista "Planejada sem atividades" com "0h 0min de 4h" e "Sem atividades", sem `NaN`. Gestor: a demanda não aparece (não é membro, não executou).
- Cabeçalho de membros da Árvore: o auxiliar membro vê o **+** e o **Sair** (1920 e 960); o gestor vê só o **+**.

**Limites:** só o tema claro; o botão **Participar** do auxiliar não membro foi coberto por teste de componente, não visto na tela; "Sair da demanda" no menu da lateral aparece também para o auxiliar em demanda executada sem ser membro (a API recusaria) — registrado no HISTORY, fora do escopo.
