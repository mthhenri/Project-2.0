---
name: verify
description: >
  Como levantar a aplicação real e dirigi-la de verdade para verificar uma mudança — subir o
  stack, abrir no navegador (Playwright), montar o cenário, capturar evidência. Use quando a
  tarefa pedir "verificar ao vivo", "rodar o app", "testar na tela", "capturar", ou antes de
  declarar pronta qualquer mudança observável (UI, endpoint, fluxo, relatório gerado) — testes
  e lint não substituem isso.
---

# Verificação ao vivo — Project 2.0

> A regra ("pronto exige ver rodando") vive em `CLAUDE.md`/`AGENTS.md`
> ("Gate obrigatório de qualidade e conclusão"). Esta skill carrega o que a documentação não
> carrega: **como subir, como dirigir e as armadilhas que já custaram tempo**. **Acrescente armadilha
> nova aqui na hora em que ela morder**, com sintoma e causa.

## Onde vai a evidência

Antes de capturar, localize a spec dona. Capturas, logs, dumps e cenários temporários em
`.artifacts/<tarefa>/` (ignorada pelo Git); relatório textual em
`docs/specs/<estado>/<tarefa>/`. O relatório precisa explicar resultado e limites **sem
depender de imagem local** para o veredito (`SYSTEM.SPEC.md` §3.1).

## Levantar o stack

```bash
npm install
cp .env.example .env              # só na primeira vez; ajuste DB_* e JWT_SECRETO
npm run db:up                     # PostgreSQL 16 via Docker Compose (precisa de Docker)
npm run db:migrate --workspace=backend
npm run backend:dev               # API em http://localhost:3000 (prefixo /api)
npm run frontend:dev              # SPA em http://localhost:4200, com proxy /api → :3000
```

- **Portas já ocupadas?** Quem trabalha costuma deixar o stack rodando. Antes de subir outro,
  confira a porta; subir um segundo processo no mesmo checkout pode derrubar o primeiro.
- Dependência/pacote novo exige reiniciar o servidor de desenvolvimento que já estava no ar.
- Pacote compartilhado (`shared/`): se o backend consome o build (`dist`) e não o fonte, mudança
  no contrato só aparece depois de rebuildar o pacote — sintoma típico: teste passa isolado e a
  rota nova responde 404. Confirme no `backend` se o `@project20/shared` resolve para o fonte.
- `ANTHROPIC_API_KEY` é opcional: sem ela só o assistente de descrições fica indisponível.
- O banco de dev usa o fuso `APP_TIMEZONE` (default `America/Sao_Paulo`); ao montar cenário de
  ponto/execução, crie as datas nesse fuso, não em UTC.

## Viewports padrão

Nunca a janela padrão do navegador. Tamanhos fixos (sugestão mínima; a spec pode exigir mais):

| Perfil | Tamanho |
|---|---|
| Notebook | `1366×768` |
| Desktop vertical | `1080×1920` |
| Desktop | `1920×1080` |

```js
await browser.newContext({ viewport: { width: 1366, height: 768 } });
```

## Dirigir a UI

- Playwright instalado globalmente (`npm root -g`) ou como devDependency — registre qual.
- Sessão autenticada sem passar pela tela de login: `localStorage['access_token']` recebe o JWT
  devolvido por `POST /api/autenticacao/login`; o `UsuarioSessaoService` também guarda os dados do
  usuário em `localStorage` — plante os dois ou deixe a tela de login criar a sessão uma vez.
- Login inicial do seed (migration 0015): `gestor.inicial` (gestor, acesso total). Para cenários de
  desenvolvedor, crie o usuário pela API do gestor.
- Monte o cenário por API (registrar, logar, criar os dados), não clicando em tudo.
- **Provar "sem recarregar":** plante `window.__sentinela` antes e confira depois.
- **Estados persistidos:** o navegador do teste nasce com storage limpo — plante a chave e capture
  também o estado não-padrão (colapsado, filtro salvo...) antes de fechar o gate.
- Percorra os estados reais (vazio, carregando, cheio, erro, desabilitado, texto longo); uma
  captura só do estado inicial não valida uma tela interativa.

## Armadilhas já pagas

Nenhuma registrada ainda. Entra aqui na hora em que morder: sintoma → causa → como evitar.
