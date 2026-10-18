import { Injectable } from '@nestjs/common';
import { PropostaDescreverDemandaDadosDto, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ExecutorPropostaIa } from '../../proposta-ia/domain/executor-proposta-ia';
import { validarDadosDaProposta } from '../../proposta-ia/domain/validar-dados-da-proposta';
import { DemandaService } from '../services/demanda.service';

/**
 * Executor da proposta `DESCREVER_DEMANDA`: grava a descrição do cliente e/ou a técnica pela `DemandaService.alterar` com o usuário do
 * token (a descrição do cliente é só do gestor). Guarda no resultado o texto anterior e o que gravou. Desfazer restaura o anterior de
 * cada campo **só se** ele ainda for o que a IA gravou: se outra pessoa editou depois, recusa e não perde a edição dela.
 */
@Injectable()
export class DescreverDemandaExecutor implements ExecutorPropostaIa {
  readonly tipo = TipoPropostaIaEnum.DESCREVER_DEMANDA;

  constructor(private readonly demandaService: DemandaService) {}

  validar(dados: Record<string, unknown>): void {
    const entrada = validarDadosDaProposta(PropostaDescreverDemandaDadosDto, dados);
    if (!entrada.descricaoCliente?.trim() && !entrada.descricaoTecnica?.trim()) throw new BusinessException('Informe ao menos uma descrição');
  }

  async executar(dados: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> {
    const entrada = validarDadosDaProposta(PropostaDescreverDemandaDadosDto, dados);
    const cliente = entrada.descricaoCliente?.trim() || undefined;
    const tecnica = entrada.descricaoTecnica?.trim() || undefined;
    if (!cliente && !tecnica) throw new BusinessException('Informe ao menos uma descrição');

    const atual = (await this.demandaService.recuperar({ id: entrada.demandaId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Demanda não encontrada');
    await this.demandaService.alterar({ id: entrada.demandaId, ...(cliente ? { descricaoCliente: cliente } : {}), ...(tecnica ? { descricaoTecnica: tecnica } : {}) }, usuarioAtivo);
    return {
      demandaId: entrada.demandaId,
      ...(cliente ? { gravouCliente: cliente, anteriorCliente: atual.descricaoCliente } : {}),
      ...(tecnica ? { gravouTecnica: tecnica, anteriorTecnica: atual.descricaoTecnica } : {}),
    };
  }

  async desfazer(resultado: Record<string, unknown>, usuarioAtivo: JwtPayload): Promise<void> {
    const demandaId = Number(resultado['demandaId']);
    if (!Number.isInteger(demandaId)) throw new BusinessException('Não há demanda a desfazer nesta proposta');
    const atual = (await this.demandaService.recuperar({ id: demandaId }, usuarioAtivo)).dados;
    if (!atual) throw new BusinessException('Demanda não encontrada');

    const restaurar: { descricaoCliente?: string | null; descricaoTecnica?: string | null } = {};
    if (typeof resultado['gravouCliente'] === 'string') {
      if (atual.descricaoCliente !== resultado['gravouCliente']) throw new BusinessException('A descrição do cliente foi alterada depois: não dá para desfazer sem perder essa edição');
      restaurar.descricaoCliente = (resultado['anteriorCliente'] as string | null) ?? null;
    }
    if (typeof resultado['gravouTecnica'] === 'string') {
      if (atual.descricaoTecnica !== resultado['gravouTecnica']) throw new BusinessException('A descrição técnica foi alterada depois: não dá para desfazer sem perder essa edição');
      restaurar.descricaoTecnica = (resultado['anteriorTecnica'] as string | null) ?? null;
    }
    await this.demandaService.alterar({ id: demandaId, ...restaurar }, usuarioAtivo);
  }
}
