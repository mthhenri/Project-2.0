import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LIMITE_DO_TEXTO_DO_RESUMO } from '../../utils/grupo-resumo-ia';

/** Pede a proposta de gravar o resumo na documentação de uma demanda (acrescenta ao fim). Canal de demanda: a demanda é a do canal; canal de projeto: `demandaId` é obrigatório. */
export class GrupoResumoIaPropostaCriarDto {
    /** Vêm da rota e são preenchidos pela controller; nunca pelo corpo. */
    grupoId: number;
    resumoId: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(2147483647)
    demandaId?: number;

    /** O texto do resumo como a tela o tem (o servidor não o guarda). */
    @IsString()
    @MaxLength(LIMITE_DO_TEXTO_DO_RESUMO)
    texto: string;
}
