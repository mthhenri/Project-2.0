import { ContextoChatEnum, temPermissaoDeAdministrador, temPermissaoDeGestor, TipoUsuarioEnum, temVisibilidadeTotal } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';

/**
 * Uma ferramenta de leitura devolve dados; uma de proposta só cria uma proposta (nunca executa a ação); uma de rascunho (task 234) grava só no
 * rascunho do plano, que nunca é dado do sistema: a demanda só muda quando a pessoa publica.
 */
export type TipoFerramentaIa = 'LEITURA' | 'PROPOSTA' | 'RASCUNHO';

/**
 * Onde a IA conversa: o chat de perguntas (e o check-in), a conversa de um plano ou o `@IA` do chat entre colaboradores (task 315), em que a
 * resposta é lida por outras pessoas. Cada um enxerga o seu conjunto de ferramentas.
 */
export type EscopoDaFerramentaIa = 'CHAT' | 'PLANEJAMENTO' | 'COLABORADORES';

/** Quem pode usar a ferramenta (as mesmas regras de tipo de usuário do resto do sistema). */
export type PermissaoFerramentaIa = 'QUALQUER' | 'AUXILIAR' | 'GESTOR' | 'ADMINISTRADOR';

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
/** De onde a IA está chamando a ferramenta; só quem decide algo por isso lê (as propostas, para o nível). */
export interface OrigemDaFerramentaIa {
    contexto: ContextoChatEnum;
    /** Onde a IA está respondendo; ausente vale `CHAT`. Quem barra a ferramenta `somenteChatPrivado` é o registro, por aqui. */
    escopo?: EscopoDaFerramentaIa;
}

export abstract class FerramentaIa<TEntrada extends object = object> {
    abstract readonly nome: string;
    /** O que o modelo lê para decidir quando usar a ferramenta. */
    abstract readonly descricao: string;
    abstract readonly tipo: TipoFerramentaIa;
    abstract readonly permissao: PermissaoFerramentaIa;
    abstract readonly classeDeEntrada: ClasseDeEntrada<TEntrada>;
    /** Ferramenta do plano: só a conversa do planejamento a vê (o chat de perguntas nunca a lista). */
    readonly somentePlanejamento?: boolean;
    /**
     * Ferramenta que lê o que é só de quem pergunta (as conversas dele com a IA): só o chat privado a vê. Fica de fora do `@IA` entre colaboradores
     * e da conversa do plano, onde a resposta é lida por outras pessoas (spec 363), e é recusada se for chamada de lá.
     */
    readonly somenteChatPrivado?: boolean;

    /**
   * Ferramenta que depende de uma configuração (flag da IA): quando devolve `false` ela some da lista do modelo e, se for chamada
   * mesmo assim, é recusada. Sem este método, a ferramenta está sempre habilitada.
   */
    habilitada?(): boolean;

    /** Devolve algo serializável em JSON; limitar o tamanho do que devolve é responsabilidade de cada ferramenta. */
    abstract executar(entrada: TEntrada, usuarioAtivo: JwtPayload, origem?: OrigemDaFerramentaIa): Promise<unknown>;
}

export function usuarioPodeUsar(permissao: PermissaoFerramentaIa, tipo: TipoUsuarioEnum): boolean {
    switch (permissao) {
        case 'QUALQUER':
            return true;
        case 'AUXILIAR':
            return temVisibilidadeTotal(tipo);
        case 'GESTOR':
            return temPermissaoDeGestor(tipo);
        case 'ADMINISTRADOR':
            return temPermissaoDeAdministrador(tipo);
    }
}
