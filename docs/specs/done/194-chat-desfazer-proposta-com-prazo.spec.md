# Task 194 — Desfazer da proposta no lado oposto e com prazo

> Origem: ideia I-009 (anotações do autor, 2026-10-19). Guarda-chuva [`rework-chat-ia.spec.md`](rework-chat-ia.spec.md), bloco 5.

## Decisões (minhas, a confirmar com o autor)

- O prazo é de **30 minutos** contados da resolução (`resolucaoData`), e vale **também no backend**: depois dele `POST /proposta-ia/:id/desfazer`
  responde `BusinessException` ("O prazo para desfazer passou"). Só a tela desativar deixaria a API aberta.
- O prazo é uma constante do `shared` (`PRAZO_PARA_DESFAZER_PROPOSTA_MINUTOS = 30`), usada pelos dois lados.
- O toast "Desfazer" imediato (`DesfazerService`) não muda.

## Entregáveis

1. `shared`: constante do prazo e função pura `podeDesfazerProposta(resolucaoData, agora)` (testada: dentro, no limite, fora, sem data).
2. Backend: `PropostaIaService.desfazer` recusa fora do prazo (antes de chamar o executor) e o teste cobre.
3. Frontend (`proposta-cartao`): o botão "Desfazer" passa para o **lado direito** da linha de ações (o lado oposto ao de Confirmar/Ajustar); fica
   desativado com tooltip "Passou o prazo de 30 min para desfazer" quando vence, inclusive com o cartão aberto (um temporizador até o limite).

## Critérios de Aceite

- Proposta confirmada há menos de 30 min: Desfazer à direita, ativo. Há mais: desativado com o tooltip, e a API recusa.
- Testes: função pura, service (dentro/fora do prazo), componente (posição, desativado, vence com o relógio avançando).
- Verificação ao vivo nos três viewports com proposta plantada confirmada há 5 e há 40 min.

## Fora de Escopo

- Prazo configurável na tela de IA; expirar por tipo de proposta.
