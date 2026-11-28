# Produção em containers (emulada na máquina local)

Nginx (HTTPS) na frente do front e da API, com PostgreSQL e Elasticsearch. Roda em `https://cek.project`.
Precisa do Docker e do `.env` da raiz (o mesmo do desenvolvimento; o que muda em produção está em `compose.yml`).

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

| Comando | Banco |
|---|---|
| `npm run prod:up` | o PostgreSQL do **desenvolvimento** (precisa de `npm run db:up`) |
| `npm run prod:up:banco-proprio` | um banco **próprio**, vazio, com o gestor inicial |
| `npm run prod:down` | para tudo; os volumes ficam |

`prod:up` reconstrói as imagens. As mensagens do chat ficam no Elasticsearch da produção: com o banco de dev, as conversas
escritas no desenvolvimento (OpenSearch) não aparecem aqui, e vice-versa. Com o mesmo banco, as migrations da produção valem para o dev.

## Project Desktop

Copie `Project-Desktop-<versão>.exe` para `infra/producao/publicacoes/desktop/`: o download aparece no menu do perfil, sem reiniciar.
Para o `.exe` abrir este ambiente, troque `URL_DO_PROJECT` em `desktop/src/config.ts` antes de gerar, ou defina `PROJECT_DESKTOP_URL`.

## Antes de levar para a empresa

- `PRODUCAO_ESCUTA=0.0.0.0` (aqui o Nginx só atende a própria máquina).
- Certificado emitido pela autoridade da empresa e o nome no DNS interno, em vez de `hosts`.
- Senhas e `JWT_SECRETO` próprios, e a segurança do Elasticsearch ligada.
- Backup do PostgreSQL e do Elasticsearch.
