import { TipoUsuarioEnum } from '@project20/shared';
import type { ConexaoTeste } from './banco-teste';

// Fábricas de dados para testes de integração. Nenhuma coluna tem DEFAULT, então cada fábrica
// preenche todos os campos e aceita sobrescrita parcial. SQL direto com parâmetros nomeados; os
// códigos das tabelas `tipo_*` são resolvidos por subconsulta (as linhas de referência vêm das migrations).
// Datas: sempre explícitas (as colunas de auditoria recebem `dataBase`), porque NOW() fica congelado
// na transação de teste.

/** Instante fixo usado nas colunas de auditoria das linhas criadas pelas fábricas. */
export const DATA_BASE_TESTE = '2026-01-15T12:00:00-03:00';

let contador = 0;
/** Sufixo único dentro do processo, para campos com índice único (login, código, nome). */
export function proximoSufixo(): number {
  contador += 1;
  return contador;
}

export interface UsuarioFabricado { id: number; login: string; tipo: TipoUsuarioEnum }
export interface ProjetoFabricado { id: number; codigo: string; nome: string }
export interface DemandaFabricada { id: number; projetoId: number; demandaPaiId: number | null }
export interface TagFabricada { id: number; nome: string; cor: string }
export interface AtividadeFabricada { id: number; demandaId: number; usuarioId: number }
export interface ExecucaoFabricada { id: number; atividadeId: number }

async function inserirLinha<T>(conexao: ConexaoTeste, sql: string, parametros: Record<string, unknown>): Promise<T> {
  const resultado = await conexao.raw(sql, parametros as any);
  return resultado.rows[0] as T;
}

type SobrescritaUsuario = Partial<{
  login: string; senhaEncriptada: string; nomeCompleto: string; cargoTitulo: string;
  tipo: TipoUsuarioEnum; statusCodigo: string; horasDiariasNecessarias: number; dataBase: string;
}>;

export async function criarUsuario(conexao: ConexaoTeste, sobrescrita: SobrescritaUsuario = {}): Promise<UsuarioFabricado> {
  const sufixo = proximoSufixo();
  const dados = {
    login: `usuario.teste.${sufixo}`,
    senhaEncriptada: '$2b$10$senhaDeTesteNaoUsadaParaAutenticar',
    nomeCompleto: `Usuário de Teste ${sufixo}`,
    cargoTitulo: 'Cargo de Teste',
    tipo: TipoUsuarioEnum.DESENVOLVEDOR,
    statusCodigo: 'ATIVO',
    horasDiariasNecessarias: 8,
    dataBase: DATA_BASE_TESTE,
    ...sobrescrita,
  };
  return inserirLinha<UsuarioFabricado>(conexao,
    `INSERT INTO usuario (login, senha_encriptada, nome_completo, cargo_titulo, horas_diarias_necessarias,
       tipo_usuario_id, tipo_usuario_status_id, created_date, updated_date, is_deleted)
     SELECT :login, :senhaEncriptada, :nomeCompleto, :cargoTitulo, :horasDiariasNecessarias,
       (SELECT tipo_usuario.id FROM tipo_usuario WHERE tipo_usuario.codigo = :tipo),
       (SELECT tipo_usuario_status.id FROM tipo_usuario_status WHERE tipo_usuario_status.codigo = :statusCodigo),
       :dataBase::timestamptz, :dataBase::timestamptz, false
     RETURNING id, login, :tipo::text AS tipo`, dados);
}

export function criarDesenvolvedor(conexao: ConexaoTeste, sobrescrita: SobrescritaUsuario = {}) {
  return criarUsuario(conexao, { ...sobrescrita, tipo: TipoUsuarioEnum.DESENVOLVEDOR });
}
export function criarGestor(conexao: ConexaoTeste, sobrescrita: SobrescritaUsuario = {}) {
  return criarUsuario(conexao, { ...sobrescrita, tipo: TipoUsuarioEnum.GESTOR });
}
export function criarAdministrador(conexao: ConexaoTeste, sobrescrita: SobrescritaUsuario = {}) {
  return criarUsuario(conexao, { ...sobrescrita, tipo: TipoUsuarioEnum.ADMINISTRADOR });
}

