import { Injectable } from '@nestjs/common';
import {
  LIMITE_FONTES_POR_PLANO,
  PlanoFonteCriadoDto,
  PlanoFonteExcluidaDto,
  PlanoFonteExcluirDto,
  PlanoFonteInternoCriarDto,
  PlanoFonteListarDto,
  PlanoFonteRecuperadaDto,
  PlanoFonteRecuperarDto,
  PlanoFonteResumoDto,
  StandardResponse,
  validarFonteDoPlano,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PlanoFonteRepository } from '../repositories/plano-fonte.repository';
import { PlanoService } from './plano.service';

/**
 * Material de fora do plano (task 236). O acesso é o do plano (`PlanoService.recuperar`; quem não vê o plano recebe 404). A regra do conteúdo
 * (extensão de texto, tamanho, texto legível) é a do `shared`, a mesma que a tela aplica antes de enviar. Quem vê o plano pode trazer e remover
 * fontes. Excluir é soft delete: a fonte some do contexto da IA.
 */
@Injectable()
export class PlanoFonteService {
  constructor(
    private readonly planoFonteRepositorio: PlanoFonteRepository,
    private readonly planoService: PlanoService,
  ) {}

  async criar(dto: PlanoFonteInternoCriarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoFonteCriadoDto>> {
    await this.planoService.recuperar({ id: dto.planoId }, usuarioAtivo);
    const titulo = dto.titulo.replace(/\s+/g, ' ').trim();
    const problema = validarFonteDoPlano({ titulo, conteudo: dto.conteudo, origem: dto.origem });
    if (problema) throw new BusinessException(problema);
    if ((await this.planoFonteRepositorio.contar({ planoId: dto.planoId })) >= LIMITE_FONTES_POR_PLANO) {
      throw new BusinessException(`O plano já tem ${LIMITE_FONTES_POR_PLANO} fontes: remova uma antes de trazer outra`);
    }

    const criada = await this.planoFonteRepositorio.inserir({ ...dto, titulo, usuarioId: usuarioAtivo.sub });
    return { sucesso: true, dados: criada, mensagem: 'Fonte adicionada com sucesso' };
  }

  async listar(dto: PlanoFonteListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoFonteResumoDto[]>> {
    await this.planoService.recuperar({ id: dto.planoId }, usuarioAtivo);
    return { sucesso: true, dados: await this.planoFonteRepositorio.listar(dto), mensagem: 'Fontes listadas com sucesso' };
  }

  /** As fontes com o conteúdo, para a IA ler no contexto do plano. */
  async listarComConteudo(dto: PlanoFonteListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoFonteRecuperadaDto[]>> {
    await this.planoService.recuperar({ id: dto.planoId }, usuarioAtivo);
    return { sucesso: true, dados: await this.planoFonteRepositorio.listarComConteudo(dto), mensagem: 'Fontes listadas com sucesso' };
  }

  async recuperar(dto: PlanoFonteRecuperarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoFonteRecuperadaDto>> {
    await this.planoService.recuperar({ id: dto.planoId }, usuarioAtivo);
    const fonte = await this.planoFonteRepositorio.recuperar(dto);
    if (!fonte) throw new ResourceNotFoundException('Fonte');
    return { sucesso: true, dados: fonte, mensagem: 'Fonte recuperada com sucesso' };
  }

  async excluir(dto: PlanoFonteExcluirDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<PlanoFonteExcluidaDto>> {
    await this.planoService.recuperar({ id: dto.planoId }, usuarioAtivo);
    const excluida = await this.planoFonteRepositorio.excluir(dto);
    if (!excluida) throw new ResourceNotFoundException('Fonte');
    return { sucesso: true, dados: excluida, mensagem: 'Fonte removida com sucesso' };
  }
}
