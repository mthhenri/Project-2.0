import { IsBoolean } from 'class-validator';

export class PlanoArquivarDto {
    /** `true` arquiva; `false` devolve o plano ao seletor. */
    @IsBoolean()
    arquivado: boolean;
}
