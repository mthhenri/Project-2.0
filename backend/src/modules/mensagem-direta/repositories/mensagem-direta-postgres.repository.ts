import { Logger } from '@nestjs/common';
import { Knex } from 'knex';
import { AutorMensagemDiretaEnum, MensagemDiretaEnviadaDto, MensagemDiretaResumoDto } from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { BusinessException } from '../../../core/exceptions/business.exception';
import {
  ConsultaBuscaDireta,
  ConsultaConversaDireta,
  ConsultaConversasDoUsuario,
  ConsultaNaoLidas,
  ConsultaSupervisao,
  LIMITE_BUSCA_DIRETA,
  LIMITE_CONVERSAS_DO_USUARIO,
  PaginaDeConversasSupervisionadas,
  PaginaDeMensagensDiretas,
  ResumoDeConversaDireta,
  decodificarCursor,
  deBaldesDeNaoLidas,
  montarPaginaDeMensagens,
  validarConsultaBuscaDireta,
  validarConsultaConversaDireta,
  validarConsultaNaoLidas,
  validarPaginaDaSupervisao,
} from '../domain/mensagem-direta-consultas';
import {
  MensagemDiretaFonte,
  MensagemDiretaNova,
  REGEX_UUID,
  deFonteDireta,
  mesmaOrigemDaMensagem,
  paraFonteDireta,
  validarMensagemDiretaNova,
} from '../domain/mensagem-direta.documento';
import { ArmazenamentoDeMensagemDireta } from './armazenamento-de-mensagem-direta';

/** A linha de `mensagem_direta` (só a data vem como `Date` do driver; os arrays vêm como arrays). */
interface LinhaDeMensagemDireta {
  mensagem_id: string;
  conversa_id: string;
  usuario_menor_id: number;
  usuario_maior_id: number;
  autor_usuario_id: number | null;
  autor: string;
  texto: string;
  contem_codigo: boolean;
  mencoes: number[];
  referencias: string[];
  created_date: Date;
}

interface LinhaDeConversaDireta extends LinhaDeMensagemDireta {
  total_mensagens: number;
}

interface LinhaDeNaoLidas {
  conversa_id: string;
  total: number;
}

const COLUNAS_DA_MENSAGEM = `mensagem_id, conversa_id, usuario_menor_id, usuario_maior_id, autor_usuario_id, autor, texto, contem_codigo, mencoes,
  referencias, created_date`;

/** A pessoa é um dos dois participantes da conversa. */
const PARTICIPA_DA_CONVERSA = '(usuario_menor_id = :usuarioId OR usuario_maior_id = :usuarioId)';

/** Período e filtro de código, comuns à busca e à supervisão; `NULL` e `false` não filtram. */
const FILTROS_DE_RECORTE = `(CAST(:inicio AS timestamptz) IS NULL OR created_date >= CAST(:inicio AS timestamptz))
  AND (CAST(:fim AS timestamptz) IS NULL OR created_date <= CAST(:fim AS timestamptz))
  AND (NOT CAST(:somenteCodigo AS boolean) OR contem_codigo)`;

/** As mensagens que a supervisão considera: nenhuma conversa com os ids excluídos (gestores e administradores), mais texto, período e código. */
const FILTROS_DA_SUPERVISAO = `is_deleted = false
  AND NOT (usuario_menor_id = ANY(CAST(:usuarioIdsExcluidos AS integer[])) OR usuario_maior_id = ANY(CAST(:usuarioIdsExcluidos AS integer[])))
  AND (CAST(:texto AS text) IS NULL OR fn_chat_texto_busca(texto) @@ fn_chat_texto_consulta(:texto))
  AND ${FILTROS_DE_RECORTE}`;

