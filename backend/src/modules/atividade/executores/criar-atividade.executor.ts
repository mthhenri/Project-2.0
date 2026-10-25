import { Injectable } from '@nestjs/common';
import { PropostaCriarAtividadeDadosDto, TipoAtividadePrioridadeEnum, TipoAtividadeStatusEnum, TipoPropostaIaEnum, temPermissaoDeGestor } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { AtividadeRepository } from '../repositories/atividade.repository';
import { AtividadeService } from '../services/atividade.service';

/**
 * Executor da proposta `CRIAR_ATIVIDADE`: cria pela `AtividadeService` com o usuário do token (valem o acesso à demanda e as demais
 * regras da tela). A atividade nasce planejada, pronta para iniciar. Desfazer só vale enquanto a atividade não tem nenhuma execução.
 */
@Injectable()
export class CriarAtividadeExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.CRIAR_ATIVIDADE;

  constructor(
    private readonly atividadeService: AtividadeService,
    private readonly atividadeRepositorio: AtividadeRepository,
  ) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaCriarAtividadeDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaCriarAtividadeDadosDto, dados);
    // A service já ignora `usuarioId` de quem não é gestor (e a atividade sairia no nome errado): recusar é melhor que criar para a pessoa errada.
    if (entrada.usuarioId !== undefined && entrada.usuarioId !== usuarioAtivo.sub && !temPermissaoDeGestor(usuarioAtivo.tipo)) {
      throw new BusinessException('Só o gestor cria atividade para outra pessoa');
    }
    const criada = await this.atividadeService.criar(
      {
        demandaId: entrada.demandaId,
        usuarioId: entrada.usuarioId,
        nome: entrada.nome,
        status: TipoAtividadeStatusEnum.PLANEJADA,
        prioridade: entrada.prioridade ?? TipoAtividadePrioridadeEnum.INDEFINIDA,
      },
      usuarioAtivo,
    );
    return { atividadeId: criada.dados?.id, nome: entrada.nome };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const atividadeId = Number(resultado['atividadeId']);
    if (!Number.isInteger(atividadeId)) throw new BusinessException('Não há atividade a desfazer nesta proposta');
    // `recuperar` confere a permissão do usuário sobre a atividade (e a existência).
    await this.atividadeService.recuperar({ id: atividadeId }, usuarioAtivo);
    if (await this.atividadeRepositorio.possuiExecucao({ id: atividadeId })) {
      throw new BusinessException('A atividade já tem execuções: não dá para desfazer a criação');
    }
    await this.atividadeService.excluir({ id: atividadeId }, usuarioAtivo);
  }
}
