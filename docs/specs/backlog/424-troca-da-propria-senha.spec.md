# 424-troca-da-propria-senha.spec.md

> Task 96/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-131 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Média. Área: backend/usuario. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

Escrever e aplicar a regra de troca de senha. Hoje `PATCH /usuario/:id/senha` é só de gestor e administrador, não pede a senha atual, o gestor redefine a de outro gestor, e auxiliar e desenvolvedor não têm como trocar a própria.

## Contexto

**A-131 · Média · Troca de senha: só gestor/administrador, sem senha atual; auxiliar e desenvolvedor não trocam a própria**

PATCH /usuario/:id/senha é @GestorOnly e a service só barra alvo administrador: o gestor redefine a senha de qualquer não administrador (a própria e a de outro gestor) sem informar a senha atual. Não existe rota para auxiliar/desenvolvedor trocar a própria senha, então toda senha deles é sempre escolhida por um gestor, que pode entrar como eles. A regra não está no resumo de referência.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/usuario/controllers/usuario.controller.ts:215-223 — @GestorOnly() em @Patch(':id/senha')
- backend/src/modules/usuario/services/usuario.service.ts:274-284 — única verificação é validarPermissaoSobreAdministrador (281); não compara dto.id com usuarioAtivo.sub nem pede senha atual
- shared/src/dtos/usuario/UsuarioSenhaAlterarDto.ts:4-8 — o DTO só tem senhaNova
- backend/src/modules/autenticacao/controllers/autenticacao.controller.ts:48 — login é a única rota do módulo; grep de 'senha' nos controllers só acha usuario.controller.ts:216
- backend/src/modules/usuario/services/usuario.service.leituras-e-senha.test.ts:129-138 — teste fixa 'para o próprio gestor e para um desenvolvedor' sem senha atual

Como observar: Como DESENVOLVEDOR: PATCH /usuario/<próprio id>/senha {senhaNova:'NovaSenha#1'} → 403 'Acesso restrito a gestores' (não há como trocar a própria). Como GESTOR: PATCH /usuario/<id de outro GESTOR>/senha {senhaNova:'NovaSenha#1'} → 200, sem senha atual.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor pendente

**Antes:** a regra não está no `SYSTEM.SPEC.md`.

**Opções:**

1. Rota própria para qualquer usuário trocar a sua senha informando a atual; a redefinição pelo gestor continua para terceiros.
2. Manter: só o gestor redefine; registrar no documento.

## Entregáveis

1. A regra no `SYSTEM.SPEC.md` §14; na opção 1, a rota e o DTO novos, a tela no menu do perfil e os testes por tipo.

## Critérios de Aceite

- Na opção 1: desenvolvedor troca a própria senha com a atual certa e é recusado com a atual errada.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima. Gate visual se houver tela nova.