/** A última mensagem de cada conversa e o total de mensagens dela, a partir de `${origem}` (uma consulta com as colunas da mensagem). */
const ULTIMA_MENSAGEM_POR_CONVERSA = (origem: string) => `
  WITH ranqueada AS (
    SELECT ${COLUNAS_DA_MENSAGEM},
           CAST(COUNT(*) OVER (PARTITION BY conversa_id) AS integer) AS total_mensagens,
           ROW_NUMBER() OVER (PARTITION BY conversa_id ORDER BY created_date DESC, mensagem_id DESC) AS posicao
    FROM (${origem}) AS mensagem_considerada
  )
  SELECT ${COLUNAS_DA_MENSAGEM}, total_mensagens
  FROM ranqueada
  WHERE posicao = 1
  ORDER BY created_date DESC, mensagem_id DESC`;

function deLinha(linha: LinhaDeMensagemDireta): MensagemDiretaFonte {
  return {
    mensagem_id: linha.mensagem_id,
    conversa_id: linha.conversa_id,
    participantes: [linha.usuario_menor_id, linha.usuario_maior_id],
    autor_usuario_id: linha.autor_usuario_id,
    autor: linha.autor,
    texto: linha.texto,
    contem_codigo: linha.contem_codigo,
    mencoes: linha.mencoes,
    referencias: linha.referencias,
    created_date: linha.created_date.toISOString(),
  };
}

function deLinhaDeConversa(linha: LinhaDeConversaDireta): ResumoDeConversaDireta {
  return {
    conversaId: linha.conversa_id,
    participantes: [linha.usuario_menor_id, linha.usuario_maior_id],
    totalMensagens: linha.total_mensagens,
    ultimaMensagem: deFonteDireta(deLinha(linha)),
  };
}

/**
 * PROVISÓRIO (task 207): as mensagens entre colaboradores numa tabela do Postgres (`mensagem_direta`), para o ambiente de teste
 * (`CHAT_ARMAZENAMENTO=postgres`) rodar sem o custo de um serviço de busca. Na produção de verdade as mensagens ficam no Elasticsearch: este
 * arquivo, o ramo `postgres` do provider e a tabela saem juntos (ver `docs/SCHEMA.md`, "Tabelas provisórias"). Passa pela mesma suíte de
 * contrato dos armazenamentos em índice. Mensagens são gravadas uma vez e nunca reescritas (não há método de exclusão nem de alteração).
 */
export class MensagemDiretaPostgresRepository extends BaseRepository<MensagemDiretaFonte> implements ArmazenamentoDeMensagemDireta {
  private readonly logger = new Logger(MensagemDiretaPostgresRepository.name);

  constructor(conexaoBancoDados: Knex) {
    super(conexaoBancoDados, 'mensagem_direta');
  }

  async gravar(mensagem: MensagemDiretaNova): Promise<MensagemDiretaEnviadaDto> {
    validarMensagemDiretaNova(mensagem);
    return this.proteger(async () => {
      const fonte = paraFonteDireta(mensagem, new Date());
      const inseridas = await this.executarConsulta<{ id: number }>(
        `INSERT INTO mensagem_direta (created_date, updated_date, is_deleted, mensagem_id, conversa_id, usuario_menor_id, usuario_maior_id,
                                      autor_usuario_id, autor, texto, contem_codigo, mencoes, referencias)
         SELECT :criadaEm, :criadaEm, false, CAST(:mensagemId AS uuid), :conversaId, :usuarioMenorId, :usuarioMaiorId,
                :autorUsuarioId, :autor, :texto, :contemCodigo, CAST(:mencoes AS integer[]), CAST(:referencias AS text[])
         ON CONFLICT (mensagem_id) DO NOTHING
         RETURNING id`,
        {
          criadaEm: fonte.created_date,
          mensagemId: fonte.mensagem_id,
          conversaId: fonte.conversa_id,
          usuarioMenorId: fonte.participantes[0],
          usuarioMaiorId: fonte.participantes[1],
          autorUsuarioId: fonte.autor_usuario_id,
          autor: fonte.autor,
          texto: fonte.texto,
          contemCodigo: fonte.contem_codigo,
          mencoes: fonte.mencoes,
          referencias: fonte.referencias,
        },
      );
      if (inseridas.length > 0) return { mensagem: deFonteDireta(fonte), jaExistia: false };

      // Repetição do mesmo envio: devolve o que já está gravado, mas só para o mesmo autor e a mesma conversa.
      const existentes = await this.executarConsulta<LinhaDeMensagemDireta>(
        `SELECT ${COLUNAS_DA_MENSAGEM} FROM mensagem_direta WHERE mensagem_id = CAST(:mensagemId AS uuid) AND is_deleted = false`,
        { mensagemId: fonte.mensagem_id },
      );
      if (existentes.length === 0) throw new Error('A linha existia na gravação e não foi encontrada na leitura');
      const existente = deLinha(existentes[0]);
      if (!mesmaOrigemDaMensagem(existente, mensagem)) throw new BusinessException('Esse identificador de mensagem já foi usado');
      return { mensagem: deFonteDireta(existente), jaExistia: true };
    });
  }

