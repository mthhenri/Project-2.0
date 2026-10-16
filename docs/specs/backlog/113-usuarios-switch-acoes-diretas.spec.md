# 113 — Usuários: status em switch, ações diretas na linha e criação com defaults

**Origem:** Revisão de UI/UX — prints `prints/21-usuario-listagem.png` e `prints/22-usuario-novo-dialog.png`, análise `analise-detalhada/usuario-listagem.md`

**Depende de:** 97, 99 (undo)

**Entrega:** listagem de Usuários com status alternável por `p-toggleswitch` direto na linha (otimista + Desfazer), ações reveladas no hover (editar / alterar senha / excluir — sem passar pelo dialog de perfil), filtros segmentados de 1 clique persistidos, e dialog criar/editar unificado com login auto-gerado e gerador de senha.

> **Frontend apenas.**

---

## Escopo

1. **Coluna Status**: `p-toggleswitch` + rótulo (linha inativa com opacidade 0.6); alternância otimista com **reversão do switch em erro** + toast com Desfazer. ⚠️ Registrar para o backend: hoje é possível inativar o último gestor ativo via status (a regra "mínimo 1 gestor" só cobre rebaixamento de tipo) — validar com o time.
2. **Ações no hover** (sempre visíveis em touch): lápis → Editar direto (fetch `GET /usuario/:id` com skeleton breve — o resumo não traz `horasDiariasNecessarias`); cadeado → Alterar senha direto; lixeira → excluir com undo. Linha clicável abre o Perfil (leitura) como atalho, nunca como pedágio.
3. **Coluna Usuário**: avatar de iniciais + nome + login (adaptar `usuario-cartao`, hoje órfão). Coluna Anotações: ícone destacado só com `temAnotacoes`; célula abre o dialog/drawer direto.
4. **Toolbar**: busca (`/`, debounce) + segmentados Tipo (Todos/Desenvolvedores/Gestores) e Status (Todos/Ativos/Inativos — primeira visita em "Todos"; escolha persistida). Header com contador `{totalItens} usuários`.
5. **Dialog unificado**: criar com autofocus no Nome, **login auto-gerado** (para de sincronizar se editado), Senha com "Gerar" + copiar, Cargo + Horas (default 8), Tipo segmentado default Desenvolvedor; editar reaproveita o componente (sem senha; com Status; Tipo nunca editável no próprio perfil). Enter envia.
6. Sem ordenação de colunas (o `UsuarioListarDto` não suporta — fora de escopo).

## Critérios de aceite

- Inativar usuário: 1 clique (antes ~5); editar: 2 cliques.
- Criar usuário: digitar nome + cargo + Enter (login e senha gerados).

## NÃO implementar nesta task

- Contador "N ativos" no header (exigiria request extra); regra de "último gestor" no backend.
