import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LIMITE_CURSOR_DA_CONVERSA_DIRETA, LIMITE_MAXIMO_DA_CONVERSA_DIRETA } from '../../utils/mensagem-direta';

/** Pede uma página de um grupo supervisionado, da mais nova para a mais antiga. Cada abertura (sem cursor) gera uma linha de auditoria. */
export class GrupoSupervisaoLerDto {
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
