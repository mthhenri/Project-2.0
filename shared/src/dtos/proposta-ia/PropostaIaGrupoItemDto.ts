import { PropostaIaGrupoSituacaoEnum } from '../../enums/proposta-ia-grupo-situacao.enum';
import { PropostaIaResumoDto } from './PropostaIaResumoDto';

/** O resultado de uma proposta numa resolução em grupo (task 227): o que aconteceu, o motivo se não deu certo e a proposta como ficou. */
export interface PropostaIaGrupoItemDto {
  propostaId: number;
  situacao: PropostaIaGrupoSituacaoEnum;
  /** Só quando `situacao` não é `RESOLVIDA`: o texto para a linha da proposta. */
  motivo: string | null;
  /** A proposta depois da tentativa (a tela atualiza a linha com ela); `null` se não foi possível lê-la. */
  proposta: PropostaIaResumoDto | null;
}
