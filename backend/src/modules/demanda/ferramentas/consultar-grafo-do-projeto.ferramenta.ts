import { Injectable } from '@nestjs/common';
import { GrafoDoProjetoConsultadoDto, GrafoDoProjetoConsultarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { DemandaService } from '../services/demanda.service';

/** Quantas demandas voltam de uma vez à IA; o resto vira "há mais". */
export const LIMITE_DEMANDAS_DO_GRAFO = 80;

/**
 * O grafo de demandas de um projeto, resumido (task 153): cada demanda com a hierarquia (`paiId`), o andamento e se tem descrição, mais as
 * conexões entre elas. Só o gestor; chama a `DemandaService` com o usuário do token.
 */
@Injectable()
export class ConsultarGrafoDoProjetoFerramenta extends FerramentaIa<GrafoDoProjetoConsultarDto> {
  readonly nome = 'consultar_grafo_do_projeto';
  readonly descricao =
    'Devolve o grafo de demandas de um projeto, resumido: cada demanda com o pai na hierarquia, se é de estrutura, o status, as horas estimadas e executadas e se já tem descrição, ' +
    'e as conexões entre demandas. Use para entender como o projeto está organizado antes de sugerir um lugar ou uma conexão.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = GrafoDoProjetoConsultarDto;

  constructor(private readonly demandaService: DemandaService) {
    super();
  }

  async executar(entrada: GrafoDoProjetoConsultarDto, usuarioAtivo: JwtPayload): Promise<GrafoDoProjetoConsultadoDto> {
    const grafo = (await this.demandaService.recuperarGrafo({ projetoId: entrada.projetoId }, usuarioAtivo)).dados;
    const nos = grafo?.nos ?? [];
    return {
      projetoId: entrada.projetoId,
      demandas: nos.slice(0, LIMITE_DEMANDAS_DO_GRAFO).map((no) => ({
        id: no.id,
        nome: no.nome,
        status: no.status,
        isEstrutural: no.isEstrutural,
        paiId: no.demandaPaiId,
        horasEstimadas: no.horasEstimadas,
        horasExecutadas: Math.round((no.minutosExecutados / 60) * 10) / 10,
        temDescricaoTecnica: no.temDescricaoTecnica,
        temDescricaoCliente: no.temDescricaoCliente,
        tags: no.tags.map((tag) => tag.nome),
      })),
      conexoes: (grafo?.arestas ?? []).filter((aresta) => aresta.tipo === 'conexao').map((aresta) => ({ origemId: aresta.origemId, destinoId: aresta.destinoId, bidirecional: aresta.ehBidirecional })),
      totalDemandas: nos.length,
      haMaisDemandas: nos.length > LIMITE_DEMANDAS_DO_GRAFO,
    };
  }
}
