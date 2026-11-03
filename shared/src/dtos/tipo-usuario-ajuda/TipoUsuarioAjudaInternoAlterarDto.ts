import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

/** Da service ao repository: o texto de ajuda de um tipo, já sem espaço nas pontas. */
export class TipoUsuarioAjudaInternoAlterarDto {
    tipo: TipoUsuarioEnum;
    texto: string;
}
