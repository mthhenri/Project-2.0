import { IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class AssistenteDescricaoAuxiliarDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(8000)
    textoOriginal: string;

    @IsIn(['execucao', 'demanda'])
    tipoEntidade: 'execucao' | 'demanda';

    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    contextoEntidade: string;
}
