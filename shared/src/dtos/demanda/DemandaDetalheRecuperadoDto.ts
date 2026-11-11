import { TagResumoDto } from '../tag/TagResumoDto';
import { DemandaAncestralDto } from './DemandaAncestralDto';
import { DemandaConexaoResumoDto } from './DemandaConexaoResumoDto';
import { DemandaMembroDto } from './DemandaMembroDto';
import { DemandaRecuperadaDto } from './DemandaRecuperadaDto';

/**
 * A demanda aberta na tela de Demandas numa chamada só (P-080): os mesmos cinco blocos que as rotas `GET :id`, `:id/ancestral`, `:id/tag`,
 * `:id/membro` e `:id/conexao` devolvem, sem campo novo. Árvore (filhas), plano de origem e atividades continuam nas rotas dos próprios módulos.
 */
export class DemandaDetalheRecuperadoDto {
    demanda: DemandaRecuperadaDto;
    ancestrais: DemandaAncestralDto[];
    tags: TagResumoDto[];
    membros: DemandaMembroDto[];
    conexoes: DemandaConexaoResumoDto[];
}
