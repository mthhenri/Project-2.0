import { StatusPropostaIaEnum, TipoPropostaIaEnum } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { FerramentaIa } from '../domain/ferramenta-ia';

/**
 * Base das ferramentas que **propõem** uma ação. Ela só conhece a `PropostaIaService`: cria uma proposta e devolve ao modelo o que
 * aconteceu. Por padrão a proposta fica pendente e a ação só roda quando o usuário confirma (executor do tipo, task 136). Se o nível do
 * tipo é "Faz e avisa" (task 228), o serviço a confirma na hora, em nome do usuário do token, e o modelo recebe "feito"; o nível é decidido
 * no backend, não pela ferramenta nem pelo modelo. Por construção, nenhuma ferramenta de proposta tem acesso a uma service de domínio.
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
    const proposta = await this.propostaIaService.criarComAutonomia(
      { usuarioId: usuarioAtivo.sub, tipo: this.tipoProposta, dados: await this.montarDados(entrada, usuarioAtivo) },
      usuarioAtivo,
    );
    const feita = proposta.status === StatusPropostaIaEnum.CONFIRMADA;
    return {
      propostaId: proposta.id,
      situacao: proposta.status,
      mensagem: feita
        ? 'Feito: a ação já foi executada em nome do usuário. Ele vê uma linha de aviso na conversa, com Desfazer por 30 minutos. Não peça confirmação; diga em uma frase o que foi feito.'
        : 'Proposta criada. Nada foi feito ainda: o usuário precisa confirmar no cartão da conversa.',
    };
  }
}
