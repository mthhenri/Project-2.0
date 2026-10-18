import { Injectable } from '@nestjs/common';
import { PropostaAtribuirMembroDadosDto, TipoPropostaIaEnum, temPermissaoDeGestor } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { DemandaService } from '../services/demanda.service';

/**
 * Executor da proposta `ATRIBUIR_MEMBRO`: adiciona ou remove o membro pela `DemandaService` com o usuário do token (valem a
 * duplicidade, o "último membro" e o acesso da tela) e só para gestor. Desfazer faz a ação inversa; recusa se o estado já não é o que a
 * proposta deixou (o membro foi removido ou adicionado por outra pessoa depois).
 */
@Injectable()
export class AtribuirMembroExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.ATRIBUIR_MEMBRO;

  constructor(private readonly demandaService: DemandaService) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaAtribuirMembroDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    this.exigirGestor(usuarioAtivo);
    const entrada = validarDadosDaProposta(PropostaAtribuirMembroDadosDto, dados);
    const alvo = { demandaId: entrada.demandaId, usuarioId: entrada.usuarioId };
    if (entrada.acao === 'ADICIONAR') await this.demandaService.atribuirMembro(alvo, usuarioAtivo);
    else await this.demandaService.removerMembro(alvo, usuarioAtivo);
    return { ...alvo, acao: entrada.acao };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    this.exigirGestor(usuarioAtivo);
    const demandaId = Number(resultado['demandaId']);
    const usuarioId = Number(resultado['usuarioId']);
    if (!Number.isInteger(demandaId) || !Number.isInteger(usuarioId)) throw new BusinessException('Não há membro a desfazer nesta proposta');

    const membros = (await this.demandaService.listarMembros({ id: demandaId }, usuarioAtivo)).dados ?? [];
    const ehMembro = membros.some((membro) => membro.usuarioId === usuarioId);
    if (resultado['acao'] === 'ADICIONAR') {
      if (!ehMembro) throw new BusinessException('O membro já não está na demanda: não há o que desfazer');
      await this.demandaService.removerMembro({ demandaId, usuarioId }, usuarioAtivo);
    } else {
      if (ehMembro) throw new BusinessException('O membro já voltou para a demanda: não há o que desfazer');
      await this.demandaService.atribuirMembro({ demandaId, usuarioId }, usuarioAtivo);
    }
  }

  /** Obsoleta quando a demanda já está como a proposta pede (a pessoa já é, ou já não é, membro). */
  async estaObsoleta(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<boolean> {
    const entrada = validarDadosDaProposta(PropostaAtribuirMembroDadosDto, dados);
    const membros = (await this.demandaService.listarMembros({ id: entrada.demandaId }, usuarioAtivo)).dados ?? [];
    const ehMembro = membros.some((membro) => membro.usuarioId === entrada.usuarioId);
    return entrada.acao === 'ADICIONAR' ? ehMembro : !ehMembro;
  }

  private exigirGestor(usuarioAtivo: JwtPayload): void {
    if (!temPermissaoDeGestor(usuarioAtivo.tipo)) throw new UnauthorizedAccessException('Só o gestor atribui membros pela IA');
  }
}
