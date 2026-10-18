import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

/** Entrada da ferramenta `sugerir_conexoes_e_lugar` (gestor): a demanda a analisar (o id vem de `listar_demandas_do_projeto`). */
export class SugerirConexoesELugarDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaId: number;
}

export type TipoDaSugestao = 'CONEXAO' | 'LUGAR';

/** Uma sugestão fundamentada: ligar a demanda a outra (`CONEXAO`) ou movê-la para baixo de uma demanda de estrutura (`LUGAR`). */
export interface SugestaoDeConexaoOuLugarDto {
  tipo: TipoDaSugestao;
  /** A outra demanda da conexão, ou a demanda de estrutura que seria a nova pai. */
  demandaRelacionadaId: number;
  demandaRelacionadaNome: string;
  /** Só em `CONEXAO`: a ligação vale nos dois sentidos. */
  ehBidirecional: boolean;
  motivo: string;
}

/** O que a ferramenta devolve: sugestões para a IA apresentar e **perguntar**; nada é proposto nem gravado por ela. */
export interface SugestoesDeConexaoELugarDto {
  demandaId: number;
  sugestoes: SugestaoDeConexaoOuLugarDto[];
  semSugestoes: boolean;
}
