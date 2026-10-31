import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import {
  MensagemDiretaSupervisaoAvisoMarcarDto,
  MensagemDiretaSupervisaoAvisoVerificarDto,
  MensagemDiretaSupervisaoRegistrarDto,
} from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';

/** Uma abertura de conversa de terceiros por um gestor ou administrador (`mensagem_direta_supervisao`). */
export interface SupervisaoRegistrada {
  id: number;
  leitorUsuarioId: number;
  conversaId: string;
  participantesAvisados: boolean;
}

const COLUNAS_DA_SUPERVISAO = `mensagem_direta_supervisao.id                     AS id,
         mensagem_direta_supervisao.leitor_usuario_id      AS "leitorUsuarioId",
         mensagem_direta_supervisao.conversa_id            AS "conversaId",
         mensagem_direta_supervisao.participantes_avisados AS "participantesAvisados"`;

/**
 * A auditoria da supervisão do chat (task 214): uma linha por abertura. `participantes_avisados` nasce falso e só vira verdadeiro depois que a
 * mensagem do sistema foi gravada, para um aviso que falhou ser tentado de novo na próxima abertura do dia. O dia segue o fuso da conexão
 * (`APP_TIMEZONE`, definido ao abrir a conexão).
 */
@Injectable()
export class MensagemDiretaSupervisaoRepository extends BaseRepository<SupervisaoRegistrada> {
  constructor(@Inject(DATABASE_CONNECTION) conexaoBancoDados: Knex) {
    super(conexaoBancoDados, 'mensagem_direta_supervisao');
  }

  /** Grava a abertura (ainda sem aviso). */
  async registrarLeitura(dto: MensagemDiretaSupervisaoRegistrarDto): Promise<SupervisaoRegistrada> {
    const gravadas = await this.executarConsulta<SupervisaoRegistrada>(
      `INSERT INTO mensagem_direta_supervisao (
         created_date, updated_date, is_deleted, leitor_usuario_id, conversa_id, usuario_menor_id, usuario_maior_id, participantes_avisados
       )
       SELECT NOW(), NOW(), false, :leitorUsuarioId, :conversaId, :usuarioMenorId, :usuarioMaiorId, false
       RETURNING ${COLUNAS_DA_SUPERVISAO}`,
      { ...dto },
    );
    return gravadas[0];
  }

  /** A abertura gerou o aviso aos participantes. */
  async marcarAvisoDado(dto: MensagemDiretaSupervisaoAvisoMarcarDto): Promise<void> {
    await this.executarComando(
      `UPDATE mensagem_direta_supervisao
       SET participantes_avisados = true
       WHERE mensagem_direta_supervisao.id = :supervisaoId
         AND mensagem_direta_supervisao.is_deleted = false`,
      { supervisaoId: dto.supervisaoId },
    );
  }

  /** Já houve aviso deste leitor nesta conversa no dia de `agora` (o dia do fuso do sistema)? */
  async existeAvisoDoDia(dto: MensagemDiretaSupervisaoAvisoVerificarDto): Promise<boolean> {
    const encontrados = await this.executarConsulta<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1
         FROM mensagem_direta_supervisao
         WHERE mensagem_direta_supervisao.leitor_usuario_id = :leitorUsuarioId
           AND mensagem_direta_supervisao.conversa_id = :conversaId
           AND mensagem_direta_supervisao.participantes_avisados = true
           AND mensagem_direta_supervisao.is_deleted = false
           AND mensagem_direta_supervisao.created_date >= date_trunc('day', CAST(:agora AS timestamptz))
           AND mensagem_direta_supervisao.created_date <  date_trunc('day', CAST(:agora AS timestamptz)) + INTERVAL '1 day'
       ) AS existe`,
      { leitorUsuarioId: dto.leitorUsuarioId, conversaId: dto.conversaId, agora: dto.agora.toISOString() },
    );
    return encontrados[0].existe;
  }
}
