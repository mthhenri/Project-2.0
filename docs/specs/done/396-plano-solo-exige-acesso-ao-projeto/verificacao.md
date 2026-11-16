# 396, 397, 421 e 424 (e a 423 adiada) — Verificação

Quarta frente da guarda-chuva `requisicoes-e-permissoes-correcoes`, de 2026-11-16, depois das de `359-.../`, `373-.../` e `335-.../`. Decisões do autor (cada spec tem a "Decisão do autor"): **396** (opção 1), **397** (opção 3), **421** (opção 1), **424** (apenas gestor e administrador trocam a senha de usuários, a opção 2) e **423** (só anotar como problema: `P-102`; a spec fica no backlog).

## O que mudou

- **396:** `podeAcessarPlano` (`shared`) exige, no plano solo de projeto, o criador **e** o acesso ao projeto (gestor, administrador e auxiliar têm por tipo); o `listar` do repository ganhou o mesmo `EXISTS` no ramo solo. Retirado de todas as demandas do projeto, o criador recebe 404 e o plano sai da lista dele.
- **397:** `PlanoService.arquivar` e `excluir` aceitam gestor e administrador no plano **solo de projeto** de outra pessoa, sem dar leitura (`GET` segue 404). `marcarSolo` recusa (400) o plano que já tem fonte trazida por outra pessoa (`PlanoFonteRepository.validarFonteDeOutro`) ou mensagem de outra pessoa na conversa; desmarcar não tem a trava. `PlanoService` ganhou a dependência do armazenamento do chat, e `PlanoModule` e `ChatModule` se importam com `forwardRef`.
- **421:** `LimiteDeTentativasDeLogin` (contador próprio, em memória, sem dependência nova): 5 falhas seguidas por login e 20 por IP começam o bloqueio de 30 s, que dobra a cada falha seguinte até 15 min, com resposta 429 e o tempo de espera (`TooManyRequestsException`). Conta login existente ou não; login certo zera a contagem do login. Contrato novo interno: `AutenticacaoInternoLoginDto` (login com `ip`). A tela de login já mostra a mensagem do servidor.
- **424:** só documentação (`SYSTEM.SPEC.md` §12): quem redefine a senha de um usuário é gestor ou administrador, sem a senha atual; não há troca da própria; o gestor não altera a de um administrador.
- **423:** `P-102` registrado em `PROBLEMS.md`; sem código.

## Testes e gates (rodados nesta tarefa)

| Gate | Resultado |
|---|---|
| Backend, unitários | 1851 de 1851; novos: regras do plano (396 e 397), limitador de login e o login com bloqueio |
| Integração (PostgreSQL local) | 540 de 540; novos: `listar` do plano solo sem acesso ao projeto e `validarFonteDeOutro` |
| `shared` | 363 de 363 |
| Frontend (Vitest, com `NODE_OPTIONS=--no-experimental-webstorage`, P-087) | 238 arquivos, 2893 testes; novo: a tela de login com 429 |
| `npm run lint:tudo`, builds de backend e frontend | sem erro |

## Ao vivo (backend 3001 e banco `project20_verify` isolados, removidos ao fim)

16 de 16 conferências por API (`.artifacts/revisao-permissoes-p0/roteiro4.mjs`): **396** (criador lê o solo com acesso; retirado da demanda única, 404 e some da lista), **397** (gestor arquiva e exclui o solo alheio, mas não lê; marcar solo com fonte de outro dá 400; desmarcar dá 200), **421** (5 falhas dão 400, a 6ª dá 429 "Tente de novo em 30 segundos"; outro login do mesmo IP entra; 4 falhas e a senha certa entram e zeram a contagem). O boot do backend confirmou que o `forwardRef` entre `PlanoModule` e `ChatModule` resolve.

## Limites

- **Sem verificação visual:** nenhuma tela mudou além da mensagem de erro do login (já coberta por teste de componente); o `ng serve` e o navegador não foram usados nesta frente.
- **397:** o plano solo de outra pessoa não aparece na lista do gestor, então arquivar e excluir só existem pelo id (rota); não há entrada na tela. "Contribuição" conta fonte e mensagem; os pontos em aberto e os textos não guardam autor e não entram.
- **421:** o contador é por processo e se perde ao reiniciar o backend; atrás de proxy, sem `trust proxy`, o IP visto é o do proxy (então o limite por IP vale para todos juntos). Os números (5, 20, 30 s, 15 min) ficam como constantes em `limite-de-tentativas-de-login.ts`.
- **424:** o gestor continua redefinindo a senha de outro gestor, como já era.