  async listarConversa(consulta: ConsultaConversaDireta): Promise<PaginaDeMensagensDiretas> {
    validarConsultaConversaDireta(consulta);
    const cursor = this.lerCursor(consulta.cursor);
    return this.proteger(async () => {
      const linhas = await this.executarConsulta<LinhaDeMensagemDireta>(
        `SELECT ${COLUNAS_DA_MENSAGEM}
         FROM mensagem_direta
         WHERE conversa_id = :conversaId AND is_deleted = false
           AND (CAST(:cursorData AS timestamptz) IS NULL
                OR (created_date, mensagem_id) < (CAST(:cursorData AS timestamptz), CAST(:cursorMensagemId AS uuid)))
         ORDER BY created_date DESC, mensagem_id DESC
         LIMIT :limite`,
        { conversaId: consulta.conversaId, cursorData: cursor?.data ?? null, cursorMensagemId: cursor?.mensagemId ?? null, limite: consulta.limite + 1 },
      );
      return montarPaginaDeMensagens(linhas.map(deLinha), consulta.limite, deFonteDireta);
    });
  }

  async listarConversasDoUsuario(consulta: ConsultaConversasDoUsuario): Promise<ResumoDeConversaDireta[]> {
    return this.proteger(async () => {
      const linhas = await this.executarConsulta<LinhaDeConversaDireta>(
        `${ULTIMA_MENSAGEM_POR_CONVERSA(`SELECT ${COLUNAS_DA_MENSAGEM} FROM mensagem_direta WHERE ${PARTICIPA_DA_CONVERSA} AND is_deleted = false`)}
         LIMIT :limite`,
        { usuarioId: consulta.usuarioId, limite: LIMITE_CONVERSAS_DO_USUARIO },
      );
      return linhas.map(deLinhaDeConversa);
    });
  }

  /** Uma consulta para todas as conversas pedidas: cada uma aparece, com zero quando nenhuma mensagem do outro veio depois do marcador. */
  async contarNaoLidas(consulta: ConsultaNaoLidas): Promise<Record<string, number>> {
    if (consulta.marcadores.length === 0) return {};
    validarConsultaNaoLidas(consulta);
    return this.proteger(async () => {
      const linhas = await this.executarConsulta<LinhaDeNaoLidas>(
        `SELECT marcador.conversa_id, CAST(COUNT(mensagem_direta.id) AS integer) AS total
         FROM UNNEST(CAST(:conversaIds AS text[]), CAST(:lidasAteDates AS timestamptz[])) AS marcador(conversa_id, lida_ate_date)
         LEFT JOIN mensagem_direta
           ON mensagem_direta.conversa_id = marcador.conversa_id
          AND mensagem_direta.is_deleted = false
          AND (mensagem_direta.usuario_menor_id = :usuarioId OR mensagem_direta.usuario_maior_id = :usuarioId)
          AND mensagem_direta.autor = :autorUsuario
          AND mensagem_direta.autor_usuario_id <> :usuarioId
          AND (marcador.lida_ate_date IS NULL OR mensagem_direta.created_date > marcador.lida_ate_date)
         GROUP BY marcador.conversa_id`,
        {
          usuarioId: consulta.usuarioId,
          autorUsuario: AutorMensagemDiretaEnum.USUARIO,
          conversaIds: consulta.marcadores.map((marcador) => marcador.conversaId),
          lidasAteDates: consulta.marcadores.map((marcador) => marcador.lidaAteDate?.toISOString() ?? null),
        },
      );
      return deBaldesDeNaoLidas(
        consulta.marcadores.map((marcador) => marcador.conversaId),
        Object.fromEntries(linhas.map((linha) => [linha.conversa_id, { doc_count: linha.total }])),
      );
    });
  }

