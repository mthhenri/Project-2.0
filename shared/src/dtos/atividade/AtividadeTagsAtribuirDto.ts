import { IsArray, IsNumber } from 'class-validator';

export class AtividadeTagsAtribuirDto {
  @IsArray()
  @IsNumber({}, { each: true })
  tagIds: number[];
}