export async function criarProjeto(
  conexao: ConexaoTeste,
  sobrescrita: Partial<{
    nome: string; codigo: string; cor: string; statusCodigo: string;
    inicioData: string | null; previsaoFimData: string | null; dataBase: string;
  }> = {},
): Promise<ProjetoFabricado> {
  const sufixo = proximoSufixo();
  return inserirLinha<ProjetoFabricado>(conexao,
    `INSERT INTO projeto (nome, codigo, cor, tipo_projeto_status_id, inicio_data, previsao_fim_data,
       created_date, updated_date, is_deleted)
     SELECT :nome, :codigo, :cor,
       (SELECT tipo_projeto_status.id FROM tipo_projeto_status WHERE tipo_projeto_status.codigo = :statusCodigo),
       :inicioData, :previsaoFimData, :dataBase::timestamptz, :dataBase::timestamptz, false
     RETURNING id, codigo, nome`,
    {
      nome: `Projeto de Teste ${sufixo}`, codigo: `PT${sufixo}`, cor: '#336699', statusCodigo: 'ATIVO',
      inicioData: null, previsaoFimData: null, dataBase: DATA_BASE_TESTE, ...sobrescrita,
    });
}

/** Demanda raiz (sem `demandaPaiId`) ou filha (informe `demandaPaiId`). Sem `projetoId`, cria um projeto. */
export async function criarDemanda(
  conexao: ConexaoTeste,
  sobrescrita: Partial<{
    projetoId: number; demandaPaiId: number | null; nome: string; descricaoTecnica: string | null;
    descricaoCliente: string | null; documentacao: string | null; horasEstimadas: number;
    statusCodigo: string; isEstrutural: boolean; previsaoFimData: string | null; dataBase: string;
  }> = {},
): Promise<DemandaFabricada> {
  const sufixo = proximoSufixo();
  const projetoId = sobrescrita.projetoId ?? (await criarProjeto(conexao)).id;
  const dados = {
    nome: `Demanda de Teste ${sufixo}`, demandaPaiId: null, descricaoTecnica: null, descricaoCliente: null,
    documentacao: null, horasEstimadas: 8, statusCodigo: 'PENDENTE', isEstrutural: false,
    previsaoFimData: null, dataBase: DATA_BASE_TESTE, ...sobrescrita, projetoId,
  };
  return inserirLinha<DemandaFabricada>(conexao,
    `INSERT INTO demanda (projeto_id, demanda_pai_id, nome, descricao_tecnica, descricao_cliente, documentacao,
       horas_estimadas, tipo_demanda_status_id, is_estrutural, previsao_fim_data, versao, created_date, updated_date, is_deleted)
     SELECT :projetoId, :demandaPaiId, :nome, :descricaoTecnica, :descricaoCliente, :documentacao, :horasEstimadas,
       (SELECT tipo_demanda_status.id FROM tipo_demanda_status WHERE tipo_demanda_status.codigo = :statusCodigo),
       :isEstrutural, :previsaoFimData, 1, :dataBase::timestamptz, :dataBase::timestamptz, false
     RETURNING id, projeto_id AS "projetoId", demanda_pai_id AS "demandaPaiId"`, dados);
}

export async function criarDemandaUsuario(
  conexao: ConexaoTeste,
  dados: { demandaId: number; usuarioId: number; dataBase?: string },
): Promise<{ id: number }> {
  return inserirLinha<{ id: number }>(conexao,
    `INSERT INTO demanda_usuario (demanda_id, usuario_id, created_date, updated_date, is_deleted)
     SELECT :demandaId, :usuarioId, :dataBase::timestamptz, :dataBase::timestamptz, false
     RETURNING id`, { dataBase: DATA_BASE_TESTE, ...dados });
}

