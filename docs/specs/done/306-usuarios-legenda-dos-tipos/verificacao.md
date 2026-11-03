# 306 — Verificação

Data: 2026-11-03. Stack real: PostgreSQL 16 local (porta 5433, 77 migrations), `npm run backend:dev` e `npm run frontend:dev`, Playwright, login pela tela com `gestor.inicial` (administrador) e usuários criados pela API (desenvolvedor, auxiliar e gestor).

## O que foi feito

- `shared`: `DESCRICAO_TIPO_USUARIO` e `TIPOS_USUARIO_NA_ORDEM_DA_AJUDA` (`utils/tipo-usuario-descricao.ts`).
- Frontend: componente `usuario-tipo-descricao` (tag com a cor de `severidadeTipoUsuario`, "o que é", "Pode" e "Não pode"); botão "Tipos de usuário" com popover na tela de Usuários; tooltip na tag da coluna Tipo; bloco do tipo escolhido no formulário de criar e editar.
- Sem migration, sem backend, sem mudança na coluna `tipo_usuario.descricao`.

## Gates

| Gate | Resultado |
|---|---|
| `shared` (`npm run test --workspace=shared`) | 310 testes, 0 falhas (2 novos: todo tipo tem descrição; ordem da ajuda sem repetir nem faltar) |
| Frontend, pasta `usuario` | 102 testes, 0 falhas (8 novos: 4 tipos e cores do componente, ajuda abre com os quatro tipos, tooltip, bloco do formulário troca com o tipo) |
| Frontend, suíte completa | 198 arquivos, 2449 testes, 0 falhas |
| `npm run build --workspace=frontend` | compila |
| `npm run lint:tudo` | zero erros (um aviso do Prettier no HTML da listagem foi corrigido com `prettier --write` só nesse arquivo) |
| `npm run repo:verificar` | aprovado |

Falhas preexistentes: nenhuma encontrada nas suítes rodadas. Backend e desktop não foram tocados e não foram rodados.

## Verificação ao vivo

Os cinco formatos (1920×1080, 1366×768, 1080×1920, 720×1280, 960×1080), em tema claro e escuro: 10 cenários, cada um com tooltip da tag, popover aberto e formulário com o tipo Auxiliar escolhido. Zero erros de console ou de página; o popover ficou dentro da tela nos dez; o tooltip e o bloco do formulário mostraram o texto do auxiliar.

- Desktop e notebook: os quatro tipos lado a lado. Tela dividida: três e um. HD vertical: uma coluna, com rolagem dentro do popover.
- Cores conferidas contra a tabela: Desenvolvedor azul, Auxiliar verde, Gestor âmbar, Administrador escuro (branco no tema escuro, como a tag da tabela).

**Achado só na verificação:** a primeira versão limitava o popover a 70% da altura e cortava Gestor e Administrador com rolagem interna, mesmo em 1080 de altura. Corrigido para quatro colunas quando cabem (`repeat(auto-fit, minmax(14rem, 1fr))`) e `max-height: calc(100vh - 13rem)` como rede de segurança.

## Limites

- Análogo escolhido: o popover do status do projeto (`projeto-status-chip`) e o dialog do próprio formulário de usuário. Não houve captura lado a lado com o análogo.
- O tooltip foi conferido no desktop; nos demais formatos só a presença do texto foi verificada por script.
- Os textos de cada tipo são rascunho do agente, escritos de `SYSTEM.SPEC.md` §14 e de `permissao-usuario.ts`; **ainda precisam da revisão do autor** (pontos listados na spec: o "não pode" do gestor e as "Configurações da IA" só do administrador).
- Leitor de tela e foco por teclado do popover não foram exercitados.
- Capturas em `.artifacts/306-usuarios-legenda-dos-tipos/` (ignorada pelo Git).
