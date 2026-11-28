# Produção em containers (emulada na máquina local)

Nginx (HTTPS) na frente do front e da API, com PostgreSQL e Elasticsearch. Roda em `https://cek.project`.
Precisa só do Docker. A configuração é a do `infra/producao/.env`, **separada da do desenvolvimento**: o primeiro
`npm run prod:up` o cria a partir do `.env.example` desta pasta, com senha de banco e `JWT_SECRETO` novos. Ele fica fora do Git:
guarde uma cópia, porque a senha do banco já criado está só ali. As chaves de IA começam vazias; preencha e rode `prod:up` de novo.

Para trocar a senha do banco depois, altere `DB_SENHA` e também no PostgreSQL (`ALTER USER`), antes de subir de novo.

## Uma vez por máquina

1. Suba o ambiente (passo seguinte): o certificado é criado em `infra/producao/certificados/`.
2. Faça `cek.project` apontar para a máquina, num PowerShell **como administrador**:

```powershell
Add-Content -Path "$env:SystemRoot\System32\drivers\etc\hosts" -Value "127.0.0.1 cek.project"
```

3. Confie na autoridade local (o Windows pede confirmação):

```powershell
certutil -user -addstore Root infra\producao\certificados\ca.crt
```

Depois reabra o navegador e acesse `https://cek.project` (digite com `https://`, senão o navegador pode pesquisar o nome).

## Subir e parar

| Comando | O que faz |
|---|---|
| `npm run prod:up` | reconstrói as imagens, aplica as migrations e sobe tudo |
| `npm run prod:down` | para tudo; os dados ficam nos volumes |

A produção tem **banco e chat próprios** (volumes `postgres_dados` e `chat_dados`): começa vazia, só com o que as migrations criam,
e nada é compartilhado com o desenvolvimento. O primeiro acesso é o gestor inicial do README da raiz: **troque a senha na hora**.

## Project Desktop

Copie `Project-Desktop-<versão>.exe` para `infra/producao/publicacoes/desktop/`: o download aparece no menu do perfil, sem reiniciar.
Para o `.exe` abrir este ambiente, troque `URL_DO_PROJECT` em `desktop/src/config.ts` antes de gerar, ou defina `PROJECT_DESKTOP_URL`.

## Antes de levar para a empresa

- `PRODUCAO_ESCUTA=0.0.0.0` (aqui o Nginx só atende a própria máquina).
- Certificado emitido pela autoridade da empresa e o nome no DNS interno, em vez de `hosts`.
- No servidor, um `infra/producao/.env` próprio dele (não copie o desta máquina), e a segurança do Elasticsearch ligada.
- Backup do PostgreSQL e do Elasticsearch.