export async function criarTag(
  conexao: ConexaoTeste,
  sobrescrita: Partial<{ nome: string; cor: string; dataBase: string }> = {},
): Promise<TagFabricada> {
  const sufixo = proximoSufixo();
  return inserirLinha<TagFabricada>(conexao,
    `INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
     SELECT :nome, :cor, :dataBase::timestamptz, :dataBase::timestamptz, false
     RETURNING id, nome, cor`,
    { nome: `Tag de Teste ${sufixo}`, cor: '#ff8800', dataBase: DATA_BASE_TESTE, ...sobrescrita });
}

/** Atividade da demanda (criada se não informada) com dono (desenvolvedor criado se não informado). */
export async function criarAtividade(
  conexao: ConexaoTeste,
  sobrescrita: Partial<{
    demandaId: number; usuarioId: number; nome: string; statusCodigo: string;
    prioridadeCodigo: string; dataBase: string;
  }> = {},
): Promise<AtividadeFabricada> {
  const sufixo = proximoSufixo();
  const demandaId = sobrescrita.demandaId ?? (await criarDemanda(conexao)).id;
  const usuarioId = sobrescrita.usuarioId ?? (await criarDesenvolvedor(conexao)).id;
  return inserirLinha<AtividadeFabricada>(conexao,
    `INSERT INTO atividade (demanda_id, usuario_id, nome, tipo_atividade_status_id, tipo_atividade_prioridade_id,
       created_date, updated_date, is_deleted)
     SELECT :demandaId, :usuarioId, :nome,
       (SELECT tipo_atividade_status.id FROM tipo_atividade_status WHERE tipo_atividade_status.codigo = :statusCodigo),
       (SELECT tipo_atividade_prioridade.id FROM tipo_atividade_prioridade WHERE tipo_atividade_prioridade.codigo = :prioridadeCodigo),
       :dataBase::timestamptz, :dataBase::timestamptz, false
     RETURNING id, demanda_id AS "demandaId", usuario_id AS "usuarioId"`,
    {
      nome: `Atividade de Teste ${sufixo}`, statusCodigo: 'PENDENTE', prioridadeCodigo: 'INDEFINIDA',
      dataBase: DATA_BASE_TESTE, ...sobrescrita, demandaId, usuarioId,
    });
}

/** Execução com início e fim explícitos (`fimData: null` = execução ativa). */
export async function criarExecucao(
  conexao: ConexaoTeste,
  dados: { atividadeId: number; inicioData: string; fimData: string | null; descricao?: string; dataBase?: string },
): Promise<ExecucaoFabricada> {
  return inserirLinha<ExecucaoFabricada>(conexao,
    `INSERT INTO execucao (atividade_id, descricao, inicio_data, fim_data, created_date, updated_date, is_deleted)
     SELECT :atividadeId, :descricao, :inicioData::timestamptz, :fimData::timestamptz,
       :dataBase::timestamptz, :dataBase::timestamptz, false
     RETURNING id, atividade_id AS "atividadeId"`,
    { descricao: '', dataBase: DATA_BASE_TESTE, ...dados });
}

export async function criarDiaNaoUtil(
  conexao: ConexaoTeste,
  sobrescrita: Partial<{
    diaData: string; descricao: string; recorrente: boolean; tipoCodigo: string; duracaoCodigo: string; dataBase: string;
  }> = {},
): Promise<{ id: number }> {
  const sufixo = proximoSufixo();
  return inserirLinha<{ id: number }>(conexao,
    `INSERT INTO dia_nao_util (dia_data, descricao, recorrente, tipo_dia_nao_util_id, tipo_dia_nao_util_duracao_id,
       created_date, updated_date, is_deleted)
     SELECT :diaData::date, :descricao, :recorrente,
       (SELECT tipo_dia_nao_util.id FROM tipo_dia_nao_util WHERE tipo_dia_nao_util.codigo = :tipoCodigo),
       (SELECT tipo_dia_nao_util_duracao.id FROM tipo_dia_nao_util_duracao WHERE tipo_dia_nao_util_duracao.codigo = :duracaoCodigo),
       :dataBase::timestamptz, :dataBase::timestamptz, false
     RETURNING id`,
    {
      diaData: '2026-03-10', descricao: `Dia não útil de teste ${sufixo}`, recorrente: false,
      tipoCodigo: 'FERIADO', duracaoCodigo: 'INTEGRAL', dataBase: DATA_BASE_TESTE, ...sobrescrita,
    });
}

