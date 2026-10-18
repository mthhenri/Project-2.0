import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { AtividadePrioridadeCorAlteradaDto, AtividadePrioridadeResumoDto, TipoAtividadePrioridadeEnum } from '@project20/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';

/** Prioridades da atividade (`tipo_atividade_prioridade`): leitura e troca da cor. `codigo`, `descricao` e `ordem` nunca mudam por aqui. */
@Injectable()
export class AtividadePrioridadeRepository extends BaseRepository<never> {
  constructor(@Inject(DATABASE_CONNECTION) conexaoBancoDados: Knex) {
    super(conexaoBancoDados, 'tipo_atividade_prioridade');
  }

  async listar(): Promise<AtividadePrioridadeResumoDto[]> {
    return this.executarConsulta<AtividadePrioridadeResumoDto>(
      `SELECT
         tipo_atividade_prioridade.codigo,
         tipo_atividade_prioridade.descricao,
         tipo_atividade_prioridade.ordem,
         tipo_atividade_prioridade.cor
       FROM tipo_atividade_prioridade
       WHERE tipo_atividade_prioridade.is_deleted = false
       ORDER BY tipo_atividade_prioridade.ordem ASC`,
    );
  }

  /** Troca só a cor; devolve a prioridade alterada ou `null` se o código não existe. */
  async alterarCor(codigo: TipoAtividadePrioridadeEnum, cor: string): Promise<AtividadePrioridadeCorAlteradaDto | null> {
    const resultado = await this.executarConsulta<AtividadePrioridadeCorAlteradaDto>(
      `UPDATE tipo_atividade_prioridade
       SET cor = :cor, updated_date = NOW()
       WHERE tipo_atividade_prioridade.codigo = :codigo
         AND tipo_atividade_prioridade.is_deleted = false
       RETURNING codigo, descricao, ordem, cor`,
      { codigo, cor },
    );
    return resultado[0] ?? null;
  }
}
