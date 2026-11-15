# 455-encerrar-execucao-descricao-obrigatoria-pelo-dono.spec.md

> Task 127/158 da guarda-chuva `requisicoes-e-permissoes-correcoes.spec.md`. Origem: achado A-170 do dossiê `docs/specs/active/revisao-requisicoes-e-permissoes/DOSSIE.md`.
> Severidade: Baixa. Área: frontend/execucao e casca. **Tem decisão do autor pendente** (seção própria): não implementar antes dela.

## Objetivo

O painel "Agora" de Execuções e o chip da topbar passam a decidir se a descrição é obrigatória pelo tipo do dono da atividade, como o backend e a listagem de atividades fazem. Hoje usam o tipo de quem está logado: o gestor encerrando a execução de um desenvolvedor não é avisado e recebe o erro do servidor.

## Contexto

**A-170 · Baixa · Descrição obrigatória ao encerrar execução: o backend decide pelo dono da atividade, dois pontos do front decidem por quem está logado**

No backend a descrição é obrigatória quando o dono da atividade não é gestor. No painel 'Agora' de /execucao e no chip da topbar o front usa o tipo do usuário logado (sessao.eGestor()), enquanto a listagem de atividades e o painel da demanda usam o tipo do dono. Para o gestor que pausa a execução de um desenvolvedor pelo 'Agora', o campo aparece como opcional e o backend responde 400 se ele for esvaziado.

Evidência no código (linhas de 2026-11-13; confira antes de editar):

- backend/src/modules/execucao/services/execucao.service.ts:430-433 — descricaoObrigatoria = !tipoDono || !temPermissaoDeGestor(tipoDono)
- frontend/src/app/modules/execucao/pages/execucao-historico/execucao-historico.page.html:127 — [descricaoObrigatoria]="!sessao.eGestor()"
- frontend/src/app/modules/execucao/components/execucao-agora/execucao-agora.component.ts:52 — descricaoOpcional: !this.descricaoObrigatoria()
- frontend/src/app/shared/layout/topbar/chip-execucao-ativa/chip-execucao-ativa.component.ts:59 — descricaoOpcional: this.sessao.eGestor()
- frontend/src/app/modules/atividade/pages/atividade-listagem/atividade-listagem.page.ts:596 — aqui usa o dono: temPermissaoDeGestor(atividade.usuarioTipo)

Como observar: Como gestor, em /execucao sem filtro de usuário, pausar pelo painel 'Agora' a execução de um desenvolvedor: o rótulo mostra '(opcional)'; apagar o texto e confirmar deve voltar 400 'A descrição é obrigatória'.

Verificação na auditoria: código, por um auditor; arquivo e linha das evidências conferidos por script.

## Decisão do autor pendente

Se `ExecucaoItemDto` e `ExecucaoAtivaDto` não trouxerem o tipo do dono, a correção pede campo novo.

**Antes:** `sessao.eGestor()` nos dois pontos.

**Opções:**

1. Usar o tipo do dono, com o campo novo nos DTOs se faltar.
2. Sem campo novo: tratar o erro do servidor pedindo a descrição na hora.

## Entregáveis

1. A opção escolhida nos dois pontos, com teste de componente (gestor encerrando execução de desenvolvedor vê a descrição como obrigatória).

## Critérios de Aceite

- Ao vivo: gestor encerra pelo chip a execução de um desenvolvedor e o diálogo exige a descrição antes de enviar.
- Testes e build dos workspaces tocados e `npm run lint:tudo` sem erro novo.

## Fora de Escopo

Qualquer outro achado do dossiê; cada um tem a sua spec.

## Dependências

Decisão do autor acima.

