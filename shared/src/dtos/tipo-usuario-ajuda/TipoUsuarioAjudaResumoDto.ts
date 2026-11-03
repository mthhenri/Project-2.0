import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

/** O texto de ajuda de um tipo de usuário, em Markdown (linhas `✓` e `✕` para o que pode e não pode). */
export class TipoUsuarioAjudaResumoDto {
    tipo: TipoUsuarioEnum;
    texto: string;
}
