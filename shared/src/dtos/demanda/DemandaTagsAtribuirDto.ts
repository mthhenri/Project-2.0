import { IsArray, IsNumber } from 'class-validator';

export class DemandaTagsAtribuirDto {
  @IsArray()
  @IsNumber({}, { each: true })
  tagIds: number[];
}
