import { TipoPropostaIaEnum } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { FerramentaIa } from '../domain/ferramenta-ia';

/**
 * Base das ferramentas que **propõem** uma ação. Ela só conhece a `PropostaIaService`: cria uma proposta pendente e devolve ao modelo
 * que o usuário ainda precisa confirmar. A ação em si só roda quando o usuário confirma (executor do tipo, task 136); por construção,
 * nenhuma ferramenta de proposta tem acesso a uma service de domínio.
 */
export abstract class FerramentaPropostaIa<TEntrada extends object = object> extends FerramentaIa<TEntrada> {
  readonly tipo = 'PROPOSTA' as const;
  abstract readonly tipoProposta: TipoPropostaIaEnum;

  constructor(private readonly propostaIaService: PropostaIaService) {
    super();
  }

  /** Os dados guardados na proposta; por padrão, a própria entrada validada. */
  protected montarDados(entrada: TEntrada, _usuarioAtivo: JwtPayload): Promise<Record<string, unknown>> | Record<string, unknown> {
    return { ...entrada } as Record<string, unknown>;
  }

  async executar(entrada: TEntrada, usuarioAtivo: JwtPayload): Promise<unknown> {
    const proposta = await this.propostaIaService.criar({
      usuarioId: usuarioAtivo.sub,
      tipo: this.tipoProposta,
      dados: await this.montarDados(entrada, usuarioAtivo),
    });
    return {
      propostaId: proposta.id,
      situacao: proposta.status,
      mensagem: 'Proposta criada. Nada foi feito ainda: o usuário precisa confirmar no cartão da conversa.',
    };
  }
}
