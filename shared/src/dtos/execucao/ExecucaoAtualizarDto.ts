import { IsNotEmpty, IsString } from 'class-validator';

export class ExecucaoAtualizarDto {
  @IsString()
  @IsNotEmpty()
  descricao: string;
}
