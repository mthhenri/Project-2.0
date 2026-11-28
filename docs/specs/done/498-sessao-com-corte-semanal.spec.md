# 498 — Sessão com corte semanal configurável

## Objetivo

Decisão do autor: "semana nova, login novo". Com o corte ligado, todo token vence no próximo
dia e hora configurados (segunda, 6h), não importa quando a pessoa entrou.

## Regra

- `JWT_CORTE_SEMANAL` (opcional): `<DIA> <HH:MM>`, com `DIA` em `SEGUNDA` … `DOMINGO`, no fuso de
  `APP_TIMEZONE`. Ex.: `SEGUNDA 06:00`.
- Informada: o token vence na **próxima** ocorrência (login exatamente no corte vale uma semana) e
  `JWT_EXPIRACAO` não é usada para o login.
- Ausente ou vazia: vale `JWT_EXPIRACAO` (padrão `7d`), contada do login.
- Valor inválido derruba a subida com mensagem clara.
- O stream de eventos do chat é fechado no vencimento do token que o abriu; a reconexão recebe 401
  e o front leva ao login.
- A tela de login diz "por até 7 dias".

## Documentos

Três ambientes: **dev** (local), **homologação** (Cloudflare Pages + Render + Supabase) e
**produção** (containers na empresa, ainda a construir). O Render é o único host de homologação.

## Fora do escopo

Containers de produção (task própria); P-102; tokens já emitidos (mantêm o vencimento original).
A variável no Render é definida pelo autor.
