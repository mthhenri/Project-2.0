# Verificação — 200 Aviso de que o Project Desktop atualizou

Verificada em 2026-10-31 no Windows, com o Electron real (`npx electron .`, versão `1.1.0`) e uma **pasta de dados própria** (`--user-data-dir`), sem tocar nos dados do usuário.

## Gates automáticos

`npm run test --workspace=desktop`: 37 testes verdes (8 novos em `politica-da-versao.test.ts`: leitura do arquivo, `deveAvisarQueAtualizou`, `versaoARegistrar` e os textos). `npm run build --workspace=desktop` e `tsc` sem erro. Sem lint (P-001).

## Ao vivo (Electron real)

| Cenário | Arquivo `ultima-versao.txt` antes | Depois de abrir o app | Esperado |
|---|---|---|---|
| Versão anterior simulada | `1.0.0` | `1.1.0` | avisa e grava a nova |
| Registro de versão maior | `9.0.0` | `9.0.0` | não avisa e **não apaga** a maior |

O segundo cenário também cobre "abrir de novo a mesma versão": a regra pura (`1.1.0` registrada, `1.1.0` rodando) devolve que não avisa nem grava.

## Limites

- **O balão do Windows não foi visto**: a execução da rota de aviso foi comprovada pela gravação da versão (que vem depois do `Notification.show()`), mas a aparência da notificação do sistema não foi capturada. A primeira execução da vida do app (sem arquivo) é coberta só pelo teste da regra pura.
- A linha "Project Desktop X.Y.Z" do menu da bandeja foi escrita e compila, mas o menu **não foi aberto** com um clique na bandeja.
- O instalador portátil (`npm run pack`) não foi gerado: a verificação foi com o Electron do projeto.
