import { IsBoolean } from 'class-validator';

/** Silencia (ou reativa) os avisos do grupo para quem pede. */
export class GrupoSilencioAlterarDto {
    /** Vem da rota e é preenchido pela controller; nunca pelo corpo. */
    grupoId: number;

    @IsBoolean()
    silenciada: boolean;
}