  /** Mesmo comportamento dos índices: sem acento, todas as palavras, mais relevantes primeiro e, em empate, a mais recente. */
  async buscar(consulta: ConsultaBuscaDireta): Promise<MensagemDiretaResumoDto[]> {
    validarConsultaBuscaDireta(consulta);
    return this.proteger(async () => {
      const linhas = await this.executarConsulta<LinhaDeMensagemDireta>(
        `SELECT ${COLUNAS_DA_MENSAGEM}
         FROM mensagem_direta
         WHERE ${PARTICIPA_DA_CONVERSA} AND is_deleted = false
           AND fn_chat_texto_busca(texto) @@ fn_chat_texto_consulta(:texto)
           AND ${FILTROS_DE_RECORTE}
         ORDER BY ts_rank(fn_chat_texto_busca(texto), fn_chat_texto_consulta(:texto)) DESC, created_date DESC, mensagem_id DESC
         LIMIT :limite`,
        { usuarioId: consulta.usuarioId, texto: consulta.texto, ...this.lerRecorte(consulta), limite: LIMITE_BUSCA_DIRETA },
      );
      return linhas.map((linha) => deFonteDireta(deLinha(linha)));
    });
  }

  async listarTodasConversas(consulta: ConsultaSupervisao): Promise<PaginaDeConversasSupervisionadas> {
    const deslocamento = validarPaginaDaSupervisao(consulta);
    return this.proteger(async () => {
      const filtros = { usuarioIdsExcluidos: consulta.usuarioIdsExcluidos, texto: consulta.texto?.trim() || null, ...this.lerRecorte(consulta) };
      const linhas = await this.executarConsulta<LinhaDeConversaDireta>(
        `${ULTIMA_MENSAGEM_POR_CONVERSA(`SELECT ${COLUNAS_DA_MENSAGEM} FROM mensagem_direta WHERE ${FILTROS_DA_SUPERVISAO}`)}
         LIMIT :limite OFFSET :deslocamento`,
        { ...filtros, limite: consulta.porPagina, deslocamento },
      );
      const contagem = await this.executarConsulta<{ total: number }>(
        `SELECT CAST(COUNT(DISTINCT conversa_id) AS integer) AS total FROM mensagem_direta WHERE ${FILTROS_DA_SUPERVISAO}`,
        filtros,
      );
      return { conversas: linhas.map(deLinhaDeConversa), total: contagem[0]?.total ?? 0 };
    });
  }

  /** O cursor opaco da conversa (o mesmo dos índices) em data e `mensagem_id`; adulterado vira erro de negócio, nunca falha do banco. */
  private lerCursor(cursor: string | undefined): { data: string; mensagemId: string } | null {
    if (!cursor) return null;
    const [instante, mensagemId] = decodificarCursor(cursor);
    const data = new Date(instante);
    if (Number.isNaN(data.getTime()) || !REGEX_UUID.test(mensagemId)) throw new BusinessException('Cursor da conversa inválido');
    return { data: data.toISOString(), mensagemId };
  }

  private lerRecorte(recorte: { inicio?: Date; fim?: Date; somenteCodigo?: boolean }) {
    return { inicio: recorte.inicio?.toISOString() ?? null, fim: recorte.fim?.toISOString() ?? null, somenteCodigo: recorte.somenteCodigo ?? false };
  }

  private async proteger<T>(operacao: () => Promise<T>): Promise<T> {
    try {
      return await operacao();
    } catch (erro) {
      if (erro instanceof BusinessException) throw erro;
      this.logger.error(`Falha no Postgres do chat entre colaboradores: ${erro instanceof Error ? erro.message : String(erro)}`);
      throw new BusinessException('O chat entre colaboradores está indisponível no momento (armazenamento das mensagens fora do ar). Tente de novo em instantes.');
    }
  }
}
