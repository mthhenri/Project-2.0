import { BaseEntity } from '../../../../core/base/base.entity';
import { TipoPromptEnum } from '@project20/shared';

/** Uma versão de prompt: ativa, rascunho ou antiga (histórico). */
export interface Prompt extends BaseEntity {
  tipo: TipoPromptEnum;
  versao: number;
  conteudo: string;
  ativo: boolean;
  rascunho: boolean;
  usuarioId: number;
}
