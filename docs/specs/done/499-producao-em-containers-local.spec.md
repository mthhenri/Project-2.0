# 499 — Produção em containers, emulada na máquina local

## Objetivo

Montar o ambiente de **produção** (containers na rede da empresa) e rodá-lo localmente em
`https://cek.project`, para validar antes de levar para a empresa. Pedido do autor.

## Escopo

- `infra/producao/`: Compose com Nginx (HTTPS), API, migrations, PostgreSQL e Elasticsearch.
- Imagens do backend e do front; o front chama a API na mesma origem (`/api/v1`).
- Certificado de uma autoridade local gerada por script; chaves fora do Git.
- Banco: opção de usar o PostgreSQL de dev (padrão do autor, "por enquanto") ou um banco próprio
  da produção, com o gestor inicial das migrations.
- Pasta montada para o executável do Project Desktop.
- IP real do cliente atrás do proxy (`APP_PROXIES_CONFIAVEIS`), para o limite de login não somar
  todos os usuários no IP do Nginx.

## Fora do escopo

Passos que mudam a máquina do autor (arquivo `hosts`, confiar no certificado): ficam como
comandos para ele. Backup, monitoramento, publicação na empresa e geração do `.exe`.
