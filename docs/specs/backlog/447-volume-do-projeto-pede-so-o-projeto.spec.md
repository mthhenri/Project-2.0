# 447-volume-do-projeto-pede-so-o-projeto.spec.md

> Task 119/135 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-148 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/projeto e frontend/projeto. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

O componente de volume embutido em `/projeto/:id` deixa de pedir o volume de todos os projetos para descartar os outros no navegador.

## Contexto

**A-148 · Média · Volume dentro do projeto pede o volume de todos os projetos e filtra no navegador**

O componente de volume embutido em /projeto/:id pede GET /projeto/volume/anual?ano= (ou GET /projeto/volume?ano&mes) sem projeto e descarta os outros projetos no cliente. O DTO de consulta anual só aceita ano, então o servidor calcula o ano inteiro de todos os projetos para mostrar um. O mesmo acontece a cada troca de ano e a cada vigência gravada ou excluída.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/projeto/components/projeto-volume/projeto-volume.component.ts:64-65 — mensaisVisiveis/anuaisVisiveis filtram item.projetoId === this.projetoId()
- frontend/src/app/modules/projeto/components/projeto-volume/projeto-volume.component.ts:162-163 e 175-176 — listarVolume({ano, mes}) e listarVolumeAnual({ano}) sem projeto
- frontend/src/app/modules/projeto/services/projeto.service.ts:57-65 — só ano e mes viram parâmetros
- shared/src/dtos/projeto/ProjetoVolumeAnualListarDto.ts:6-13 — o DTO só tem ano
- frontend/src/app/modules/projeto/pages/projeto-detalhe/projeto-detalhe.page.html:160-161 — <app-projeto-volume [projetoId]="projeto()!.id" />
- frontend/src/app/modules/projeto/pages/projeto-detalhe/projeto-detalhe.page.ts:211-213 — recarregarVolume() refaz a consulta após cada vigência

Como observar: Como gestor, abrir /projeto/1 e escolher a visão Volume. Na rede: GET /projeto/volume/anual?ano=2026 com uma linha por projeto do sistema, embora a tela mostre só o projeto aberto.

Verificação na auditoria: código, por um auditor; linhas citadas conferidas pelo agente principal.

## Decisão do autor pendente

**Antes:** `GET /projeto/volume/anual?ano=` e `GET /projeto/volume?ano&mes` não aceitam projeto; o servidor calcula tudo.

**Opções:**

1. `projetoId` opcional nos dois DTOs de consulta (parâmetro novo).
2. Manter: o custo é o cálculo do ano inteiro a cada abertura do detalhe.

## Entregáveis

1. Na opção 1: o parâmetro nos DTOs, o filtro no repository e o componente enviando o projeto, com teste de integração.

## Critérios de Aceite

- Ao vivo: a resposta do volume no detalhe do projeto traz só aquele projeto.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

