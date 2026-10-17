import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  PaginatedResult,
  PromptListarDto,
  PromptPadraoRestauradoDto,
  PromptRascunhoAtivadoDto,
  PromptRascunhoSalvarDto,
  PromptRascunhoSalvoDto,
  PromptResumoDto,
  PromptTipoResumoDto,
  StandardResponse,
  temPermissaoDeAdministrador,
  TipoPromptEnum,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PromptRepository } from '../repositories/prompt.repository';

/**
 * Prompts da IA versionados (task 131). O texto de uma versão nunca é reescrito: editar é salvar o rascunho, ativar é trocar quem
 * é a ativa. Os prompts ativos ficam em cache em memória (a IA não lê o banco a cada mensagem), renovado ao ativar, ao
 * restaurar o padrão e na subida; vale para uma só instância do backend.
 */
@Injectable()
export class PromptService implements OnModuleInit {
  private readonly ativosEmCache = new Map<TipoPromptEnum, PromptResumoDto>();

  constructor(private readonly promptRepositorio: PromptRepository) {}

  async onModuleInit(): Promise<void> {
    try {
      const tipos = await this.promptRepositorio.listarTipos();
      tipos.forEach((tipo) => tipo.ativa && this.ativosEmCache.set(tipo.tipo, tipo.ativa));
    } catch {
      // Banco indisponível na subida: a primeira leitura de cada tipo tenta de novo.
    }
  }

  /** Para outros módulos (a IA): o prompt ativo do tipo, do cache. */
  async obterAtivo(tipo: TipoPromptEnum): Promise<PromptResumoDto> {
    const emCache = this.ativosEmCache.get(tipo);
    if (emCache) return emCache;
    const ativo = await this.promptRepositorio.recuperarAtivo(tipo);
    if (!ativo) throw new ResourceNotFoundException('Prompt');
    this.ativosEmCache.set(tipo, ativo);
    return ativo;
  }

  async listarTipos(usuarioAtivo: JwtPayload): Promise<StandardResponse<PromptTipoResumoDto[]>> {
    this.validarAdministrador(usuarioAtivo);
    return { sucesso: true, dados: await this.promptRepositorio.listarTipos(), mensagem: 'Prompts listados com sucesso' };
  }

  async listarVersoes(
    tipo: TipoPromptEnum,
    dto: PromptListarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<PaginatedResult<PromptResumoDto>>> {
    this.validarAdministrador(usuarioAtivo);
    const { itens, total } = await this.promptRepositorio.listarVersoes(tipo, dto);
    const itensPorPagina = dto.itensPorPagina ?? 20;
    return {
      sucesso: true,
      dados: { itens, totalItens: total, paginaAtual: dto.pagina ?? 1, itensPorPagina, totalPaginas: Math.ceil(total / itensPorPagina) },
      mensagem: 'Versões do prompt listadas com sucesso',
    };
  }

  async salvarRascunho(
    tipo: TipoPromptEnum,
    dto: PromptRascunhoSalvarDto,
    usuarioAtivo: JwtPayload,
  ): Promise<StandardResponse<PromptRascunhoSalvoDto>> {
    this.validarAdministrador(usuarioAtivo);
    if (dto.conteudo.trim() === '') throw new BusinessException('O prompt não pode ficar vazio');
    const salvo = await this.promptRepositorio.salvarRascunho(tipo, dto.conteudo, usuarioAtivo.sub);
    return { sucesso: true, dados: salvo, mensagem: 'Rascunho do prompt salvo com sucesso' };
  }

  /** Promove o rascunho a ativo (a ativa anterior fica no histórico) e renova o cache do tipo. */
  async ativarRascunho(tipo: TipoPromptEnum, usuarioAtivo: JwtPayload): Promise<StandardResponse<PromptRascunhoAtivadoDto>> {
    this.validarAdministrador(usuarioAtivo);
    const ativado = await this.promptRepositorio.ativarRascunho(tipo);
    if (!ativado) throw new BusinessException('Não há rascunho para ativar neste tipo de prompt');
    this.ativosEmCache.set(tipo, ativado);
    return { sucesso: true, dados: ativado, mensagem: `Versão ${ativado.versao} do prompt ativada com sucesso` };
  }

  /** Reativa a versão 1 sem apagar o histórico e renova o cache do tipo. */
  async restaurarPadrao(tipo: TipoPromptEnum, usuarioAtivo: JwtPayload): Promise<StandardResponse<PromptPadraoRestauradoDto>> {
    this.validarAdministrador(usuarioAtivo);
    const padrao = await this.promptRepositorio.restaurarPadrao(tipo);
    if (!padrao) throw new ResourceNotFoundException('Versão padrão do prompt');
    this.ativosEmCache.set(tipo, padrao);
    return { sucesso: true, dados: padrao, mensagem: 'Prompt padrão restaurado com sucesso' };
  }

  async descartarRascunho(tipo: TipoPromptEnum, usuarioAtivo: JwtPayload): Promise<StandardResponse<void>> {
    this.validarAdministrador(usuarioAtivo);
    if (!(await this.promptRepositorio.descartarRascunho(tipo))) throw new ResourceNotFoundException('Rascunho do prompt');
    return { sucesso: true, dados: undefined, mensagem: 'Rascunho do prompt descartado com sucesso' };
  }

  /** Defesa em profundidade: o `AdministradorGuard` já barra a rota. */
  private validarAdministrador(usuarioAtivo: JwtPayload): void {
    if (!temPermissaoDeAdministrador(usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('Acesso restrito a administradores');
    }
  }
}
