import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';

/** O que a tela de Usuários explica de um tipo: uma frase do que ele é e o que pode e não pode fazer. */
export interface TipoUsuarioDescricao {
    queE: string;
    pode: readonly string[];
    naoPode: readonly string[];
}

/**
 * Texto de ajuda de cada tipo de usuário (task 306), na ordem em que a tela os mostra. É a versão curta, para quem decide o tipo de uma pessoa:
 * a regra de verdade é `docs/SYSTEM.SPEC.md` §14 e as funções de `permissao-usuario.ts`, e **mudar uma permissão obriga rever o texto daqui**.
 * Não vai para a coluna `descricao` de `tipo_usuario` (o nome de exibição).
 */
export const DESCRICAO_TIPO_USUARIO: Readonly<Record<TipoUsuarioEnum, TipoUsuarioDescricao>> = {
    [TipoUsuarioEnum.DESENVOLVEDOR]: {
        queE: 'Quem executa o trabalho: registra as próprias atividades, o tempo e o ponto.',
        pode: [
            'Executar as próprias atividades e bater o próprio ponto',
            'Ver os projetos em que tem demanda e editar as demandas de que é membro',
            'Entrar e sair de demandas por conta própria e criar sub-demanda',
        ],
        naoPode: ['Criar projeto ou demanda raiz', 'Ver ou editar execuções e ponto de outras pessoas', 'Gerenciar usuários'],
    },
    [TipoUsuarioEnum.AUXILIAR]: {
        queE: 'Um desenvolvedor que também conduz o trabalho: enxerga tudo e organiza a equipe.',
        pode: [
            'Tudo o que o desenvolvedor faz',
            'Ver todos os projetos, demandas e atividades',
            'Editar qualquer demanda, conectar demandas e atribuir membros e tags',
            'Iniciar e pausar a execução de qualquer atividade',
        ],
        naoPode: ['Criar ou editar projeto e excluir demanda', 'Escrever a descrição para o cliente', 'Gerenciar usuários, calendário e relatórios'],
    },
    [TipoUsuarioEnum.GESTOR]: {
        queE: 'Quem conduz projetos e equipe, com acesso total ao trabalho.',
        pode: [
            'Tudo o que o auxiliar faz',
            'Criar e editar projetos; excluir e restaurar demandas',
            'Gerenciar usuários, calendário e relatórios',
            'Justificar e imprimir o ponto da equipe',
        ],
        naoPode: ['Criar, promover ou excluir administradores', 'Participar de demandas como membro (o acesso é total)'],
    },
    [TipoUsuarioEnum.ADMINISTRADOR]: {
        queE: 'Um gestor com mais poder: cuida de quem administra o sistema.',
        pode: ['Tudo o que o gestor faz', 'Criar, promover, alterar, inativar e excluir administradores', 'Alterar as configurações da IA'],
        naoPode: ['Deixar o sistema sem administrador: o último não pode ser rebaixado, inativado nem excluído'],
    },
};

/** Os tipos na ordem em que a ajuda os mostra (do menor para o maior poder). */
export const TIPOS_USUARIO_NA_ORDEM_DA_AJUDA: readonly TipoUsuarioEnum[] = [
    TipoUsuarioEnum.DESENVOLVEDOR,
    TipoUsuarioEnum.AUXILIAR,
    TipoUsuarioEnum.GESTOR,
    TipoUsuarioEnum.ADMINISTRADOR,
];
