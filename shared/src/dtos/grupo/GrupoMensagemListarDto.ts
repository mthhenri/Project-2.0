import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LIMITE_CURSOR_DA_CONVERSA_DIRETA, LIMITE_MAXIMO_DA_CONVERSA_DIRETA } from '../../utils/mensagem-direta';

/** Pede uma página da conversa do grupo, da mais nova para a mais antiga. Sem `cursor` vem a mais nova. */
export class GrupoMensagemListarDto {
    /** Vem da rota e é preenchido pela controller; nunca pelo corpo ou pela query. */
    grupoId: number;

    @IsOptional()
    @IsString()
    @MaxLength(LIMITE_CURSOR_DA_CONVERSA_DIRETA)
    cursor?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(LIMITE_MAXIMO_DA_CONVERSA_DIRETA)
    limite?: number;
}
