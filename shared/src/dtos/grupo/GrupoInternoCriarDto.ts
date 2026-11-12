import { TipoGrupoEnum } from '../../enums/tipo-grupo.enum';

/** Interno (repository): cria o grupo. Só o grupo livre usa a criação nesta task; os canais (task 248) preenchem `projetoId` ou `demandaId`. */
export interface GrupoInternoCriarDto {
    nome: string;
    tipo: TipoGrupoEnum;
    criadorUsuarioId: number;
    /** `#RRGGBB` em maiúsculas; `null` = degradê dos membros. */
    corAvatar: string | null;
    /** Um emoji no lugar das iniciais; `null` = iniciais do nome. */
    emojiAvatar: string | null;
    projetoId: number | null;
    demandaId: number | null;
}
