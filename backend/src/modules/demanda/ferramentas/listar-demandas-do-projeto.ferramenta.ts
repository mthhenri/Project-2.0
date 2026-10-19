import { Injectable } from '@nestjs/common';
import { DemandaDaFerramentaDto, DemandaGrafoNoDto, DemandasDoProjetoListadasDto, DemandasDoProjetoListarDto, TipoUsuarioEnum } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { DemandaService } from '../services/demanda.service';

/** Quantas demandas voltam de uma vez à IA. */
export const LIMITE_DEMANDAS_DO_PROJETO_DA_FERRAMENTA = 100;

/**
 * Todas as demandas do projeto, com o caminho na árvore e se são de estrutura (as que aceitam sub-demandas). Chama a `DemandaService`
 * com o usuário do token. O gestor recebe a listagem da tela. O desenvolvedor recebe as demandas do projeto **inteiro** (o mesmo que o grafo
 * mostra a quem tem acesso ao projeto), cada uma marcada com `participa`, para a IA achar pelo nome uma demanda em que ele ainda não está
 * ("quero participar da demanda X"); a regra da listagem da tela (`listar`, só as dele) continua a mesma.
 */
@Injectable()
export class ListarDemandasDoProjetoFerramenta extends FerramentaIa<DemandasDoProjetoListarDto> {
  readonly nome = 'listar_demandas_do_projeto';
  readonly descricao =
    'Lista as demandas de um projeto (id, nome, caminho na árvore, se é de estrutura e a situação). Use para achar a demandaPaiId de uma demanda de estrutura ' +
    'e para ver se a demanda que o usuário quer criar já existe. Para o desenvolvedor, lista as demandas do projeto inteiro e `participa` diz se ele já é membro (use para "quero participar da demanda X").';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = DemandasDoProjetoListarDto;

  constructor(private readonly demandaService: DemandaService) {
    super();
  }

  async executar(entrada: DemandasDoProjetoListarDto, usuarioAtivo: JwtPayload): Promise<DemandasDoProjetoListadasDto> {
    const listadas =
      usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR
        ? await this.listarDoProjetoInteiro(entrada.projetoId, usuarioAtivo)
        : ((await this.demandaService.listar({ projetoId: entrada.projetoId, allRows: true }, usuarioAtivo)).dados?.itens ?? []).map(
            (demanda): DemandaDaFerramentaDto => ({ id: demanda.id, nome: demanda.nome, caminho: demanda.caminho, isEstrutural: demanda.isEstrutural, status: demanda.status }),
          );
    return {
      demandas: listadas.slice(0, LIMITE_DEMANDAS_DO_PROJETO_DA_FERRAMENTA),
      total: listadas.length,
      haMais: listadas.length > LIMITE_DEMANDAS_DO_PROJETO_DA_FERRAMENTA,
    };
  }

  /** O desenvolvedor: o grafo (que confere o acesso dele ao projeto) dá todas as demandas; a listagem dele dá em quais ele é membro. */
  private async listarDoProjetoInteiro(projetoId: number, usuarioAtivo: JwtPayload): Promise<DemandaDaFerramentaDto[]> {
    const nos = (await this.demandaService.recuperarGrafo({ projetoId }, usuarioAtivo)).dados?.nos ?? [];
    const minhas = (await this.demandaService.listar({ projetoId, allRows: true }, usuarioAtivo)).dados?.itens ?? [];
    const minhasIds = new Set(minhas.map((demanda) => demanda.id));
    const nosPorId = new Map(nos.map((no) => [no.id, no]));
    return nos.map((no) => ({
      id: no.id,
      nome: no.nome,
      caminho: caminhoDoNo(no, nosPorId),
      isEstrutural: no.isEstrutural,
      status: no.status,
      participa: minhasIds.has(no.id),
    }));
  }
}

/** "Raiz > Filha > Demanda", subindo pelo pai até a raiz (com trava contra um pai que se repita). */
function caminhoDoNo(no: DemandaGrafoNoDto, nosPorId: Map<number, DemandaGrafoNoDto>): string {
  const nomes = [no.nome];
  const vistos = new Set([no.id]);
  let paiId = no.demandaPaiId;
  while (paiId !== null && !vistos.has(paiId)) {
    const pai = nosPorId.get(paiId);
    if (!pai) break;
    vistos.add(pai.id);
    nomes.unshift(pai.nome);
    paiId = pai.demandaPaiId;
  }
  return nomes.join(' > ');
}
