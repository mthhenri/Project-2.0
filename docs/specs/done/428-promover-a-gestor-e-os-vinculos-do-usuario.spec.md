# 428-promover-a-gestor-e-os-vinculos-do-usuario.spec.md

> Task 100/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-135 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: backend/usuario. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Trocar o tipo de desenvolvedor ou auxiliar para gestor ou administrador deixa de produzir um gestor membro de demandas e com execução em andamento.

## Contexto

**A-135 · Baixa · Promover a gestor não trata as linhas de demanda_usuario nem execução ativa**

Ao trocar o tipo de desenvolvedor/auxiliar para gestor ou administrador, a service só aplica guardas de administrador e grava o tipo. Nada remove ou bloqueia as linhas de demanda_usuario nem a execução ativa do usuário, embora a regra diga que gestor nunca é membro de demanda.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/usuario/services/usuario.service.ts:152-176 — troca de tipo: só validarPermissaoDeAdministrador, guarda de rebaixar e do último administrador, depois usuarioRepositorio.alterar
- backend/src/modules/usuario/services/usuario.service.ts:34 — única dependência da service é UsuarioRepository
- backend/src/modules/usuario/repositories/usuario.repository.ts:312-345 — alterar só monta o SET (tipo_usuario_id entre eles)
- grep de demanda_usuario|DemandaUsuario em backend/src/modules/usuario — nenhuma ocorrência
- shared/src/utils/permissao-usuario.ts:50-52 — podeSerMembroDeDemanda = atuaComoDesenvolvedor

Como observar: Como GESTOR: PUT /usuario/<id de dev que é membro de demanda e tem execução ativa> {tipo:'GESTOR'} → 200. Depois conferir a demanda (membros) e a execução: continuam lá. Esperado pela regra: recusar a troca ou limpar os vínculos.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor

**Antes:** `UsuarioService.alterar` aplica as guardas de administrador e grava o tipo; as linhas de `demanda_usuario` e a execução ativa ficam.

**Opções:**

1. Recusar a promoção enquanto houver vínculo ou execução ativa.
2. Encerrar a execução e remover os vínculos na mesma operação.

**Decisão (2026-11-16):** Em 2026-11-16 o autor seguiu a recomendação da auditoria, **opção 1**: promover desenvolvedor ou auxiliar a gestor ou administrador é recusado (400) enquanto ele for membro de alguma demanda ou tiver execução em andamento.

## Entregáveis

1. A opção escolhida, com teste e a regra no `SYSTEM.SPEC.md` §14.

## Critérios de Aceite

- Promover um desenvolvedor membro de uma demanda responde conforme a opção e nunca deixa gestor em `demanda_usuario`.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. Mesma regra da spec `381-demanda-membro-so-quem-atua-como-desenvolvedor`.

