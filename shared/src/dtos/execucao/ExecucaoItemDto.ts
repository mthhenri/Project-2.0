export class ExecucaoItemDto {
    id: number;
    atividadeId: number;
    nomeAtividade: string;
    demandaId: number;
    nomeDemanda: string;
    projetoId: number;
    nomeProjeto: string;
    descricao: string;
    inicioData: Date;
    fimData: Date | null;
    duracaoMinutos: number | null;
    usuarioId: number;
    nomeUsuario: string;
    /** Cor da bolinha escolhida pela pessoa (`#RRGGBB`); `null` = cor padrão do tema. */
    corAvatar: string | null;
}
