import { TagResumoDto } from '../tag/TagResumoDto';
import { DemandaAncestralDto } from './DemandaAncestralDto';
import { DemandaConexaoResumoDto } from './DemandaConexaoResumoDto';
import { DemandaMembroDto } from './DemandaMembroDto';
import { DemandaRecuperadaDto } from './DemandaRecuperadaDto';

/**
 * A demanda aberta na tela de Demandas numa chamada só (P-080): os mesmos cinco blocos que as rotas `GET :id`, `:id/ancestral`, `:id/tag`,
 * `:id/membro` e `:id/conexao` devolvem, e os dois campos do chat da demanda (`canalChatExiste`, `podeAbrirCanalChat`). Árvore (filhas), plano de origem e atividades continuam nas rotas dos próprios módulos.
 */
export class DemandaDetalheRecuperadoDto {
    demanda: DemandaRecuperadaDto;
    ancestrais: DemandaAncestralDto[];
    tags: TagResumoDto[];
    membros: DemandaMembroDto[];
    conexoes: DemandaConexaoResumoDto[];
    /** A demanda já tem chat (canal)? A tela escolhe "Abrir chat" ou "Criar chat" sem perguntar ao servidor a cada seleção. */
    canalChatExiste: boolean;
    /** Quem pede pode abrir o chat da demanda: gestor e administrador sempre; os demais só sendo membro dela (o auxiliar também). */
    podeAbrirCanalChat: boolean;
}
