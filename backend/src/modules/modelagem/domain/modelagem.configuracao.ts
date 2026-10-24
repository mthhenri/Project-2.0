import type { ConfiguracaoModelagem } from './modelagem';

/**
 * O que o catálogo do banco não diz e que não é escolha de ninguém na tela: as colunas que existem em toda tabela e ficam fora do
 * desenho e as colunas sem FK cujo nome não revela a tabela que apontam. Grupos e posições são do gestor (tabelas `modelagem_grupo`
 * e `modelagem_tabela`).
 */
export const CONFIGURACAO_MODELAGEM: ConfiguracaoModelagem = {
  colunasOcultas: ['created_date', 'updated_date', 'is_deleted', 'deleted_date'],
  referenciasLogicas: {
    'chat_mensagem.proposta_id': 'proposta_ia',
    'mensagem_direta.usuario_menor_id': 'usuario',
    'mensagem_direta.usuario_maior_id': 'usuario',
  },
};
