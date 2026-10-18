/**
 * Seed de desenvolvimento (task 162): um projeto de teste com demandas e atividades e um
 * desenvolvedor de teste já atribuído a elas, para o ambiente dev subir pronto.
 *
 *   npm run db:seed-dev --workspace=backend     # ou, na raiz: npm run db:seed-dev
 *
 * Roda depois das migrations. É idempotente (ignora o que já existe pelo login e pelo código do
 * projeto) e **recusa rodar em produção** (`APP_AMBIENTE=production` ou `DB_SSL=true`). Não faz parte
 * das migrations de propósito: dado de teste nunca deve ir para o banco de produção.
 */
import * as bcrypt from 'bcrypt';
import knex, { Knex } from 'knex';
import configuracao from '../knexfile';

export const DESENVOLVEDOR_SEED = {
  login: 'dev.teste',
  senha: 'project2026',
  nomeCompleto: 'Dev de Teste',
  cargoTitulo: 'Desenvolvedor',
  horasDiariasNecessarias: 8,
};

export const PROJETO_SEED = { codigo: 'DEMO', nome: 'Projeto Demo', cor: '#6366f1' };

export interface AtividadeSeed {
  nome: string;
  status: 'PLANEJADA' | 'PENDENTE' | 'DESENVOLVENDO' | 'DESENVOLVIDA';
  prioridade: 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAIXA' | 'INDEFINIDA';
}

export interface DemandaSeed {
  chave: string;
  nome: string;
  paiChave?: string;
  estrutural: boolean;
  status: 'PENDENTE' | 'PLANEJADA' | 'CONCLUIDA';
  horasEstimadas: number;
  descricaoTecnica?: string;
  atividades: AtividadeSeed[];
}

/** Árvore de demandas do projeto de teste. O desenvolvedor é atribuído a todas as não estruturais. */
export const DEMANDAS_SEED: readonly DemandaSeed[] = [
  { chave: 'auth', nome: 'Autenticação', estrutural: true, status: 'PLANEJADA', horasEstimadas: 0, atividades: [] },
  {
    chave: 'login', nome: 'Tela de login', paiChave: 'auth', estrutural: false, status: 'PLANEJADA', horasEstimadas: 8,
    descricaoTecnica: 'Formulário de login com validação e mensagem de erro.',
    atividades: [
      { nome: 'Montar o formulário', status: 'DESENVOLVENDO', prioridade: 'ALTA' },
      { nome: 'Tratar erro de credencial', status: 'PENDENTE', prioridade: 'MEDIA' },
    ],
  },
  {
    chave: 'recuperacao', nome: 'Recuperação de senha', paiChave: 'auth', estrutural: false, status: 'PENDENTE', horasEstimadas: 6,
    atividades: [{ nome: 'Desenhar o fluxo', status: 'PLANEJADA', prioridade: 'BAIXA' }],
  },
  { chave: 'relatorios', nome: 'Relatórios', estrutural: true, status: 'PLANEJADA', horasEstimadas: 0, atividades: [] },
  {
    chave: 'exportacao', nome: 'Exportação em PDF', paiChave: 'relatorios', estrutural: false, status: 'PLANEJADA', horasEstimadas: 12,
    descricaoTecnica: 'Gerar o relatório mensal em PDF a partir dos dados já consolidados.',
    atividades: [
      { nome: 'Escolher a biblioteca de PDF', status: 'DESENVOLVIDA', prioridade: 'MEDIA' },
      { nome: 'Gerar o cabeçalho e o rodapé', status: 'PENDENTE', prioridade: 'URGENTE' },
    ],
  },
  {
    chave: 'filtros', nome: 'Filtros por período', paiChave: 'relatorios', estrutural: false, status: 'CONCLUIDA', horasEstimadas: 4,
    atividades: [{ nome: 'Seletor de intervalo de datas', status: 'DESENVOLVIDA', prioridade: 'INDEFINIDA' }],
  },
  {
    chave: 'ajustes', nome: 'Ajustes gerais', estrutural: false, status: 'PENDENTE', horasEstimadas: 3,
    atividades: [{ nome: 'Revisar textos das telas', status: 'PLANEJADA', prioridade: 'BAIXA' }],
  },
];

