import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';

/** As marcas das linhas de "Pode" e "Não pode": a tela as pinta (verde e vermelho) e o editor as insere. */
export const MARCA_AJUDA_PODE = '✓';
export const MARCA_AJUDA_NAO_PODE = '✕';

/**
 * Texto de ajuda de cada tipo de usuário (task 306/308), em Markdown: uma frase do que o tipo é e as seções "Pode" e "Não pode", uma linha por
 * item começando por `✓` (pode) ou `✕` (não pode). É o **padrão**: o administrador edita o texto na tela e o que vale é o gravado em
 * `tipo_usuario.descricao` (semeado pela migration 0078 com estes mesmos textos); "Restaurar padrão" volta a este. A regra de verdade é
 * `docs/SYSTEM.SPEC.md` §14 e as funções de `permissao-usuario.ts`: **mudar uma permissão obriga rever o texto daqui**.
 */
export const DESCRICAO_TIPO_USUARIO: Readonly<Record<TipoUsuarioEnum, string>> = {
    [TipoUsuarioEnum.DESENVOLVEDOR]: `Quem executa o trabalho: registra as próprias atividades, o tempo e o ponto.

### Pode
✓ Executar as próprias atividades e bater o próprio ponto
✓ Ver os projetos em que tem demanda e editar as demandas de que é membro
✓ Entrar e sair de demandas por conta própria e criar sub-demanda

### Não pode
✕ Criar projeto ou demanda raiz
✕ Ver ou editar execuções e ponto de outras pessoas
✕ Gerenciar usuários`,
    [TipoUsuarioEnum.AUXILIAR]: `Um desenvolvedor que também conduz o trabalho: enxerga tudo e organiza a equipe.

### Pode
✓ Tudo o que o desenvolvedor faz
✓ Ver todos os projetos, demandas e atividades
✓ Editar qualquer demanda, conectar demandas e atribuir membros e tags
✓ Iniciar e pausar a execução de qualquer atividade

### Não pode
✕ Criar ou editar projeto e excluir demanda
✕ Escrever a descrição para o cliente
✕ Gerenciar usuários, calendário e relatórios`,
    [TipoUsuarioEnum.GESTOR]: `Quem conduz projetos e equipe, com acesso total ao trabalho.

### Pode
✓ Tudo o que o auxiliar faz
✓ Criar e editar projetos; excluir e restaurar demandas
✓ Gerenciar usuários, calendário e relatórios
✓ Justificar e imprimir o ponto da equipe

### Não pode
✕ Criar, promover ou excluir administradores
✕ Participar de demandas como membro (o acesso é total)`,
    [TipoUsuarioEnum.ADMINISTRADOR]: `Um gestor com mais poder: cuida de quem administra o sistema.

### Pode
✓ Tudo o que o gestor faz
✓ Criar, promover, alterar, inativar e excluir administradores
✓ Alterar as configurações da IA

### Não pode
✕ Deixar o sistema sem administrador: o último não pode ser rebaixado, inativado nem excluído`,
};

/** Os tipos na ordem em que a ajuda os mostra (do menor para o maior poder). */
export const TIPOS_USUARIO_NA_ORDEM_DA_AJUDA: readonly TipoUsuarioEnum[] = [
    TipoUsuarioEnum.DESENVOLVEDOR,
    TipoUsuarioEnum.AUXILIAR,
    TipoUsuarioEnum.GESTOR,
    TipoUsuarioEnum.ADMINISTRADOR,
];
