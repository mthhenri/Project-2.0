import { MensagemDiretaBuscarDto } from '../mensagem-direta/MensagemDiretaBuscarDto';

/** Busca textual (sem acento) dentro de **um** grupo ou canal, com período e filtro "Com código" opcionais: os mesmos filtros da busca geral do popup. */
export class GrupoMensagemBuscarDto extends MensagemDiretaBuscarDto {
    /** Vem da rota e é preenchido pela controller; nunca pela query. */
    grupoId: number;
}
