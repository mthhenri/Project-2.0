import { Injectable } from '@nestjs/common';
import {
  AtividadePrioridadeCorAlteradaDto,
  AtividadePrioridadeCorAlterarDto,
  AtividadePrioridadeResumoDto,
  StandardResponse,
  temPermissaoDeAdministrador,
  TipoAtividadePrioridadeEnum,
} from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { AtividadePrioridadeRepository } from '../repositories/atividade-prioridade.repository';

@Injectable()
export class AtividadePrioridadeService {
  constructor(private readonly atividadePrioridadeRepositorio: AtividadePrioridadeRepository) {}

  /** Qualquer usuário autenticado: as telas precisam do nome, da ordem e da cor para mostrar o selo. */
  async listar(): Promise<StandardResponse<AtividadePrioridadeResumoDto[]>> {
    return { sucesso: true, dados: await this.atividadePrioridadeRepositorio.listar(), mensagem: 'Prioridades listadas com sucesso' };
  }

  /** Só o administrador troca a cor; o formato `#rrggbb` já foi validado no DTO, e a gravação é sempre em minúsculas. */
  async alterarCor(
    codigo: TipoAtividadePrioridadeEnum,
    dto: AtividadePrioridadeCorAlterarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<AtividadePrioridadeCorAlteradaDto>> {
    if (!temPermissaoDeAdministrador(usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('Apenas administradores podem alterar a cor de uma prioridade');
    }
    const alterada = await this.atividadePrioridadeRepositorio.alterarCor(codigo, dto.cor.toLowerCase());
    if (!alterada) throw new ResourceNotFoundException('Prioridade');
    return { sucesso: true, dados: alterada, mensagem: 'Cor da prioridade alterada com sucesso' };
  }
}
