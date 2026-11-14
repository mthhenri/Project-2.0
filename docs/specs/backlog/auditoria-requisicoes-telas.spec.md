# Auditoria de requisições nos fluxos das telas

> **Nota de 2026-11-13:** por decisão do autor esta auditoria voltou para `backlog/` com a cobertura incompleta em que estava. A revisão nova, que a usa como referência e acrescenta as permissões por tipo de usuário, é `../active/revisao-requisicoes-e-permissoes.spec.md`. O corpo abaixo não foi reescrito.

Pedido do autor em 2026-11-05: dossiê de todas as telas e seus fluxos padrão, sem alterar código.

## Objetivo

Observar a aplicação real e identificar requisições excessivas, repetidas ou sem utilidade para a interação realizada. Separar evidência observada de hipótese de análise estática.

## Entregáveis

1. Dossiê em `auditoria-requisicoes-telas/DOSSIE.md`, com matriz de cobertura por tela e fluxo, contagens, achados, reprodução, impacto e recomendações.
2. Evidências locais em `.artifacts/auditoria-requisicoes-telas/`, sem tokens ou senhas nos relatórios.
3. Identificação explícita dos fluxos impedidos pelo ambiente ou dependências externas.

## Critérios de Aceite

Percorrer os fluxos padrão disponíveis pela interface, incluindo criação, leitura, edição, filtros, inativação e exclusão quando aplicáveis. Medir tráfego por ação e distinguir consultas de fundo e conexões contínuas de duplicação. Cobertura incompleta mantém a auditoria em active. Executar `npm run repo:verificar` no fecho.

## Fora de Escopo

Correções de código, alterações de modelagem, migrations novas e modificação de dados reais para testes.

## Dependências

Aplicação e banco locais executáveis; documentos canônicos e skill verify. As alterações existentes no checkout são preservadas e fazem parte da versão observada.
