/** Uma demanda em que o usuário pode criar atividades, como a IA a lê. */
export interface MinhaDemandaResumoDto {
  id: number;
  nome: string;
  projeto: string;
}

/** O que a ferramenta `listar_minhas_demandas` devolve à IA. */
export interface MinhasDemandasListadasDto {
  demandas: MinhaDemandaResumoDto[];
  total: number;
  haMais: boolean;
}
