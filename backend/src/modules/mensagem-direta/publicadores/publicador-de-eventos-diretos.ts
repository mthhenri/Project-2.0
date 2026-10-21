import { Knex } from 'knex';
import { ConfigService } from '../../../config/config.service';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { MensagemDoBarramento } from '../domain/mensagem-direta-barramento';
import { PublicadorEmMemoria } from './publicador-em-memoria';
import { PublicadorPostgres } from './publicador-postgres';

/** Quem escuta o barramento (o serviço de eventos de cada instância). */
export interface OuvinteDoBarramento {
  aoReceber(mensagem: MensagemDoBarramento): void;
  /** A escuta caiu e voltou: o que passou nesse intervalo não se recupera, então o ouvinte manda os clientes relerem. */
  aoReconectar(): void;
}

/**
 * A porta por onde o chat entre colaboradores avisa todas as instâncias da API (task 209). A service nunca fala com o stream: ela
 * publica aqui, e cada instância entrega a quem está conectado nela. Com mais de uma instância, o barramento em memória falharia em
 * silêncio (a mensagem grava, mas o destinatário só a vê ao recarregar); por isso existe a implementação do PostgreSQL.
 */
export interface PublicadorDeEventosDiretos {
  /** Entrega a mensagem a todos os ouvintes de todas as instâncias, inclusive a esta. */
  publicar(mensagem: MensagemDoBarramento): Promise<void>;
  /** Registra o ouvinte; devolve a função que cancela. */
  assinar(ouvinte: OuvinteDoBarramento): () => void;
}

export const PUBLICADOR_DE_EVENTOS_DIRETOS = 'PUBLICADOR_DE_EVENTOS_DIRETOS';

/** Cria só o barramento escolhido por `CHAT_EVENTOS`. */
export const publicadorDeEventosDiretosProvider = {
  provide: PUBLICADOR_DE_EVENTOS_DIRETOS,
  inject: [ConfigService, DATABASE_CONNECTION],
  useFactory: (configService: ConfigService, conexaoBancoDados: Knex): PublicadorDeEventosDiretos => {
    const configuracao = configService.obter();
    if (configuracao.chat.eventos === 'postgres') return new PublicadorPostgres(conexaoBancoDados, configuracao.bancoDados);
    return new PublicadorEmMemoria();
  },
};
