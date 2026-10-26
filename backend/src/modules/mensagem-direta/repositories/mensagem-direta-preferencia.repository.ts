import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import {
  MensagemDiretaPreferenciaInternoAlterarDto,
  MensagemDiretaPreferenciaInternoRecuperarDto,
  MensagemDiretaPreferenciaRecuperadaDto,
} from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';

const COLUNAS_DA_PREFERENCIA = `avisos_ativos        AS "avisosAtivos",
         aviso_desktop_ativo AS "avisoDesktopAtivo",
         som_ativo           AS "somAtivo",
         silenciado_ate_date AS "silenciadoAteDate",
         atalho_global       AS "atalhoGlobal",
         posicao_popup       AS "posicaoPopup"`;

/** As preferências do chat entre colaboradores (task 208): uma linha por usuário, criada na primeira alteração. */
@Injectable()
export class MensagemDiretaPreferenciaRepository extends BaseRepository<MensagemDiretaPreferenciaRecuperadaDto> {
  constructor(@Inject(DATABASE_CONNECTION) conexaoBancoDados: Knex) {
    super(conexaoBancoDados, 'mensagem_direta_preferencia');
  }

  /** Sem linha gravada devolve `null`; o padrão mora no `shared`, nunca em `DEFAULT` de coluna. */
  async recuperar(dto: MensagemDiretaPreferenciaInternoRecuperarDto): Promise<MensagemDiretaPreferenciaRecuperadaDto | null> {
    const encontradas = await this.executarConsulta<MensagemDiretaPreferenciaRecuperadaDto>(
      `SELECT ${COLUNAS_DA_PREFERENCIA}
       FROM mensagem_direta_preferencia
       WHERE mensagem_direta_preferencia.usuario_id = :usuarioId
         AND mensagem_direta_preferencia.is_deleted = false`,
      { usuarioId: dto.usuarioId },
    );
    return encontradas[0] ?? null;
  }

  /** Cria a linha do usuário ou troca todas as preferências de uma vez. */
  async alterar(dto: MensagemDiretaPreferenciaInternoAlterarDto): Promise<MensagemDiretaPreferenciaRecuperadaDto> {
    const gravadas = await this.executarConsulta<MensagemDiretaPreferenciaRecuperadaDto>(
      `INSERT INTO mensagem_direta_preferencia (
         created_date, updated_date, is_deleted, usuario_id,
         avisos_ativos, aviso_desktop_ativo, som_ativo, silenciado_ate_date, atalho_global, posicao_popup
       )
       SELECT NOW(), NOW(), false, :usuarioId,
              :avisosAtivos, :avisoDesktopAtivo, :somAtivo, CAST(:silenciadoAteDate AS timestamptz), :atalhoGlobal, :posicaoPopup
       ON CONFLICT (usuario_id) WHERE is_deleted = false
       DO UPDATE SET avisos_ativos        = EXCLUDED.avisos_ativos,
                     aviso_desktop_ativo  = EXCLUDED.aviso_desktop_ativo,
                     som_ativo            = EXCLUDED.som_ativo,
                     silenciado_ate_date  = EXCLUDED.silenciado_ate_date,
                     atalho_global        = EXCLUDED.atalho_global,
                     posicao_popup        = EXCLUDED.posicao_popup
       RETURNING ${COLUNAS_DA_PREFERENCIA}`,
      { ...dto, silenciadoAteDate: dto.silenciadoAteDate ? dto.silenciadoAteDate.toISOString() : null },
    );
    return gravadas[0];
  }
}
