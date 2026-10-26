import { IsBoolean } from 'class-validator';

export class PlanoSoloMarcarDto {
  @IsBoolean()
  isSolo: boolean;
}