/** Justificativa de ponto de um usuário num dia (`diaData` `AAAA-MM-DD`), criada por um gestor. */
export async function criarPontoJustificativa(
  conexao: ConexaoTeste,
  dados: {
    usuarioId: number; gestorId: number; diaData: string; nome?: string; descricao?: string;
    horasCobertas?: number; dataBase?: string;
  },
): Promise<{ id: number }> {
  const sufixo = proximoSufixo();
  return inserirLinha<{ id: number }>(conexao,
    `INSERT INTO ponto_justificativa (usuario_id, gestor_id, dia_data, nome, descricao, horas_cobertas,
       created_date, updated_date, is_deleted)
     SELECT :usuarioId, :gestorId, :diaData::date, :nome, :descricao, :horasCobertas,
       :dataBase::timestamptz, :dataBase::timestamptz, false
     RETURNING id`,
    { nome: `Justificativa de teste ${sufixo}`, descricao: 'Descrição de teste', horasCobertas: 2, dataBase: DATA_BASE_TESTE, ...dados });
}

/** Conexão do grafo (origem → destino; `ehBidirecional` liga também no sentido inverso). */
export async function criarDemandaConexao(
  conexao: ConexaoTeste,
  dados: { demandaOrigemId: number; demandaDestinoId: number; ehBidirecional?: boolean; dataBase?: string },
): Promise<{ id: number }> {
  return inserirLinha<{ id: number }>(conexao,
    `INSERT INTO demanda_conexao (demanda_origem_id, demanda_destino_id, eh_bidirecional, created_date, updated_date, is_deleted)
     SELECT :demandaOrigemId, :demandaDestinoId, :ehBidirecional, :dataBase::timestamptz, :dataBase::timestamptz, false
     RETURNING id`,
    { ehBidirecional: false, dataBase: DATA_BASE_TESTE, ...dados });
}

export async function criarDemandaTag(
  conexao: ConexaoTeste,
  dados: { demandaId: number; tagId: number; dataBase?: string },
): Promise<{ id: number }> {
  return inserirLinha<{ id: number }>(conexao,
    `INSERT INTO demanda_tag (demanda_id, tag_id, created_date, updated_date, is_deleted)
     SELECT :demandaId, :tagId, :dataBase::timestamptz, :dataBase::timestamptz, false
     RETURNING id`,
    { dataBase: DATA_BASE_TESTE, ...dados });
}

const TABELAS_COM_SOFT_DELETE = new Set([
  'usuario', 'projeto', 'tag', 'demanda', 'demanda_usuario', 'demanda_conexao', 'demanda_tag', 'atividade', 'atividade_tag', 'execucao', 'dia_nao_util', 'ponto_justificativa',
]);

/** Marca a linha de uma tabela de negócio como excluída (soft delete direto, para montar cenários). */
export async function excluirLinha(conexao: ConexaoTeste, tabela: string, id: number): Promise<void> {
  if (!TABELAS_COM_SOFT_DELETE.has(tabela)) throw new Error(`Tabela fora da lista de soft delete dos testes: ${tabela}`);
  await conexao.raw(`UPDATE ${tabela} SET is_deleted = true, deleted_date = NOW() WHERE id = :id`, { id });
}
