import { IsDateString } from 'class-validator';

export class PontoTodosConsultarDto {
  @IsDateString()
  data: string;
}
