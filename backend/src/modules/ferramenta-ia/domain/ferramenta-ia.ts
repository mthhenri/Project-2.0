import { temPermissaoDeAdministrador, temPermissaoDeGestor, TipoUsuarioEnum } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

/** Uma ferramenta de leitura devolve dados; uma de proposta só cria uma proposta (nunca executa a ação). */
export type TipoFerramentaIa = 'LEITURA' | 'PROPOSTA';

/** Quem pode usar a ferramenta (as mesmas regras de tipo de usuário do resto do sistema). */
export type PermissaoFerramentaIa = 'QUALQUER' | 'GESTOR' | 'ADMINISTRADOR';

/** O que volta ao modelo depois de uma ferramenta: sempre um texto (JSON) e se foi erro. Nunca uma exceção que derrube o turno. */
export interface ResultadoFerramentaIa {
  conteudo: string;
  erro: boolean;
  /** Preenchido quando a ferramenta de proposta criou uma proposta (o chat mostra o cartão). */
  propostaId?: number;
}

export type ClasseDeEntrada<T extends object> = new () => T;

/**
 * Uma função que a IA pode pedir. Roda **em nome do usuário**: recebe o `JwtPayload` dele e chama as mesmas services de hoje, com as
 * mesmas permissões. O esquema JSON mostrado ao modelo é gerado da classe de entrada validada (um só lugar, sem duplicar).
 */
export abstract class FerramentaIa<TEntrada extends object = object> {
  abstract readonly nome: string;
  /** O que o modelo lê para decidir quando usar a ferramenta. */
  abstract readonly descricao: string;
  abstract readonly tipo: TipoFerramentaIa;
  abstract readonly permissao: PermissaoFerramentaIa;
  abstract readonly classeDeEntrada: ClasseDeEntrada<TEntrada>;

  /**
   * Ferramenta que depende de uma configuração (flag da IA): quando devolve `false` ela some da lista do modelo e, se for chamada
   * mesmo assim, é recusada. Sem este método, a ferramenta está sempre habilitada.
   */
  habilitada?(): boolean;

  /** Devolve algo serializável em JSON; limitar o tamanho do que devolve é responsabilidade de cada ferramenta. */
  abstract executar(entrada: TEntrada, usuarioAtivo: JwtPayload): Promise<unknown>;
}

export function usuarioPodeUsar(permissao: PermissaoFerramentaIa, tipo: TipoUsuarioEnum): boolean {
  switch (permissao) {
    case 'QUALQUER':
      return true;
    case 'GESTOR':
      return temPermissaoDeGestor(tipo);
    case 'ADMINISTRADOR':
      return temPermissaoDeAdministrador(tipo);
  }
}
