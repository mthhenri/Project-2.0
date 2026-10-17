# Task 113 — verificação

Data: 2026-10-16. Frontend apenas.

**Análogo escolhido:** a listagem de Projetos (112) para a toolbar (busca com `/`, `p-selectbutton`, "Limpar", estados
vazios), o chip/otimismo + "Desfazer" de 99/112 e o formulário de demanda (109) para o dialog enxuto.

## O que foi feito

- **Status em switch** (`p-toggleswitch` + rótulo "Ativo/Inativo") direto na linha; linha inativa a 60% de opacidade.
  Alternância otimista (1 `PUT`), toast "Desfazer" (novo `PUT` com o status anterior) e reversão do switch em erro.
  Desabilitado para quem não é gestor e na própria linha (inativar a si mesmo derrubaria a sessão).
- **Ações no hover/foco** (sempre visíveis em dispositivos sem hover): lápis abre o **Editar direto**
  (`abrirEdicao(id)` busca `GET /usuario/:id`), cadeado abre **Alterar senha direto**, lixeira exclui com Desfazer
  (esta só para gestor e para outra pessoa). Clique na linha abre o Perfil (leitura); Editar/Alterar Senha do Perfil
  fecham o Perfil e abrem os mesmos dialogs.
- **Coluna Usuário:** `app-usuario-cartao` (antes órfão) adaptado: avatar de iniciais + nome + login. Anotações:
  ícone destacado só com `temAnotacoes`; vazio, só aparece no hover da linha; a célula inteira abre o dialog direto.
- **Toolbar:** busca (`/` foca, Esc limpa, debounce 300 ms) + `p-selectbutton` Tipo (Todos/Desenvolvedores/Gestores) e
  Status (Todos/Ativos/Inativos), escolha persistida em `localStorage` (`usuario.filtros`; primeira visita em "Todos").
  Header com o contador `{totalItens} usuários`. Estados vazios com "Limpar filtros" / "Criar o primeiro usuário".
- **Dialog unificado** (`app-usuario-formulario-dialog`): criar = autofocus no Nome, **login sugerido do nome**
  (`João da Silva` → `joao.silva`, sem acento; para de acompanhar quando o login é editado), **senha já gerada**
  (12 caracteres sem ambíguos, com símbolo e dígito) com Gerar e Copiar, Cargo, Tipo segmentado (padrão
  Desenvolvedor) e Horas (padrão 8); editar = sem login/senha, com Status; Tipo desabilitado no próprio perfil.
  Enter envia. Novo `app-usuario-senha-dialog` (senha gerada + copiar). O perfil perdeu os dois dialogs internos.
- `utils/usuario-credenciais.util.ts` (`sugerirLogin`, `gerarSenha`, `iniciaisDoNome`).

## Verificação ao vivo (Chromium, API real, gestor)

- Inativar: 1 clique → `PUT /usuario/3`, rótulo "Inativo", linha esmaecida; Desfazer → novo `PUT`, volta "Ativo".
- Editar: lápis (2 cliques com o salvar por Enter), foco no Nome, `PUT`, dialog fecha, cargo atualizado na linha.
- Alterar senha: cadeado → senha gerada preenchida → Enter → `PATCH /usuario/3/senha`.
- Novo usuário: foco no Nome; digitar "Álvaro Müller da Costa" gera o login `alvaro.costa` e a senha; editar o login à
  mão congela a sugestão; nome + cargo + Enter → `POST /usuario`, dialog fecha, 8 usuários.
- Filtros: Gestores + Inativos → empty state com "Limpar filtros"; recarregar mantém a escolha; Limpar volta a 8; `/`
  + "alvaro" → 1 usuário; Esc restaura 8. Excluir pela lixeira 8 → 7, Desfazer → 8.
- Perfil por clique na linha e "Editar" do perfil abrem o dialog de edição. Anotações: clique na célula abre o dialog
  direto; usuário com anotação salva aparece com o ícone destacado após recarregar.
- Própria linha: switch desabilitado, sem lixeira. 1920×1080, 1366×768 e 1080×1920: sem overflow horizontal.
  Capturas em `.artifacts/113-usuarios-switch-acoes-diretas/`.

## Achados da verificação (corrigidos)

- O template `pTemplate="empty"` não renderiza no PrimeNG 21: o estado vazio nunca aparecia (já era assim antes);
  passou a `emptymessage`. A listagem de Atividades ainda usa `empty` (fora do escopo).
- O ícone de anotações "vazio" aparecia sempre (seletor aninhado em `:host ::ng-deep` não casava); regras separadas.
- As tags do Perfil ocupavam a largura inteira; passam a seguir o texto.

## Impacto

- `app-usuario-perfil-dialog` agora só lê (inputs/outputs mudaram: `editarSolicitado`, `senhaSolicitada`); a única
  consumidora é a listagem. `app-usuario-formulario-dialog` ganhou `abrirEdicao` e `aoAlterar`.
- A rota `/usuario` é só de gestor (o desenvolvedor é redirecionado ao Ponto): as regras "editar o próprio cadastro"
  ficaram por coerência com o backend, mas não são alcançáveis hoje pela tela.

## Registrado para o backend (fora do escopo)

- Hoje é possível inativar o **último gestor ativo** pelo status (a regra "ao menos um gestor ativo" só cobre o
  rebaixamento de tipo). A tela só impede inativar a si mesmo.

## Limites / pendente

- Sem ordenação de colunas (o `UsuarioListarDto` não suporta). Sem contador "N ativos".
- Visão do desenvolvedor não verificável (a rota é bloqueada). Frontend sem testes automatizados (P-001).
