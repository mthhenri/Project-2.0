# chat-proposta-no-documento.spec.md

> Guarda-chuva (tasks **273–277**, só a spec). Origem: `IDEAS.md` I-033, decidida com o autor em 2026-10-30 a partir do POC "proposta-no-documento" (artifact, tema claro e escuro, no visual do projeto). Continua as propostas da IA (`chat-propostas.spec.md`, em `done/`: tasks 224–231) e o diff por palavra (`app-diff-por-palavra`).

## Objetivo

Quando a IA propõe alterar um documento, o diff e as ações da proposta aparecem **no próprio documento**, não num cartão do chat. O chat guarda só uma linha curta com um link "Ver no documento →". O autor lê a mudança no contexto do texto em que ela cai.

## Decisões do autor

1. **Cartão sai do chat** nas propostas que alteram um documento. O chat mostra uma linha comum ("Propus uma alteração: …") com o link "Ver no documento →". Confirmar, Recusar e Pedir de novo ficam no documento, junto do diff.
2. **Escopo (o que vale):** descrição da demanda (cliente e técnica), pad, documentação da demanda e plano.
3. **Documento fechado:** o link leva até ele. Nada abre sozinho e o documento não é alterado sem o autor ir até lá.
4. **Autonomia por tipo** (tasks 227 e 228) continua configuração do chat, sem mudança.
5. **Confirmar todas** vira uma faixa no topo do documento quando há duas ou mais propostas pendentes nele.
6. **Desfazer com prazo** continua na linha do chat (palpite aceito junto com a decisão 1).
7. **Propostas que criam algo novo** (criar demanda, projeto ou atividade) **continuam como cartão no chat**, porque não têm documento onde mostrar o diff. O autor aceitou, com a ressalva de ajustar depois se não gostar.

## Quebra em tasks

| Task | Entrega |
|---|---|
| **273** | Linha da proposta no chat e o link "Ver no documento →": rota ou ação que abre o documento no ponto da proposta, com o documento fechado. |
| **274** | Bloco "Proposta da IA" no documento, com o diff por palavra e Confirmar, Recusar e Pedir de novo: descrição da demanda e pad. |
| **275** | O mesmo bloco na documentação da demanda e no plano (o plano já tem o diff de publicação, ver `plano-publicar-dialog`). |
| **276** | Faixa "Confirmar todas / Recusar todas" no topo do documento com 2+ pendentes; Desfazer com prazo na linha do chat. |
| **277** | Retirar do cartão do chat os casos migrados; manter `app-chat-proposta-cartao` só para propostas de criação. |

Cada task ganha seu arquivo `NNN-*.spec.md` (Objetivo, Entregáveis, Critérios) quando for aberta.

## Critérios de Aceite (da guarda-chuva)

- Nenhuma proposta que altera descrição, pad, documentação ou plano aparece como cartão no chat; todas aparecem como linha e como bloco no documento.
- Confirmar e recusar no documento produzem o mesmo resultado que hoje no cartão (mesmo endpoint, mesma regra de autonomia).
- Verificação ao vivo nos dois temas, em 1920×1080, 1366×768 e 1080×1920, com o documento aberto e fechado, com uma e com várias propostas.

## Fora de Escopo

- Mudar a regra de autonomia por tipo de proposta ou o texto das propostas.
- Propostas de criação (demanda, projeto, atividade): ficam como cartão.
- Visualizador novo de documento: reaproveita os editores existentes.

## Dependências

- `chat-propostas.spec.md` e o diff por palavra (224) em `done/`.
- **Impacto (`npm run impacto`):** `app-chat-proposta-cartao` tem 6 consumidores (`chat.page`, `checkin.page`, `proposta-grupo`, e seus templates) e 1 teste. Rodar a skill `gerenciamento-de-impacto` também em `app-diff-por-palavra` (usado por `proposta-cartao`, `proposta-linha`, `plano-publicar-dialog`, `documentacao-proposta`) antes da 274.
- A hospedagem do bloco depende de onde a descrição é editada: o modo Dividido da `reduzir-dialogs.spec.md` (task 278) muda esse lugar. Fazer a 274 depois da 278, ou sobre o editor atual com o ponto de encaixe isolado.

## Riscos e Mitigação

- **Proposta sem documento aberto:** o bloco precisa existir como estado pendente carregado do servidor, não só em memória da tela. Guardar a proposta pendente por documento e reabrir ao abrir o documento.
- **Duas fontes da verdade:** não manter o cartão e o bloco ao mesmo tempo para o mesmo caso; a 277 remove o cartão só depois de a 274 e a 275 estarem verificadas.
