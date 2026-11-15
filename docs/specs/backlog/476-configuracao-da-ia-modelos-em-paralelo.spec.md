# 476-configuracao-da-ia-modelos-em-paralelo.spec.md

> Task 148/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-194 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`; auditoria anterior: R-09.
> Severidade: Baixa. Área: frontend/configuracao-ia.

## Objetivo

`GET /ia/modelos` deixa de esperar as três leituras da página terminarem para começar.

## Contexto

**A-194 · Baixa · Configurações da IA: GET /ia/modelos só começa depois que as três leituras da página terminam**

A aba Provedor pede a lista de modelos no próprio ngOnInit, mas ela só é montada quando jaCarregou() vira verdadeiro, isto é, depois do forkJoin de GET /configuracao-ia, /configuracao-ia/versoes e /ia/estado. A consulta não depende dessas respostas e poderia sair junto. A medição confirma /ia/modelos como a última das seis.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/configuracao-ia/components/provedor-aba/provedor-aba.component.ts:76-78 — ngOnInit chama listarModelos()
- frontend/src/app/modules/configuracao-ia/pages/configuracao-ia/configuracao-ia.page.html:112-119 — @if (!jaCarregou()) { esqueleto } @else { <app-provedor-aba ... }
- frontend/src/app/modules/configuracao-ia/pages/configuracao-ia/configuracao-ia.page.ts:137-156 — jaCarregou.set(true) só no next do forkJoin
- .artifacts/revisao-requisicoes-e-permissoes/trafego/ADMINISTRADOR.txt:49-55 — GET /ia/modelos é a sexta requisição ao abrir

Como observar: Abrir /configuracao-ia com a rede limitada (Slow 3G). GET /ia/modelos só aparece depois que as três primeiras respondem; o seletor de modelo fica em carregamento nesse intervalo.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. A página dispara `listarModelos()` em paralelo com as outras leituras e entrega o resultado à aba Provedor; teste de componente.

## Critérios de Aceite

- Ao vivo: as quatro requisições da abertura partem juntas.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Nenhuma.