/** A exportação só faz sentido depois dos filtros: dá ao grafo de demandas uma conexão para exibir. */
export const CONEXOES_SEED: readonly { origemChave: string; destinoChave: string }[] = [
  { origemChave: 'filtros', destinoChave: 'exportacao' },
];

export function ambienteEhProducao(ambiente: NodeJS.ProcessEnv): boolean {
  return ambiente.APP_AMBIENTE === 'production' || ambiente.DB_SSL === 'true';
}

export interface ResultadoSeed {
  jaExistia: boolean;
  demandas: number;
  atividades: number;
}

async function inserirDemanda(
  transacao: Knex.Transaction,
  projetoId: number,
  demanda: DemandaSeed,
  demandaPaiId: number | null,
): Promise<number> {
  const resultado = await transacao.raw(
    `INSERT INTO demanda (
       created_date, updated_date, is_deleted, projeto_id, demanda_pai_id, nome, descricao_tecnica,
       horas_estimadas, tipo_demanda_status_id, is_estrutural
     )
     SELECT NOW(), NOW(), false, :projetoId, :demandaPaiId, :nome, :descricaoTecnica,
            :horasEstimadas, tipo_demanda_status.id, :estrutural
     FROM tipo_demanda_status
     WHERE tipo_demanda_status.codigo = :status AND tipo_demanda_status.is_deleted = false
     RETURNING id`,
    {
      projetoId, demandaPaiId, nome: demanda.nome, descricaoTecnica: demanda.descricaoTecnica ?? null,
      horasEstimadas: demanda.horasEstimadas, estrutural: demanda.estrutural, status: demanda.status,
    },
  );
  return resultado.rows[0].id;
}

