-- UP

-- Texto de ajuda de cada tipo de usuário (task 308): Markdown com linhas "✓ ..." (pode) e "✕ ..." (não pode), que o administrador edita na
-- tela de Usuários. Os valores semeados são os mesmos de DESCRICAO_TIPO_USUARIO (shared), que a tela usa também como padrão do
-- "Restaurar padrão". Texto livre, sem estrutura em tabela: a tela só pinta as linhas com as marcas.
ALTER TABLE tipo_usuario ADD COLUMN ajuda_markdown VARCHAR(2000);

UPDATE tipo_usuario SET ajuda_markdown = 'Quem executa o trabalho: registra as próprias atividades, o tempo e o ponto.

### Pode
✓ Executar as próprias atividades e bater o próprio ponto
✓ Ver os projetos em que tem demanda e editar as demandas de que é membro
✓ Entrar e sair de demandas por conta própria e criar sub-demanda

### Não pode
✕ Criar projeto ou demanda raiz
✕ Ver ou editar execuções e ponto de outras pessoas
✕ Gerenciar usuários' WHERE tipo_usuario.codigo = 'DESENVOLVEDOR' AND tipo_usuario.is_deleted = false;

UPDATE tipo_usuario SET ajuda_markdown = 'Um desenvolvedor que também conduz o trabalho: enxerga tudo e organiza a equipe.

### Pode
✓ Tudo o que o desenvolvedor faz
✓ Ver todos os projetos, demandas e atividades
✓ Editar qualquer demanda, conectar demandas e atribuir membros e tags
✓ Iniciar e pausar a execução de qualquer atividade

### Não pode
✕ Criar ou editar projeto e excluir demanda
✕ Escrever a descrição para o cliente
✕ Gerenciar usuários, calendário e relatórios' WHERE tipo_usuario.codigo = 'AUXILIAR' AND tipo_usuario.is_deleted = false;

UPDATE tipo_usuario SET ajuda_markdown = 'Quem conduz projetos e equipe, com acesso total ao trabalho.

### Pode
✓ Tudo o que o auxiliar faz
✓ Criar e editar projetos; excluir e restaurar demandas
✓ Gerenciar usuários, calendário e relatórios
✓ Justificar e imprimir o ponto da equipe

### Não pode
✕ Criar, promover ou excluir administradores
✕ Participar de demandas como membro (o acesso é total)' WHERE tipo_usuario.codigo = 'GESTOR' AND tipo_usuario.is_deleted = false;

UPDATE tipo_usuario SET ajuda_markdown = 'Um gestor com mais poder: cuida de quem administra o sistema.

### Pode
✓ Tudo o que o gestor faz
✓ Criar, promover, alterar, inativar e excluir administradores
✓ Alterar as configurações da IA

### Não pode
✕ Deixar o sistema sem administrador: o último não pode ser rebaixado, inativado nem excluído' WHERE tipo_usuario.codigo = 'ADMINISTRADOR' AND tipo_usuario.is_deleted = false;

ALTER TABLE tipo_usuario ALTER COLUMN ajuda_markdown SET NOT NULL;

-- DOWN

ALTER TABLE tipo_usuario DROP COLUMN ajuda_markdown;
