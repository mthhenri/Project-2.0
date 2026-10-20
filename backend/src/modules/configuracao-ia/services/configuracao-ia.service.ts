import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ConfiguracaoIaCriadaDto,
  ConfiguracaoIaCriarDto,
  ConfiguracaoIaListarDto,
  ConfiguracaoIaRecuperadaDto,
  ConfiguracaoIaResumoDto,
  IaModeloPrecoAlteradoDto,
  IaModeloPrecoAlterarDto,
  IaModeloPrecoDto,
  PaginatedResult,
  StandardResponse,
  temPermissaoDeAdministrador,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ConfiguracaoIaRepository } from '../repositories/configuracao-ia.repository';

/**
 * Configuração da IA versionada (task 129). A versão ativa fica em cache em memória (a IA não lê o banco a cada
 * mensagem); o cache é renovado na subida e a cada versão gravada. Vale para uma só instância do backend.
 */
@Injectable()
export class ConfiguracaoIaService implements OnModuleInit {
  private ativaEmCache: ConfiguracaoIaResumoDto | null = null;

  constructor(private readonly configuracaoIaRepositorio: ConfiguracaoIaRepository) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.obterAtiva();
    } catch {
      // Banco indisponível na subida: a primeira leitura tenta de novo.
    }
  }

  /** Para outros módulos (a IA e os blocos seguintes): a configuração ativa, do cache. */
  async obterAtiva(): Promise<ConfiguracaoIaResumoDto> {
    if (this.ativaEmCache) return this.ativaEmCache;
    const ativa = await this.configuracaoIaRepositorio.recuperarAtiva();
    if (!ativa) throw new ResourceNotFoundException('Configuração da IA');
    this.ativaEmCache = ativa;
    return ativa;
  }

  /** A configuração ativa só se já estiver no cache (leitura síncrona, para quem decide na hora, como as ferramentas); `null` antes da primeira. */
  obterAtivaEmCache(): ConfiguracaoIaResumoDto | null {
    return this.ativaEmCache;
  }

  async recuperarAtiva(usuarioAtivo: JwtPayload): Promise<StandardResponse<ConfiguracaoIaRecuperadaDto>> {
    this.validarAdministrador(usuarioAtivo);
    return { sucesso: true, dados: await this.obterAtiva(), mensagem: 'Configuração da IA recuperada com sucesso' };
  }

  async listar(
    dto: ConfiguracaoIaListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<PaginatedResult<ConfiguracaoIaResumoDto>>> {
    this.validarAdministrador(usuarioAtivo);
    const { itens, total } = await this.configuracaoIaRepositorio.listar(dto);
    const itensPorPagina = dto.itensPorPagina ?? 20;
    return {
      sucesso: true,
      dados: {
        itens,
        totalItens: total,
        paginaAtual: dto.pagina ?? 1,
        itensPorPagina,
        totalPaginas: Math.ceil(total / itensPorPagina),
      },
      mensagem: 'Versões da configuração da IA listadas com sucesso',
    };
  }

  /** Grava uma versão nova (a antiga nunca é alterada; os preços por modelo são copiados para a nova) e renova o cache. */
  async criar(dto: ConfiguracaoIaCriarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<ConfiguracaoIaCriadaDto>> {
    this.validarAdministrador(usuarioAtivo);
    if (dto.checkinMinimoMinutos >= dto.checkinMaximoMinutos) {
      throw new BusinessException('O intervalo mínimo do check-in deve ser menor que o máximo');
    }
    const criada = await this.configuracaoIaRepositorio.inserirNovaVersao(dto, usuarioAtivo.sub);
    this.ativaEmCache = criada;
    return { sucesso: true, dados: criada, mensagem: `Versão ${criada.versao} da configuração da IA salva com sucesso` };
  }

  /** Para a aba "Custos" (que confere a permissão): os preços por modelo da versão ativa (task 202). */
  async listarPrecos(): Promise<IaModeloPrecoDto[]> {
    return this.configuracaoIaRepositorio.listarPrecos();
  }

  /** Para a aba "Custos" (que confere a permissão): grava o preço de um modelo na versão ativa, no lugar. */
  async alterarPreco(dto: IaModeloPrecoAlterarDto): Promise<IaModeloPrecoAlteradoDto> {
    return this.configuracaoIaRepositorio.alterarPrecoDaVersaoAtiva(dto);
  }

  /** Defesa em profundidade: o `AdministradorGuard` já barra a rota. */
  private validarAdministrador(usuarioAtivo: JwtPayload): void {
    if (!temPermissaoDeAdministrador(usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('Acesso restrito a administradores');
    }
  }
}
