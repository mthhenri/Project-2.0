import { GrupoResumoIaEstimarDto } from './GrupoResumoIaEstimarDto';

/** Confirma e executa o resumo: o mesmo corpo da estimativa (o servidor refaz as contas, nunca confia no que a tela estimou). */
export class GrupoResumoIaCriarDto extends GrupoResumoIaEstimarDto {}
