import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import {
  MensagemDiretaLeituraInternoAlterarDto,
  MensagemDiretaMarcadorListarDto,
  MensagemDiretaMarcadorRecuperarDto,
  MensagemDiretaSilencioInternoAlterarDto,
} from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';

/** Até onde uma pessoa leu uma conversa e se ela silenciou os avisos dela (`mensagem_direta_leitura`). */
export interface MarcadorDeLeituraRegistrado {
  conversaId: string;
  outroUsuarioId: number;
  /** A data da última mensagem que a pessoa viu; `null` quando só silenciou a conversa e ainda não leu nada. */
  lidaAteDate: Date | null;
  silenciada: boolean;
}

const COLUNAS_DO_MARCADOR = `mensagem_direta_leitura.conversa_id      AS "conversaId",
         mensagem_direta_leitura.outro_usuario_id AS "outroUsuarioId",
         mensagem_direta_leitura.lida_ate_date    AS "lidaAteDate",
         mensagem_direta_leitura.silenciada       AS silenciada`;

/**
 * O estado de leitura e de silêncio das conversas diretas (task 208). Uma linha por pessoa e conversa, criada na primeira leitura ou na
 * primeira vez que a conversa é silenciada. A marcação de leitura **nunca recua**: uma requisição atrasada não reabre as não lidas.
 */
@Injectable()
export class MensagemDiretaLeituraRepository extends BaseRepository<MarcadorDeLeituraRegistrado> {
  constructor(@Inject(DATABASE_CONNECTION) conexaoBancoDados: Knex) {
    super(conexaoBancoDados, 'mensagem_direta_leitura');
  }

  /** Os marcadores de todas as conversas da pessoa. */
  async listarMarcadores(dto: MensagemDiretaMarcadorListarDto): Promise<MarcadorDeLeituraRegistrado[]> {
    return this.executarConsulta<MarcadorDeLeituraRegistrado>(
      `SELECT ${COLUNAS_DO_MARCADOR}
       FROM mensagem_direta_leitura
       WHERE mensagem_direta_leitura.usuario_id = :usuarioId
         AND mensagem_direta_leitura.is_deleted = false`,
      { usuarioId: dto.usuarioId },
    );
  }

  /** O marcador de uma pessoa numa conversa; `null` quando ela nunca leu nem silenciou. */
  async recuperarMarcador(dto: MensagemDiretaMarcadorRecuperarDto): Promise<MarcadorDeLeituraRegistrado | null> {
    const encontrados = await this.executarConsulta<MarcadorDeLeituraRegistrado>(
      `SELECT ${COLUNAS_DO_MARCADOR}
       FROM mensagem_direta_leitura
       WHERE mensagem_direta_leitura.conversa_id = :conversaId
         AND mensagem_direta_leitura.usuario_id = :usuarioId
         AND mensagem_direta_leitura.is_deleted = false`,
      { conversaId: dto.conversaId, usuarioId: dto.usuarioId },
    );
    return encontrados[0] ?? null;
  }

  /**
   * Cria o marcador ou avança `lida_ate_date`. `GREATEST` ignora o nulo e mantém a data mais nova: uma marcação mais antiga que a gravada
   * devolve a gravada. Não mexe em `silenciada`.
   */
  async alterarLeitura(dto: MensagemDiretaLeituraInternoAlterarDto): Promise<MarcadorDeLeituraRegistrado> {
    const gravados = await this.executarConsulta<MarcadorDeLeituraRegistrado>(
      `INSERT INTO mensagem_direta_leitura (
         created_date, updated_date, is_deleted, conversa_id, usuario_id, outro_usuario_id, lida_ate_date, silenciada
       )
       SELECT NOW(), NOW(), false, :conversaId, :usuarioId, :outroUsuarioId, CAST(:lidaAteDate AS timestamptz), false
       ON CONFLICT (conversa_id, usuario_id) WHERE is_deleted = false
       DO UPDATE SET lida_ate_date = GREATEST(mensagem_direta_leitura.lida_ate_date, EXCLUDED.lida_ate_date)
       RETURNING ${COLUNAS_DO_MARCADOR}`,
      { ...dto, lidaAteDate: dto.lidaAteDate.toISOString() },
    );
    return gravados[0];
  }

  /** Cria o marcador ou altera `silenciada`, sem apagar até onde a pessoa já leu. */
  async alterarSilencio(dto: MensagemDiretaSilencioInternoAlterarDto): Promise<MarcadorDeLeituraRegistrado> {
    const gravados = await this.executarConsulta<MarcadorDeLeituraRegistrado>(
      `INSERT INTO mensagem_direta_leitura (
         created_date, updated_date, is_deleted, conversa_id, usuario_id, outro_usuario_id, lida_ate_date, silenciada
       )
       SELECT NOW(), NOW(), false, :conversaId, :usuarioId, :outroUsuarioId, CAST(NULL AS timestamptz), :silenciada
       ON CONFLICT (conversa_id, usuario_id) WHERE is_deleted = false
       DO UPDATE SET silenciada = EXCLUDED.silenciada
       RETURNING ${COLUNAS_DO_MARCADOR}`,
      { ...dto },
    );
    return gravados[0];
  }
}
