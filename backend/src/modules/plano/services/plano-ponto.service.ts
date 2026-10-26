import { Injectable } from '@nestjs/common';
import {
  PlanoPontoCriadoDto,
  PlanoPontoInternoCriarDto,
  PlanoPontoListarDto,
  PlanoPontoResumoDto,
  PlanoPontoSituacaoAlteradaDto,
  PlanoPontoSituacaoInternoAlterarDto,
  StandardResponse,
  TipoPlanoPontoSituacaoEnum,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PlanoPontoRepository } from '../repositories/plano-ponto.repository';
import { PlanoService } from './plano.service';

/**
 * Pontos em aberto do plano (task 235). O acesso é o do plano (`PlanoService.recuperar`: solo e amplo valem; quem não vê o plano recebe 404). O rótulo é
 * texto livre e nada o valida contra uma lista. Resolver e registrar a decisão exigem o texto; dispensar aceita o motivo e reabrir apaga a resolução.
 */
@Injectable()
export class PlanoPontoService {
  constructor(
    private readonly planoPontoRepositorio: PlanoPontoRepository,
    private readonly planoService: PlanoService,
  ) {}

  async criar(dto: PlanoPontoInternoCriarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoPontoCriadoDto>> {
    await this.planoService.recuperar({ id: dto.planoId }, usuarioAtivo);
    const rotulo = dto.rotulo.replace(/\s+/g, ' ').trim();
    const texto = dto.texto.trim();
    if (rotulo === '' || texto === '') throw new BusinessException('Informe o rótulo e o texto do ponto');

    const criado = await this.planoPontoRepositorio.inserir({ planoId: dto.planoId, rotulo, texto });
    return { sucesso: true, dados: criado, mensagem: 'Ponto anotado com sucesso' };
  }

  async listar(dto: PlanoPontoListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoPontoResumoDto[]>> {
    await this.planoService.recuperar({ id: dto.planoId }, usuarioAtivo);
    return { sucesso: true, dados: await this.planoPontoRepositorio.listar(dto), mensagem: 'Pontos listados com sucesso' };
  }

  async alterarSituacao(dto: PlanoPontoSituacaoInternoAlterarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoPontoSituacaoAlteradaDto>> {
    await this.planoService.recuperar({ id: dto.planoId }, usuarioAtivo);
    const ponto = await this.planoPontoRepositorio.recuperar({ planoId: dto.planoId, id: dto.id });
    if (!ponto) throw new ResourceNotFoundException('Ponto');

    const resolucao = dto.resolucaoTexto?.trim() ?? '';
    if ((dto.situacao === TipoPlanoPontoSituacaoEnum.RESOLVIDO || dto.situacao === TipoPlanoPontoSituacaoEnum.DECISAO) && resolucao === '') {
      throw new BusinessException(dto.situacao === TipoPlanoPontoSituacaoEnum.DECISAO ? 'Informe a decisão tomada' : 'Informe a resposta que resolve o ponto');
    }
    const resolucaoTexto = dto.situacao === TipoPlanoPontoSituacaoEnum.ABERTO || resolucao === '' ? null : resolucao;

    const alterado = await this.planoPontoRepositorio.alterarSituacao({ ...dto, resolucaoTexto });
    if (!alterado) throw new ResourceNotFoundException('Ponto');
    return { sucesso: true, dados: alterado, mensagem: 'Ponto alterado com sucesso' };
  }
}
