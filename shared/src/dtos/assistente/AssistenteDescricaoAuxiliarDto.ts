import { IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AssistenteDescricaoAuxiliarDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  textoOriginal: string;

  @IsIn(['execucao', 'demanda'])
  tipoEntidade: 'execucao' | 'demanda';

  @IsString()
  @IsNotEmpty()
  contextoEntidade: string;
}
