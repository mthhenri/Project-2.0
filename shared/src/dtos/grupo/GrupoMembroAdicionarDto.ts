import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, Min } from 'class-validator';
import { LIMITE_MEMBROS_DO_GRUPO } from '../../utils/grupo';

/** Qualquer membro adiciona pessoas ao grupo; quem tinha saído pode ser readicionado e passa a ver todo o histórico. Ninguém remove ninguém. */
export class GrupoMembroAdicionarDto {
    /** Vem da rota e é preenchido pela controller; nunca pelo corpo. */
    grupoId: number;

    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(LIMITE_MEMBROS_DO_GRUPO)
    @IsInt({ each: true })
    @Min(1, { each: true })
    usuarioIds: number[];
}
