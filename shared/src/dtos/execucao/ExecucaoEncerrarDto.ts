import { IsNotEmpty, IsString } from 'class-validator';

export class ExecucaoEncerrarDto {
  @IsString()
  @IsNotEmpty()
  descricao: string;
}
