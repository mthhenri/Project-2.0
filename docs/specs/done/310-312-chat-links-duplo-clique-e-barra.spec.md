# 310–312 — Links soltos, duplo clique para responder e barra de bolinhas

> Três tasks pequenas da guarda-chuva `chat-colaboradores-evolucao.spec.md`, feitas juntas em 2026-11-06 (só front e a regra pura do Markdown no
> `shared`; sem migration, sem contrato novo).

## 310 — Endereço solto vira link

`interpretarMarkdown` (`shared/src/markdown/markdown.interpretador.ts`) passa a reconhecer `http://`, `https://` e `www.` escritos soltos no texto.
O endereço vai até o espaço, `<` ou `>`; a pontuação da frase no fim (`. , ; : ! ? ' " ]`) e o `)` sem o `(` correspondente ficam de fora; `www.` ganha
`https://`; é preciso um domínio depois do esquema (ou `localhost`); só `http`/`https` (mesma lista de esquemas do link com sintaxe). Não vale dentro de
código nem dentro de `[texto](url)`. Como o visualizador é único, **vale em todo o sistema** (chat da IA, descrições, documentações, chat entre
colaboradores). Efeito colateral conhecido: o trecho incompleto `[a](https://x.com` agora mostra o endereço como link.

## 311 — Dois cliques respondem

Duplo clique no balão de uma mensagem enviada de uma pessoa chama `responder` (o foco vai ao campo e a barra "Respondendo a…" aparece) e desfaz a
seleção de palavra que o duplo clique criaria. Não responde em link, botão, código e cartão de referência, nem em mensagem ainda não enviada.

## 312 — Barra de bolinhas

Com uma conversa aberta, o popup mostra à esquerda uma coluna de avatares (`app-mensagem-direta-barra`), na ordem da lista, com a conversa aberta
marcada, presença, contador de não lidas (some na aberta) e conversas silenciadas esmaecidas; clicar troca de conversa; "voltar" continua levando à
lista completa. A conversa aberta que a lista ainda não traz (sem mensagem) entra no topo da barra.

## Verificação

`shared` 316 testes (6 novos de endereço solto), frontend 2555 (207 arquivos; testes novos: duplo clique, barra de 3 cenários), backend 1664;
`npm run lint:tudo` limpo; build do frontend sem aviso novo (19, os mesmos de antes). Ao vivo (Postgres local, gestor e quatro desenvolvedores): 1920×1080,
1366×768, 1080×1920, 720×1280 e 960×1080, claro e escuro, com links, barra com contadores e o duplo clique (sem seleção, foco no campo, resposta
armada). Limite: o gesto de duplo clique no Electron (Project Desktop) não foi exercitado.