/** Cria o projeto de teste e o desenvolvedor de teste. Não faz nada se o projeto já existe. */
export async function semearDesenvolvimento(conexao: Knex): Promise<ResultadoSeed> {
  return conexao.transaction(async (transacao) => {
    const projetoExistente = await transacao.raw(
      'SELECT id FROM projeto WHERE codigo = :codigo AND is_deleted = false',
      { codigo: PROJETO_SEED.codigo },
    );
    if (projetoExistente.rows.length > 0) return { jaExistia: true, demandas: 0, atividades: 0 };

    // O usuário pode existir sem o projeto (seed interrompido ou projeto excluído): reaproveita.
    let desenvolvedor = (await transacao.raw(
      'SELECT id FROM usuario WHERE login = :login AND is_deleted = false',
      { login: DESENVOLVEDOR_SEED.login },
    )).rows[0];
    if (!desenvolvedor) {
      const senhaEncriptada = await bcrypt.hash(DESENVOLVEDOR_SEED.senha, 10);
      desenvolvedor = (await transacao.raw(
        `INSERT INTO usuario (
           created_date, updated_date, is_deleted, login, senha_encriptada, nome_completo, cargo_titulo,
           horas_diarias_necessarias, tipo_usuario_id, tipo_usuario_status_id
         )
         SELECT NOW(), NOW(), false, :login, :senhaEncriptada, :nomeCompleto, :cargoTitulo,
                :horasDiarias, tipo_usuario.id, tipo_usuario_status.id
         FROM tipo_usuario, tipo_usuario_status
         WHERE tipo_usuario.codigo = 'DESENVOLVEDOR' AND tipo_usuario.is_deleted = false
           AND tipo_usuario_status.codigo = 'ATIVO' AND tipo_usuario_status.is_deleted = false
         RETURNING id`,
        {
          login: DESENVOLVEDOR_SEED.login, senhaEncriptada, nomeCompleto: DESENVOLVEDOR_SEED.nomeCompleto,
          cargoTitulo: DESENVOLVEDOR_SEED.cargoTitulo, horasDiarias: DESENVOLVEDOR_SEED.horasDiariasNecessarias,
        },
      )).rows[0];
    }

    const projeto = (await transacao.raw(
      `INSERT INTO projeto (created_date, updated_date, is_deleted, nome, codigo, cor, tipo_projeto_status_id)
       SELECT NOW(), NOW(), false, :nome, :codigo, :cor, tipo_projeto_status.id
       FROM tipo_projeto_status
       WHERE tipo_projeto_status.codigo = 'ATIVO' AND tipo_projeto_status.is_deleted = false
       RETURNING id`,
      PROJETO_SEED,
    )).rows[0];

    const demandaIdPorChave = new Map<string, number>();
    let totalAtividades = 0;
    for (const demanda of DEMANDAS_SEED) {
      const paiId = demanda.paiChave ? (demandaIdPorChave.get(demanda.paiChave) ?? null) : null;
      const demandaId = await inserirDemanda(transacao, projeto.id, demanda, paiId);
      demandaIdPorChave.set(demanda.chave, demandaId);

      // Gestores não entram em demanda_usuario (acesso por tipo); só o desenvolvedor de teste.
      if (!demanda.estrutural) {
        await transacao.raw(
          `INSERT INTO demanda_usuario (created_date, updated_date, is_deleted, demanda_id, usuario_id)
           SELECT NOW(), NOW(), false, :demandaId, :usuarioId`,
          { demandaId, usuarioId: desenvolvedor.id },
        );
      }

      for (const atividade of demanda.atividades) {
        await transacao.raw(
          `INSERT INTO atividade (
             created_date, updated_date, is_deleted, demanda_id, usuario_id, nome,
             tipo_atividade_status_id, tipo_atividade_prioridade_id
           )
           SELECT NOW(), NOW(), false, :demandaId, :usuarioId, :nome,
                  tipo_atividade_status.id, tipo_atividade_prioridade.id
           FROM tipo_atividade_status, tipo_atividade_prioridade
           WHERE tipo_atividade_status.codigo = :status AND tipo_atividade_status.is_deleted = false
             AND tipo_atividade_prioridade.codigo = :prioridade AND tipo_atividade_prioridade.is_deleted = false`,
          { demandaId, usuarioId: desenvolvedor.id, nome: atividade.nome, status: atividade.status, prioridade: atividade.prioridade },
        );
        totalAtividades++;
      }
    }

    for (const conexao of CONEXOES_SEED) {
      await transacao.raw(
        `INSERT INTO demanda_conexao (created_date, updated_date, is_deleted, demanda_origem_id, demanda_destino_id, eh_bidirecional)
         SELECT NOW(), NOW(), false, :origemId, :destinoId, false`,
        { origemId: demandaIdPorChave.get(conexao.origemChave), destinoId: demandaIdPorChave.get(conexao.destinoChave) },
      );
    }

    return { jaExistia: false, demandas: demandaIdPorChave.size, atividades: totalAtividades };
  });
}

async function principal(): Promise<void> {
  // process.env é intencional (CLI fora do contexto NestJS), como no knexfile.
  if (ambienteEhProducao(process.env)) {
    console.error('Recusado: o seed de desenvolvimento não roda em produção (APP_AMBIENTE=production ou DB_SSL=true).');
    process.exitCode = 1;
    return;
  }

  const conexao = knex(configuracao);
  try {
    const resultado = await semearDesenvolvimento(conexao);
    if (resultado.jaExistia) {
      console.log(`O projeto ${PROJETO_SEED.codigo} já existe; nada foi alterado.`);
      return;
    }
    console.log(`Seed criado: projeto ${PROJETO_SEED.codigo}, ${resultado.demandas} demandas, ${resultado.atividades} atividades.`);
    console.log(`Desenvolvedor de teste: ${DESENVOLVEDOR_SEED.login} / ${DESENVOLVEDOR_SEED.senha}`);
  } finally {
    await conexao.destroy();
  }
}

if (require.main === module) {
  principal().catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  });
}
