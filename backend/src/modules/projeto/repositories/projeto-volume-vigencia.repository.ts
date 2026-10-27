import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { ProjetoVolumeVigenciaCriarDto, ProjetoVolumeVigenciaResumoDto, ProjetoVolumeVigenciaListarDto, ProjetoVolumeVigenciaExcluirDto } from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';

const COLUNAS = `id, projeto_id AS "projetoId", vigencia_inicio_data::text AS "vigenciaInicioData", volume_esperado_horas AS "volumeEsperadoHoras"`;

@Injectable()
export class ProjetoVolumeVigenciaRepository extends BaseRepository<ProjetoVolumeVigenciaResumoDto> {
  constructor(@Inject(DATABASE_CONNECTION) conexao: Knex) { super(conexao, 'projeto_volume_vigencia'); }

  /** Serializa alterações por projeto e fornece o mesmo executor transacional à service. */
  async emTransacao<T>(dto: ProjetoVolumeVigenciaListarDto, operacao: (repositorio: ProjetoVolumeVigenciaRepository, projetoExiste: boolean) => Promise<T>): Promise<T> {
    return this.conexaoBancoDados.transaction(async (transacao) => {
      const projetos = await this.executarConsulta<{ id: number }>(
        `SELECT projeto.id FROM projeto WHERE projeto.id = :projetoId AND projeto.is_deleted = false FOR UPDATE`, { projetoId: dto.projetoId }, transacao,
      );
      return operacao(new ProjetoVolumeVigenciaRepository(transacao), projetos.length > 0);
    });
  }

  /** Lista as vigências ativas de um projeto, da mais recente para a mais antiga. */
  async listar(dto: ProjetoVolumeVigenciaListarDto): Promise<ProjetoVolumeVigenciaResumoDto[]> {
    return this.executarConsulta(`SELECT ${COLUNAS} FROM projeto_volume_vigencia
      WHERE projeto_id = :projetoId AND is_deleted = false ORDER BY vigencia_inicio_data DESC`, { projetoId: dto.projetoId });
  }

  /** Insere uma vigência já normalizada pela service. */
  async inserir(dto: ProjetoVolumeVigenciaCriarDto): Promise<ProjetoVolumeVigenciaResumoDto> {
    const resultado = await this.executarConsulta<ProjetoVolumeVigenciaResumoDto>(
      `INSERT INTO projeto_volume_vigencia (projeto_id, vigencia_inicio_data, volume_esperado_horas, created_date, updated_date, is_deleted, deleted_date)
       SELECT :projetoId, :vigenciaInicioData::date, :volumeEsperadoHoras, NOW(), NOW(), false, NULL RETURNING ${COLUNAS}`, { ...dto });
    return resultado[0];
  }

  /** Exclui logicamente a vigência validada pela service, usando o helper da BaseRepository. */
  async excluir(dto: ProjetoVolumeVigenciaExcluirDto): Promise<void> { await this.executarSoftDelete(dto.vigenciaId); }
}
