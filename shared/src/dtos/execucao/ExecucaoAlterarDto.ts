import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';

export class ExecucaoAlterarDto {
  @IsString()
  @IsNotEmpty()
  descricao: string;

  @IsOptional()
  @IsDateString()
  inicioData?: string;

  // @IsOptional() ignora a validação quando o valor é null ou undefined,
  // permitindo manter a execução "em andamento" (fimData = null).
  @IsOptional()
  @IsDateString()
  fimData?: string | null;
}
