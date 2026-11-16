import { UsuarioListarDto } from './UsuarioListarDto';

/**
 * Interno (service → repository): a listagem com a decisão de mostrar ou não o login (task 425). Só quem tem permissão de gestor vê o login
 * dos usuários; para os demais o campo volta nulo e a busca não procura por ele.
 */
export class UsuarioInternoListarDto extends UsuarioListarDto {
    incluiLogin: boolean;
}
