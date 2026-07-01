import { Injectable } from '@nestjs/common';
import { PontoJustificativaRepository } from '../repositories/ponto-justificativa.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import {
  PontoJustificativaCriarDto,
  PontoJustificativaCriadaDto,
  PontoJustificativaResumoDto,
  PontoJustificativaListarDto,
  PontoJustificativaRecuperarDto,
  StandardResponse,
} from '@project20/shared';

@Injectable()
export class PontoJustificativaService {
  constructor(
    private readonly pontoJustificativaRepositorio: PontoJustificativaRepository,
    private readonly usuarioRepositorio: UsuarioRepository,
  ) {}

  /**
   * Cria uma justificativa de ponto para um usuário num dia específico. Exclusivo de
   * gestor: o `gestorId` vem do usuário autenticado. Valida a existência do usuário, o
   * teto de horas (<= jornada diária) e a unicidade (uma justificativa ativa por dia).
   */
  async criar(
    dto: PontoJustificativaCriarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<PontoJustificativaCriadaDto>> {
    const usuarioJustificado = await this.usuarioRepositorio.recuperar({ id: dto.usuarioId });
    if (!usuarioJustificado) {
      throw new ResourceNotFoundException('Usuário');
    }

    if (dto.horasCobertas > usuarioJustificado.horasDiariasNecessarias) {
      throw new BusinessException(
        'A justificativa não pode cobrir mais horas que a jornada diária do usuário',
      );
    }

    const jaExisteNoDia = await this.pontoJustificativaRepositorio.validarPorUsuarioEDia({
      usuarioId: dto.usuarioId,
      diaData:   dto.diaData,
    });
    if (jaExisteNoDia) {
      throw new BusinessException('Já existe uma justificativa para esse usuário nesse dia');
    }

    const justificativaCriada = await this.pontoJustificativaRepositorio.inserir({
      usuarioId:     dto.usuarioId,
      gestorId:      usuarioAtivo.sub,
      diaData:       dto.diaData,
      nome:          dto.nome,
      descricao:     dto.descricao,
      horasCobertas: dto.horasCobertas,
    });

    return {
      sucesso:  true,
      dados:    justificativaCriada,
      mensagem: 'Justificativa criada com sucesso',
    };
  }

  /** Lista as justificativas de um usuário num mês. Exclusivo de gestor. */
  async listar(
    dto: PontoJustificativaListarDto,
  ): Promise<StandardResponse<PontoJustificativaResumoDto[]>> {
    const justificativas = await this.pontoJustificativaRepositorio.listar(dto);

    return {
      sucesso:  true,
      dados:    justificativas,
      mensagem: 'Justificativas listadas com sucesso',
    };
  }

  /** Realiza soft delete de uma justificativa. Exclusivo de gestor. */
  async excluir(dto: PontoJustificativaRecuperarDto): Promise<StandardResponse<void>> {
    const justificativaEncontrada = await this.pontoJustificativaRepositorio.recuperar({ id: dto.id });
    if (!justificativaEncontrada) {
      throw new ResourceNotFoundException('Justificativa');
    }

    await this.pontoJustificativaRepositorio.excluir({ id: dto.id });

    return {
      sucesso:  true,
      dados:    null,
      mensagem: 'Justificativa excluída com sucesso',
    };
  }
}
