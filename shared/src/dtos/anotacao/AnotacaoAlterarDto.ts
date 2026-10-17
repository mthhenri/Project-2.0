import { Type } from 'class-transformer';
import { IsDate, IsString } from 'class-validator';

/** Substitui a seção inteira. Só grava se a seção ainda está como a tela a leu (`updatedDateLido`). */
export class AnotacaoAlterarDto {
  @IsString()
  texto: string;

  /** `updatedDate` da seção quando a tela a leu. */
  @Type(() => Date)
  @IsDate()
  updatedDateLido: Date;
}
