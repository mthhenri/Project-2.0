# 460-permissoes-do-front-pelas-funcoes-do-shared.spec.md

> Task 132/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achados A-176, A-177 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend (casca, usuario, execucao, ponto).

## Objetivo

O menu deixa de usar flags próprias por tipo (`somenteGestor`, `visivelAoAuxiliar`) e as telas deixam de reescrever regras: cada item e cada ação usa a mesma função do `shared` que a rota e o backend usam.

## Contexto

**A-176 · Baixa · Comparação direta de TipoUsuarioEnum e flags de menu por tipo em vez das funções do shared**

O shared pede que toda decisão passe pelas funções de permissão, por lista positiva. No front há decisões por comparação direta de tipo e o menu usa flags próprias (somenteGestor, visivelAoAuxiliar com eAuxiliar) enquanto a rota de Tags usa permissaoGuard(podeGerenciarTag): a mesma regra tem duas fontes. Hoje os resultados coincidem; um tipo novo ou uma mudança na função do shared deixa menu e guard divergentes.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- shared/src/utils/permissao-usuario.ts:4-5 e 19-21 — 'comparar o tipo diretamente espalha a regra'; lista positiva de propósito
- frontend/src/app/modules/usuario/pages/usuario-listagem/usuario-listagem.page.ts:258 — usuario.tipo !== TipoUsuarioEnum.ADMINISTRADOR (o backend usa temPermissaoDeAdministrador(alvo.tipo) em usuario.service.ts:209)
- frontend/src/app/modules/usuario/components/usuario-formulario-dialog/usuario-formulario-dialog.component.ts:85 — usuarioEmEdicao()?.tipo === TipoUsuarioEnum.ADMINISTRADOR
- frontend/src/app/modules/mensagem-direta/components/mensagem-direta-grupo-conversa/mensagem-direta-grupo-conversa.component.ts:110 — usuarioAtual()?.tipo === TipoUsuarioEnum.ADMINISTRADOR em vez de sessao.eAdministrador()
- frontend/src/app/core/services/usuario-sessao.service.ts:41 e frontend/src/app/shared/layout/sidebar/sidebar.component.ts:36 — eAuxiliar por comparação direta decide os itens Projetos e Tags
- frontend/src/app/modules/tag/tag.routes.ts:8 — a rota usa permissaoGuard(podeGerenciarTag); o item do menu (navegacao.ts:43) usa as flags

Como observar: Leitura do código; sem efeito visível com os quatro tipos atuais.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

**A-177 · Baixa · Regras de permissão reescritas no front, fora do shared**

Três regras existem só como cópia local: quem abre o pad (duplicata da AnotacaoService), quem inicia execução pelo histórico (!eGestor() no lugar de atuaComoDesenvolvedor, que existe no shared) e quem imprime o espelho de ponto (regra só do front, sem função nomeada). As três coincidem hoje com backend e SPEC, mas não têm fonte comum nem acompanham mudança na regra.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- frontend/src/app/modules/usuario/utils/anotacoes-acesso.util.ts:7-13 — podeAbrirAnotacoes ('a mesma regra do backend'), cópia de backend/src/modules/anotacao/services/anotacao.service.ts:167-173
- frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.ts:148 — podeIniciar = !sessao.eGestor()
- shared/src/utils/permissao-usuario.ts:45-47 — atuaComoDesenvolvedor já expressa 'desenvolvedor e auxiliar'
- frontend/src/app/modules/ponto/pages/ponto/ponto.page.ts:103-104 — podeImprimir combina eGestor, podeVerExecucaoEPontoDeOutro e id do usuário

Como observar: Leitura do código.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Entregáveis

1. Cada item de `navegacao.ts` carrega a função de permissão do `shared` (a mesma do guard da rota).
2. As comparações diretas com `TipoUsuarioEnum` no front passam a `sessao.eAdministrador()` ou à função correspondente.
3. `podeAbrirAnotacoes` vai para `shared/src/utils` e é usada nas duas pontas; iniciar execução pelo histórico usa `atuaComoDesenvolvedor`; a regra de imprimir o espelho de ponto ganha função nomeada.
4. Testes das funções novas e do menu por tipo.

## Critérios de Aceite

- O menu de cada um dos quatro tipos continua igual ao de hoje (teste por tipo); `grep` por `=== TipoUsuarioEnum.` em `frontend/src` só devolve as exceções listadas.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Mudar o que cada tipo vê.

## Dependências

Junto com `478-tipos-de-usuario-sem-comparacao-direta` (a regra de lint é a mesma).

