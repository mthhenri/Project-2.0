import { Injectable } from '@nestjs/common';
import { MinhasAtividadesListadasDto, MinhasAtividadesListarDto, TipoAtividadeStatusEnum, temPermissaoDeGestor } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { AtividadeService } from '../services/atividade.service';

/** Quantas atividades voltam de uma vez à IA (o resto vira "há mais"): lista longa estoura o contexto sem ajudar a conversa. */
export const LIMITE_ATIVIDADES_DA_FERRAMENTA = 30;

const STATUS_EM_ABERTO = [TipoAtividadeStatusEnum.PLANEJADA, TipoAtividadeStatusEnum.PENDENTE, TipoAtividadeStatusEnum.DESENVOLVENDO];

/**
 * Leitura das atividades do **próprio** usuário, já na ordem de prioridade (a mesma da tela). Chama a `AtividadeService` com o usuário
 * do token, então valem as regras de hoje; o filtro por usuário é sempre o do token, nunca algo que o modelo informe.
 */
@Injectable()
export class ListarMinhasAtividadesFerramenta extends FerramentaIa<MinhasAtividadesListarDto> {
  readonly nome = 'listar_minhas_atividades';
  readonly descricao =
    'Lista as atividades do usuário, da mais para a menos prioritária, com a demanda, o projeto, a prioridade e se há execução em andamento. ' +
    'Por padrão só as em aberto; use incluirDesenvolvidas para ver também as já desenvolvidas. Use para responder "o que eu tenho pra fazer?" ' +
    'e para achar a atividade certa antes de propor iniciar uma execução. Atividade é um bloco do trabalho com várias execuções: se uma delas serve ao relato, reaproveite-a em vez de criar outra. O gestor pode informar `usuarioId` (de listar_usuarios) para ver as atividades de OUTRA pessoa.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'QUALQUER' as const;
  readonly classeDeEntrada = MinhasAtividadesListarDto;

  constructor(private readonly atividadeService: AtividadeService) {
    super();
  }

  async executar(entrada: MinhasAtividadesListarDto, usuarioAtivo: JwtPayload): Promise<MinhasAtividadesListadasDto> {
    const donoId = entrada.usuarioId ?? usuarioAtivo.sub;
    if (donoId !== usuarioAtivo.sub && !temPermissaoDeGestor(usuarioAtivo.tipo)) {
      throw new BusinessException('Só o gestor lê as atividades de outra pessoa.');
    }
    const resposta = await this.atividadeService.listar(
      {
        usuarioId: donoId,
        ...(entrada.incluirDesenvolvidas ? {} : { status: STATUS_EM_ABERTO }),
        itensPorPagina: LIMITE_ATIVIDADES_DA_FERRAMENTA,
      },
      usuarioAtivo,
    );
    const { itens, totalItens } = resposta.dados ?? { itens: [], totalItens: 0 };
    return {
      atividades: itens.map((atividade) => ({
        id: atividade.id,
        nome: atividade.nome,
        status: atividade.status,
        prioridade: atividade.prioridade.descricao,
        demandaId: atividade.demandaId,
        demanda: atividade.nomeDemanda,
        projeto: atividade.nomeProjeto,
        emExecucao: atividade.execucaoAtivaId !== null,
        minutosExecutados: atividade.totalMinutosExecutados,
      })),
      total: totalItens,
      haMais: totalItens > itens.length,
    };
  }
}
