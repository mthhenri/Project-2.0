import { Injectable } from '@nestjs/common';
import { CalendarioRepository } from '../repositories/calendario.repository';
import {
  DiaNaoUtilCriarDto,
  DiaNaoUtilCriadoDto,
  DiaNaoUtilResumoDto,
  DiaNaoUtilAlterarDto,
  DiaNaoUtilAlteradoDto,
} from '@project20/shared';
import { StandardResponse } from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

@Injectable()
export class CalendarioService {
  constructor(private readonly calendarioRepositorio: CalendarioRepository) {}

  /** Cadastra novo dia não útil. Restrito a gestores. */
  async criar(dto: DiaNaoUtilCriarDto): Promise<StandardResponse<DiaNaoUtilCriadoDto>> {
    const diaNaoUtilCriado = await this.calendarioRepositorio.inserir({
      diaData:    dto.diaData,
      descricao:  dto.descricao,
      tipo:       dto.tipo,
      recorrente: dto.recorrente,
    });

    return {
      sucesso:  true,
      dados:    diaNaoUtilCriado,
      mensagem: 'Dia não útil cadastrado com sucesso',
    };
  }

  /** Lista todos os dias não úteis ativos. Disponível para todos os autenticados. */
  async listar(): Promise<StandardResponse<DiaNaoUtilResumoDto[]>> {
    const diasNaoUteis = await this.calendarioRepositorio.listar();

    return {
      sucesso:  true,
      dados:    diasNaoUteis,
      mensagem: 'Dias não úteis listados com sucesso',
    };
  }

  /** Recupera dia não útil por ID. Lança exceção se não encontrado. */
  async recuperar(id: number): Promise<StandardResponse<DiaNaoUtilCriadoDto>> {
    const diaNaoUtilEncontrado = await this.calendarioRepositorio.recuperar({ id });

    if (!diaNaoUtilEncontrado) {
      throw new ResourceNotFoundException('Dia não útil');
    }

    return {
      sucesso:  true,
      dados:    diaNaoUtilEncontrado,
      mensagem: 'Dia não útil recuperado com sucesso',
    };
  }

  /** Altera campos do dia não útil. Restrito a gestores. */
  async alterar(id: number, dto: DiaNaoUtilAlterarDto): Promise<StandardResponse<DiaNaoUtilAlteradoDto>> {
    const diaNaoUtilEncontrado = await this.calendarioRepositorio.recuperar({ id });

    if (!diaNaoUtilEncontrado) {
      throw new ResourceNotFoundException('Dia não útil');
    }

    const diaNaoUtilAlterado = await this.calendarioRepositorio.alterar(id, {
      descricao:  dto.descricao,
      tipo:       dto.tipo,
      recorrente: dto.recorrente,
    });

    return {
      sucesso:  true,
      dados:    diaNaoUtilAlterado,
      mensagem: 'Dia não útil alterado com sucesso',
    };
  }

  /** Realiza soft delete do dia não útil. Restrito a gestores. */
  async excluir(id: number): Promise<StandardResponse<void>> {
    const diaNaoUtilEncontrado = await this.calendarioRepositorio.recuperar({ id });

    if (!diaNaoUtilEncontrado) {
      throw new ResourceNotFoundException('Dia não útil');
    }

    await this.calendarioRepositorio.excluir({ id });

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Dia não útil excluído com sucesso',
    };
  }

  /**
   * Retorna se uma data é considerada dia útil pelo sistema.
   * Dia útil = não é fim de semana E não está em dia_nao_util.
   */
  async verificarDiaUtil(dataString: string): Promise<StandardResponse<{
    data: string;
    ehDiaUtil: boolean;
    motivo: string | null;
  }>> {
    const dataObjeto = new Date(dataString);
    const diaDaSemana = dataObjeto.getUTCDay();
    const ehFimDeSemana = diaDaSemana === 0 || diaDaSemana === 6;

    if (ehFimDeSemana) {
      return {
        sucesso: true,
        dados:   { data: dataString, ehDiaUtil: false, motivo: 'Fim de semana' },
        mensagem: 'Verificação de dia útil realizada com sucesso',
      };
    }

    const tipoDiaNaoUtil = await this.calendarioRepositorio.recuperarTipo({ data: dataObjeto });

    if (tipoDiaNaoUtil !== null) {
      return {
        sucesso: true,
        dados:   { data: dataString, ehDiaUtil: false, motivo: tipoDiaNaoUtil },
        mensagem: 'Verificação de dia útil realizada com sucesso',
      };
    }

    return {
      sucesso:  true,
      dados:    { data: dataString, ehDiaUtil: true, motivo: null },
      mensagem: 'Verificação de dia útil realizada com sucesso',
    };
  }
}
