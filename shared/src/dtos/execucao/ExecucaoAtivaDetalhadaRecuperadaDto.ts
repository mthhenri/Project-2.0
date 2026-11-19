/** A execução ativa de um usuário com os nomes da atividade, da demanda, do projeto e do dono (`ExecucaoAtivaDto` só traz os ids). */
export class ExecucaoAtivaDetalhadaRecuperadaDto {
    id: number;
    atividadeId: number;
    descricao: string;
    inicioData: Date;
    /** Ausentes quando a demanda, o projeto ou o dono foram excluídos: a execução continua ativa, só o nome não aparece. */
    nomeAtividade: string;
    nomeDemanda: string | null;
    nomeProjeto: string | null;
    nomeUsuario: string | null;
}
