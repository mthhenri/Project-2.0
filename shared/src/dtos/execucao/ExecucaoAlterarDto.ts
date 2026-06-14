import { IsNotEmpty, IsString } from 'class-validator';

export class ExecucaoAlterarDto {
  @IsString()
  @IsNotEmpty()
  descricao: string;
}
