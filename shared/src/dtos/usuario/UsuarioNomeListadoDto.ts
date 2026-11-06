/** O nome de um usuário não excluído. */
export interface UsuarioNomeListadoDto {
    id: number;
    nomeCompleto: string;
    /** Cor da bolinha escolhida; `null` = cor padrão. */
    corAvatar: string | null;
}
