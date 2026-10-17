import { TipoPromptEnum } from '../../enums/tipo-prompt.enum';
import { PromptResumoDto } from './PromptResumoDto';

/** Um tipo de prompt com a versão ativa e o rascunho (se houver). */
export interface PromptTipoResumoDto {
  tipo: TipoPromptEnum;
  descricao: string;
  ativa: PromptResumoDto;
  rascunho: PromptResumoDto | null;
}
