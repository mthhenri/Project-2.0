import { MensagemDiretaEnviadaDto, MensagemDiretaResumoDto } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import {
  ConsultaBuscaDireta,
  ConsultaConversaDireta,
  ConsultaConversasDoUsuario,
  ConsultaNaoLidas,
  ConsultaSupervisao,
  PaginaDeConversasSupervisionadas,
  PaginaDeMensagensDiretas,
  ResumoDeConversaDireta,
} from '../domain/mensagem-direta-consultas';
import { MensagemDiretaNova } from '../domain/mensagem-direta.documento';
import { criarClienteElasticsearchMensagemDireta, MensagemDiretaElasticsearchRepository } from './mensagem-direta-elasticsearch.repository';
import { criarClienteOpenSearchMensagemDireta, MensagemDiretaOpenSearchRepository } from './mensagem-direta-opensearch.repository';

/**
 * O contrato do armazenamento das mensagens entre colaboradores (task 206). A service (task 208) só conhece isto; a implementação vem de
 * `CHAT_ARMAZENAMENTO`, a mesma variável do chat da IA: OpenSearch no desenvolvimento, Elasticsearch na produção final e, na produção de
 * teste, as tabelas provisórias do Postgres (task 207). Não há exclusão nem alteração de mensagem: elas são gravadas uma vez.
 *
 * Quem pode ler o quê é decidido na service: o armazenamento recebe filtros explícitos e não conhece permissão.
 */
export interface ArmazenamentoDeMensagemDireta {
  /**
   * Grava de forma idempotente pelo `mensagemId`. Repetir o mesmo `mensagemId` do mesmo autor na mesma conversa devolve a mensagem que já
   * estava gravada (`jaExistia`); um `mensagemId` já usado por outro autor ou em outra conversa é recusado.
   */
  gravar(mensagem: MensagemDiretaNova): Promise<MensagemDiretaEnviadaDto>;
  /** Uma página da conversa, da mais nova para a mais antiga. */
  listarConversa(consulta: ConsultaConversaDireta): Promise<PaginaDeMensagensDiretas>;
  /** As conversas em que a pessoa participa, da que teve mensagem mais recente. */
  listarConversasDoUsuario(consulta: ConsultaConversasDoUsuario): Promise<ResumoDeConversaDireta[]>;
  /** Quantas mensagens do outro vieram depois do marcador de cada conversa; toda conversa pedida aparece, com zero quando não há. */
  contarNaoLidas(consulta: ConsultaNaoLidas): Promise<Record<string, number>>;
  /** Busca textual (sem acento, todas as palavras) nas conversas da pessoa, mais relevantes primeiro. */
  buscar(consulta: ConsultaBuscaDireta): Promise<MensagemDiretaResumoDto[]>;
  /** Só para a supervisão: as conversas em que nenhum participante está em `usuarioIdsExcluidos`, paginadas. */
  listarTodasConversas(consulta: ConsultaSupervisao): Promise<PaginaDeConversasSupervisionadas>;
}

export const ARMAZENAMENTO_DE_MENSAGEM_DIRETA = 'ARMAZENAMENTO_DE_MENSAGEM_DIRETA';

/** Cria só o armazenamento escolhido: o outro nem é instanciado (não tenta conectar, não loga aviso). */
export const armazenamentoDeMensagemDiretaProvider = {
  provide: ARMAZENAMENTO_DE_MENSAGEM_DIRETA,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): ArmazenamentoDeMensagemDireta => {
    const configuracao = configService.obter();
    switch (configuracao.chat.armazenamento) {
      case 'postgres':
        // O armazenamento provisório em Postgres das mensagens diretas é a task 207; até lá o módulo não é registrado no AppModule.
        throw new Error('As mensagens entre colaboradores ainda não têm armazenamento em Postgres (task 207): use CHAT_ARMAZENAMENTO=opensearch ou elasticsearch.');
      case 'elasticsearch':
        return new MensagemDiretaElasticsearchRepository(criarClienteElasticsearchMensagemDireta(configuracao.elasticsearch));
      default:
        return new MensagemDiretaOpenSearchRepository(criarClienteOpenSearchMensagemDireta(configuracao.openSearch));
    }
  },
};
