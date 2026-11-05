import { TipoProvedorIaEnum } from '../../enums/tipo-provedor-ia.enum';

/** Um modelo que o provedor oferece: o select mostra o `nome` (amigável quando o provedor informa) e grava o `id` (o nome que a API recebe). */
export interface IaModeloListadoDto {
    id: string;
    nome: string;
}

/**
 * Os modelos de texto de um provedor (spec 309), já filtrados. `disponivel` é `false` (e `modelos` vazio) quando o provedor não tem chave no
 * ambiente **ou** a listagem falhou: a tela não precisa saber qual dos dois e volta ao campo de digitação à mão.
 */
export interface IaModelosProvedorListadoDto {
    provedor: TipoProvedorIaEnum;
    disponivel: boolean;
    modelos: IaModeloListadoDto[];
}
