import { NivelIaEnum } from '../../enums/nivel-ia.enum';
import { PromptTesteSaidaDto } from './PromptTesteSaidaDto';

/** As duas respostas (prompt ativo e candidato) a uma narrativa. */
export interface PromptTesteResultadoDto {
  narrativa: string;
  ativo: PromptTesteSaidaDto;
  candidato: PromptTesteSaidaDto;
}

/** O resultado do teste, na ordem das narrativas, com o nível que o tipo usa (nenhum efeito foi gravado). */
export interface PromptTestadoDto {
  nivel: NivelIaEnum;
  resultados: PromptTesteResultadoDto[];
}
