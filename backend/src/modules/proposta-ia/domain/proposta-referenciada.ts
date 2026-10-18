import { PropostaIaResumoDto, StatusPropostaIaEnum, TipoPropostaIaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PropostaIaService } from '../services/proposta-ia.service';

/**
 * Uma proposta que outra proposta usa como pai (a demanda dentro de um projeto que ainda vai ser criado, a sub-demanda de uma demanda
 * proposta no mesmo pedido). Na hora de propor ela pode estar pendente; só na hora de executar precisa estar confirmada.
 * Lança `BusinessException` se não for do tipo esperado ou não estiver em uso; `recuperarPorId` já recusa proposta de outro usuário.
 */
export async function recuperarPropostaReferenciada(
  propostaIaService: PropostaIaService,
  propostaId: number,
  tipoEsperado: TipoPropostaIaEnum,
  usuarioAtivo: JwtPayload,
): Promise<PropostaIaResumoDto> {
  const proposta = (await propostaIaService.recuperarPorId(propostaId, usuarioAtivo)).dados;
  if (!proposta || proposta.tipo !== tipoEsperado) {
    throw new BusinessException(`A proposta ${propostaId} não é uma proposta do tipo ${tipoEsperado}`);
  }
  if (proposta.status === StatusPropostaIaEnum.EXPIRADA || proposta.status === StatusPropostaIaEnum.DESFEITA) {
    throw new BusinessException(`A proposta ${propostaId} foi recusada ou desfeita: proponha de novo`);
  }
  return proposta;
}

/** O id que a proposta confirmada criou (`resultado[chave]`); antes de confirmada, orienta o usuário a confirmar a proposta antes. */
export function idCriadoPelaProposta(proposta: PropostaIaResumoDto, chave: string, descricao: string): number {
  const confirmada = proposta.status === StatusPropostaIaEnum.CONFIRMADA || proposta.status === StatusPropostaIaEnum.AJUSTADA;
  const id = Number(proposta.resultado?.[chave]);
  if (!confirmada || !Number.isInteger(id)) {
    throw new BusinessException(`Confirme antes ${descricao} (a proposta ${proposta.id}): esta depende dela`);
  }
  return id;
}
