# 231-proposta-justificar-ponto.spec.md

> Task 8/8 (fase 6) da guarda-chuva [`chat-propostas.spec.md`](chat-propostas.spec.md): **justificar o ponto** pela IA (decisão 6).

## Objetivo

O gestor pede à IA que justifique o ponto de outra pessoa e confirma; é a mesma ação da tela de justificativas, sem regra nova. A IA
nunca oferece isso ao desenvolvedor, que não justifica o próprio ponto.

## Entregáveis

1. **Tipo novo** `JUSTIFICAR_PONTO` em `TipoPropostaIaEnum`, com linha em `tipo_proposta_ia` (migration na próxima livre na hora), DTOs
   no `shared` e validação em `validar-dados-da-proposta.ts`.
2. **Ferramenta de proposta** (`propor_justificar_ponto`) visível **só à permissão de gestor** (gestor e administrador,
   `temPermissaoDeGestor`), e **executor** que chama `PontoJustificativaService.criar`
   (`backend/src/modules/ponto-justificativa/services/ponto-justificativa.service.ts`) com o token de quem confirma, para o ponto de
   **outra pessoa**, como a tela hoje. O que a service já valida (data, usuário-alvo, duplicidade) continua nela; nenhuma regra nova no
   executor.
3. **Nível `SEMPRE_PERGUNTA`** (fixo, escudo no painel da 228: mexe em ponto); a regra do `shared` da 228 inclui o tipo.
4. **Desfazer** pelo prazo de 30 min: exclui (soft delete) a justificativa criada, só se continua como a proposta a deixou
   (`PontoJustificativaService.excluir`).
5. Cartão no `proposta-cartao` (pessoa, dia, motivo/texto da justificativa) e atualização de `docs/SYSTEM.SPEC.md` e `docs/SCHEMA.md`
   se houver mudança.
6. O prompt/descrição da ferramenta deixa claro que não vale para o desenvolvedor e para o próprio ponto dele.

## Critérios de Aceite

- Testes: ferramenta (não listada para desenvolvedor), executor (confirmar, desfazer, estado mudado, sem permissão), regra do nível
  fixo; `npm run test:integracao` se o repository mudar.
- Builds de `shared`, `backend` e `frontend` passam; migration aplica e reverte.
- Verificação ao vivo: gestor justifica o ponto de um desenvolvedor pelo chat e desfaz; desenvolvedor pede e a IA recusa sem oferecer
  proposta; 1920×1080, 1366×768 e 1080×1920, tema claro e escuro.

## Fora de Escopo

- Desenvolvedor justificar o próprio ponto; mudar a tela de justificativas ou a regra de quem justifica.
- Editar justificativa existente (só criar e desfazer).

## Dependências

Nenhuma obrigatória para o código; 228 para o nível fixo e o escudo, 224 e 226 para o cartão no desenho final.
