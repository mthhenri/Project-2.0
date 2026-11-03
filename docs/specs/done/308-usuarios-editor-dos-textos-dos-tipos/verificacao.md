# 308 — Verificação

Data: 2026-11-03. Stack real: PostgreSQL 16 local (porta 5433, migrations até a `0078`), `npm run backend:dev`, `npm run frontend:dev`, Playwright; login pela tela com `gestor.inicial` (administrador) e `ana.costa` (gestor).

## Gates

| Gate | Resultado |
|---|---|
| Migration `0078` | aplicada, revertida (`db:rollback`) e aplicada de novo, sem erro; as quatro linhas semeadas |
| `shared` | 311 testes, 0 falhas |
| Backend unitários | 1615 testes, 0 falhas (6 novos da service) |
| Backend integração (`test:integracao`, banco de teste recriado) | 370 testes, 0 falhas (3 novos do repository: semente igual ao padrão do `shared`, trocar só o tipo pedido, tipo inexistente) |
| `npm run build --workspace=backend` | compila |
| Frontend, suíte completa | 200 arquivos, 2469 testes, 0 falhas (novos: utilitários `dividirTextoDaAjuda` e `inserirMarcaNaLinha`, `usuario-tipo-descricao`, `usuario-tipos-textos`, listagem) |
| `npm run build --workspace=frontend` | compila |
| `npm run lint:tudo` | zero erros |
| `npm run repo:verificar` | aprovado |

Falhas preexistentes: nenhuma encontrada. Backend e `shared` rodados inteiros; o desktop não foi tocado e não foi rodado.

## Verificação ao vivo

- **API:** gestor no `PUT` recebe 403 ("Acesso restrito a administradores"); administrador com texto em branco recebe a mensagem de validação; tipo fora do enum é recusado.
- **Tela, administrador, desktop claro:** abrir "Alterar textos dos tipos"; no campo do Auxiliar, ir ao fim, pular linha, clicar em **✕ Não pode** (a marca entrou na linha) e digitar; **Salvar texto** (toast "Texto de Auxiliar alterado"); fechar; o popover "Tipos de usuário" mostra a linha nova com o ícone vermelho; **recarregar a página** e abrir de novo: o texto continua (veio do banco); no formulário "Novo Usuário", escolher Auxiliar mostra a linha nova; **Restaurar padrão** e salvar devolve o texto original.
- **Formatos:** dialog aberto em 1920×1080, 1366×768, 1080×1920, 720×1280 e 960×1080, em claro e escuro (dez capturas), sem erro de console e sem erro de página.
- **Gestor:** não vê "Alterar textos dos tipos" e abre "Tipos de usuário" normalmente.

## Achados da verificação

- O primeiro script falhou porque o `aria-label` dos botões ✓/✕ estava no `p-button` e não no `<button>`; trocado por `[ariaLabel]` (o teste de componente, que procurava pelo texto, não pegava isso).
- O dialog não fecha com Esc (o `p-dialog` do projeto não liga `closeOnEscape` aqui, igual ao "Alterar prioridades"); fecha pelo "Fechar", pela máscara e pelo X. Não foi alterado.
- A migration foi desenhada duas vezes: a primeira, com tabela de itens, fez o teste guardião de tabelas `tipo_*` falhar; sumiu com a troca de desenho pedida pelo autor.

## Limites

- Os textos padrão continuam **rascunho do agente** (de `SYSTEM.SPEC.md` §14); o administrador agora os ajusta pela tela, mas a primeira revisão é do autor.
- Foco por teclado e leitor de tela do dialog e do popover não foram exercitados.
- Conflito de edição entre dois administradores ao mesmo tempo: vale o último que salva (sem versão).
- A captura do popover logo depois de salvar pegou a animação de entrada; o conteúdo, não o enquadramento, foi o que se conferiu ali.
- Capturas em `.artifacts/306-usuarios-legenda-dos-tipos/` (arquivos `308-*`, ignorada pelo Git).
