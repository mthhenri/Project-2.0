import { Injectable } from '@nestjs/common';
import { PropostaAtribuirMembroDadosDto, TipoPropostaIaEnum, TipoUsuarioStatusEnum, temPermissaoDeGestor } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { DemandaService } from '../services/demanda.service';

/**
 * Executor da proposta `ATRIBUIR_MEMBRO`: adiciona ou remove o membro pela `DemandaService` com o usuário do token (valem a
 * duplicidade, o "último membro", o acesso ao projeto e a regra de que o desenvolvedor só mexe em si mesmo). Desfazer faz a ação inversa; recusa se o estado já não é o que a
 * proposta deixou (o membro foi removido ou adicionado por outra pessoa depois).
 */
@Injectable()
export class AtribuirMembroExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.ATRIBUIR_MEMBRO;

  constructor(
    private readonly demandaService: DemandaService,
    private readonly usuarioService: UsuarioService,
  ) {}

  validar(dados: Record<string, unknown>): void {
    validarDadosDaProposta(PropostaAtribuirMembroDadosDto, dados);
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaAtribuirMembroDadosDto, dados);
    const alvo = { demandaId: entrada.demandaId, usuarioId: entrada.usuarioId ?? usuarioAtivo.sub };
    if (entrada.acao === 'ADICIONAR') {
      // A `DemandaService.atribuirMembro` não confere o tipo do alvo, e a rota de ajuste aceita dados alterados: a regra "gestor não entra em
      // `demanda_usuario`" vale aqui também, não só na ferramenta que propôs.
      const dono = (await this.usuarioService.recuperar({ id: alvo.usuarioId }, usuarioAtivo)).dados;
      if (!dono) throw new BusinessException('Usuário não encontrado');
      if (temPermissaoDeGestor(dono.tipo)) throw new BusinessException(`${dono.nomeCompleto} é gestor: gestores têm acesso por tipo e não são atribuídos como membros`);
      if (dono.status !== TipoUsuarioStatusEnum.ATIVO) throw new BusinessException(`${dono.nomeCompleto} está inativo e não pode ser atribuído`);
      await this.demandaService.atribuirMembro(alvo, usuarioAtivo);
    } else {
      await this.demandaService.removerMembro(alvo, usuarioAtivo);
    }
    return { ...alvo, acao: entrada.acao };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
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
    const ehMembro = membros.some((membro) => membro.usuarioId === (entrada.usuarioId ?? usuarioAtivo.sub));
    return entrada.acao === 'ADICIONAR' ? ehMembro : !ehMembro;
  }

}
