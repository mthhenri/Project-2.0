import { TipoPromptEnum } from '../../enums/tipo-prompt.enum';

/**
 * Uma versão de prompt: ativa (`ativo`), rascunho (`rascunho`) ou antiga (as duas falsas, o histórico).
 * O texto de uma versão nunca é reescrito: editar é salvar o rascunho, ativar é trocar quem é a ativa.
 */
export interface PromptResumoDto {
  id: number;
  tipo: TipoPromptEnum;
  versao: number;
  /** Markdown. */
  conteudo: string;
  ativo: boolean;
  rascunho: boolean;
  usuarioId: number;
  /** Autor da versão. */
  usuarioNome: string;
  createdDate: Date;
}
