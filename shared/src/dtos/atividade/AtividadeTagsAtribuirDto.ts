import { IsArray, IsNumber, IsOptional } from 'class-validator';

export class AtividadeTagsAtribuirDto {
  /** Id da atividade, injetado pela controller a partir de `@Param('id')`. */
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsArray()
  @IsNumber({}, { each: true })
  tagIds: number[];
}
