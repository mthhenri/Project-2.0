# 249 — Verificação do resumo de grupo e canal com a IA

> Relatório textual da task [`249-resumo-do-grupo-com-ia.spec.md`](../249-resumo-do-grupo-com-ia.spec.md). Capturas e logs brutos ficam em
> `.artifacts/249/` (ignorada pelo Git); o veredito abaixo não depende deles.

## O que foi rodado (2026-11-12)

| Gate | Resultado |
|---|---|
| `npm run test --workspace=shared` | 353 testes, todos passam |
| `npm run test --workspace=backend` (unitários) | 1772 testes, todos passam (novos: domínio `grupo-resumo-ia`, 12; rotas do controller) |
| `npm run test:integracao` | 506 testes, todos passam (novos: `grupo-resumo-ia.service.integracao.test.ts`, 11 cenários, e `grupo-resumo.repository.integracao.test.ts`, 5) |
| `npm run test --workspace=frontend` | 234 arquivos, 2831 testes, todos passam (novos: diálogo de resumo, 12; o `/resumir` e o menu no popup; as rotas no serviço HTTP) |
| `npm run lint:tudo` | zero erros |
| `npm run build` do backend e do frontend | sem erros; bundle inicial 1,12 MB (limite de 1,15 MB) |
| Migration `0088` | aplicada, revertida e reaplicada em banco descartável (sem erro) |

## Verificação ao vivo

API real (`project20_verify`, PostgreSQL) e `ng serve` isolados, Playwright com Ana e Bruno (na demanda), Davi (fora) e o gestor da conta. **O provedor de IA foi um servidor de mentira que fala o protocolo de mensagens da Anthropic** (`ANTHROPIC_BASE_URL`), que guardou tudo o que recebeu: não havia chave real de provedor no ambiente. Isso prova o que sai do nosso servidor (código, nomes, quantidade de chamadas) e o fluxo de ponta a ponta, **não a qualidade do texto de um modelo real**. **20 de 20 verificações em cada um dos cinco formatos (`1920×1080`, `1366×768`, `1080×1920`, `720×1280`, `960×1080`) e nos temas claro e escuro.** Cobre: `/resumir` abre o diálogo e não envia mensagem; aviso permanente no compositor; consentimento e código desligado; a estimativa (15 mensagens, 6 chamadas) **não chama o provedor**; o provedor recebe exatamente uma chamada por bloco mais o fechamento; **nenhum bloco de código** chega a ele (só `[trecho de código omitido]`) e **nenhum nome de autor**; o fechamento recebe os resumos parciais; o texto termina com a linha de IA; a proposta mostra o que será acrescentado e **a documentação não muda antes de confirmar**; confirmar acrescenta ao fim sem perder o texto que existia; o chat recebe a mensagem do sistema com o cartão da demanda; o custo (tokens de entrada) entra na aba Custos, atribuído a quem pediu; quem não é membro recebe 403; só quem gerou o resumo o grava; o grupo livre só oferece copiar.

## Decisões tomadas pelos padrões da spec — a confirmar

- Resposta única (sem stream); teto de 40 chamadas por resumo (a estimativa avisa e o resumo recusa).
- O aviso permanente no compositor vale para todo grupo e canal (o grupo livre também pode ser resumido).
- Retenção de `grupo_resumo`: sem prazo (são poucas linhas); o texto do resumo não é guardado.
- A proposta é `ALTERAR_DEMANDA` com `acrescentarDocumentacao` (já existia), sem tipo de proposta novo; a confirmação e a recusa passam pelo serviço do resumo, que chama o de propostas.
- O custo entra pela mensagem de uso do chat (`IaUsoService`), não por soma de `grupo_resumo`, para não contar duas vezes; `grupo_resumo` guarda os tokens só como registro.
- As instruções do prompt ficam em constantes do domínio (não há tipo de prompt configurável novo).
- O custo estimado usa o preço do modelo principal do nível rápido; sem preço cadastrado, a estimativa mostra só os tokens.
- Quem só lê um canal por tipo (gestor que ainda não escreveu) não resume.

## Limites e pendências

- **Não testado com provedor real** (ver acima). A estimativa de tokens é por caracteres (4 por token), aproximada.
- O resumo roda dentro de uma requisição e pode demorar em períodos grandes (até o teto de chamadas); sem progresso parcial.
- Elasticsearch ao vivo e o Electron real não foram exercitados.
- Achado fora do escopo: com a IA ligada, a "abertura do dia" do check-in também chama o provedor no primeiro acesso (aparece no log da verificação; não é do resumo).
