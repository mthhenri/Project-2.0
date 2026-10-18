import { Injectable } from '@nestjs/common';
import { MinhasDemandasListadasDto, MinhasDemandasListarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { DemandaService } from '../services/demanda.service';

/** Quantas demandas voltam de uma vez à IA. */
export const LIMITE_DEMANDAS_DA_FERRAMENTA = 50;

/**
 * As demandas em que o usuário pode criar atividades (as atribuídas a ele; o gestor vê todas), com o id que
 * `propor_criar_atividade` pede. Chama a `DemandaService` com o usuário do token: as mesmas regras do seletor da tela.
 */
@Injectable()
export class ListarMinhasDemandasFerramenta extends FerramentaIa<MinhasDemandasListarDto> {
  readonly nome = 'listar_minhas_demandas';
  readonly descricao =
    'Lista as demandas em que o usuário pode criar atividades, com o id, o nome e o projeto de cada uma. Use para achar o demandaId certo quando o usuário ' +
    'disser "na demanda X tenho que fazer Y", inclusive quando ele ainda não tem atividade nessa demanda.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = MinhasDemandasListarDto;

  constructor(private readonly demandaService: DemandaService) {
    super();
  }

  async executar(_entrada: MinhasDemandasListarDto, usuarioAtivo: JwtPayload): Promise<MinhasDemandasListadasDto> {
    const atribuidas = (await this.demandaService.listarAtribuidas(usuarioAtivo)).dados ?? [];
    return {
      demandas: atribuidas.slice(0, LIMITE_DEMANDAS_DA_FERRAMENTA).map((demanda) => ({ id: demanda.id, nome: demanda.nome, projeto: demanda.nomeProjeto })),
      total: atribuidas.length,
      haMais: atribuidas.length > LIMITE_DEMANDAS_DA_FERRAMENTA,
    };
  }
}
