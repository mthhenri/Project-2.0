import { IsIn, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AssistenteDescricaoAuxiliarDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  textoOriginal: string;

  @IsIn(['execucao', 'atividade', 'demanda'])
  tipoEntidade: 'execucao' | 'atividade' | 'demanda';

  @IsString()
  @IsNotEmpty()
  contextoEntidade: string;
}
