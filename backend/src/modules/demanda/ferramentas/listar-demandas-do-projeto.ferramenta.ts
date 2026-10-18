import { Injectable } from '@nestjs/common';
import { DemandasDoProjetoListadasDto, DemandasDoProjetoListarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { DemandaService } from '../services/demanda.service';

/** Quantas demandas voltam de uma vez à IA. */
export const LIMITE_DEMANDAS_DO_PROJETO_DA_FERRAMENTA = 100;

/**
 * Todas as demandas do projeto, com o caminho na árvore e se são de estrutura (as que aceitam sub-demandas). Chama a `DemandaService`
 * com o usuário do token: o gestor vê todas; o desenvolvedor, as dele (a mesma regra da tela de demandas).
 */
@Injectable()
export class ListarDemandasDoProjetoFerramenta extends FerramentaIa<DemandasDoProjetoListarDto> {
  readonly nome = 'listar_demandas_do_projeto';
  readonly descricao =
    'Lista as demandas de um projeto (id, nome, caminho na árvore, se é de estrutura e a situação). Use para achar a demandaPaiId de uma demanda de estrutura ' +
    'e para ver se a demanda que o usuário quer criar já existe.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = DemandasDoProjetoListarDto;

  constructor(private readonly demandaService: DemandaService) {
    super();
  }

  async executar(entrada: DemandasDoProjetoListarDto, usuarioAtivo: JwtPayload): Promise<DemandasDoProjetoListadasDto> {
    const listadas = (await this.demandaService.listar({ projetoId: entrada.projetoId, allRows: true }, usuarioAtivo)).dados?.itens ?? [];
    return {
      demandas: listadas
        .slice(0, LIMITE_DEMANDAS_DO_PROJETO_DA_FERRAMENTA)
        .map((demanda) => ({ id: demanda.id, nome: demanda.nome, caminho: demanda.caminho, isEstrutural: demanda.isEstrutural, status: demanda.status })),
      total: listadas.length,
      haMais: listadas.length > LIMITE_DEMANDAS_DO_PROJETO_DA_FERRAMENTA,
    };
  }
}
