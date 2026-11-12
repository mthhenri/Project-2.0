import { Knex } from 'knex';
import { MensagemDiretaEnviadaDto, MensagemDiretaResumoDto } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import {
    ConsultaBuscaDireta,
    ConsultaConversaDireta,
    ConsultaConversasDeGrupos,
    ConsultaConversasDoUsuario,
    ConsultaMensagemDireta,
    ConsultaNaoLidas,
    ConsultaSupervisao,
    ConsultaSupervisaoDeGrupos,
    PaginaDeConversasSupervisionadas,
    PaginaDeMensagensDiretas,
    ResumoDeConversaDireta,
} from '../domain/mensagem-direta-consultas';
import { MensagemDiretaAlterar, MensagemDiretaNova } from '../domain/mensagem-direta.documento';
import { criarClienteElasticsearchMensagemDireta, MensagemDiretaElasticsearchRepository } from './mensagem-direta-elasticsearch.repository';
import { criarClienteOpenSearchMensagemDireta, MensagemDiretaOpenSearchRepository } from './mensagem-direta-opensearch.repository';
import { MensagemDiretaPostgresRepository } from './mensagem-direta-postgres.repository';

/**
 * O contrato do armazenamento das mensagens entre colaboradores (task 206). A service (task 208) só conhece isto; a implementação vem de
 * `CHAT_ARMAZENAMENTO`, a mesma variável do chat da IA: OpenSearch no desenvolvimento, Elasticsearch na produção final e, na produção de
 * teste, a tabela provisória do Postgres (task 207). Não há exclusão de mensagem; a alteração é só a edição do texto pelo autor (task 313).
 *
 * Quem pode ler o quê é decidido na service: o armazenamento recebe filtros explícitos e não conhece permissão.
 */
export interface ArmazenamentoDeMensagemDireta {
    /**
   * Grava de forma idempotente pelo `mensagemId`. Repetir o mesmo `mensagemId` do mesmo autor na mesma conversa devolve a mensagem que já
   * estava gravada (`jaExistia`); um `mensagemId` já usado por outro autor ou em outra conversa é recusado.
   */
    gravar(mensagem: MensagemDiretaNova): Promise<MensagemDiretaEnviadaDto>;
    /**
   * Troca o texto de uma mensagem própria (task 313) e grava `editada_date`; a data de envio, a ordem e a resposta não mudam. Devolve a mensagem
   * já alterada, ou `null` quando ela não existe, é de outra conversa ou **não é do autor** (o prazo de 1 hora é conferido pela service).
   */
    alterarMensagem(alteracao: MensagemDiretaAlterar): Promise<MensagemDiretaResumoDto | null>;
    /** A mensagem com esse id **se for desta conversa**; de outra conversa, apagada ou inexistente, `null`. */
    recuperarMensagem(consulta: ConsultaMensagemDireta): Promise<MensagemDiretaResumoDto | null>;
    /** Uma página da conversa, da mais nova para a mais antiga. */
    listarConversa(consulta: ConsultaConversaDireta): Promise<PaginaDeMensagensDiretas>;
    /** As conversas em que a pessoa participa, da que teve mensagem mais recente. */
    listarConversasDoUsuario(consulta: ConsultaConversasDoUsuario): Promise<ResumoDeConversaDireta[]>;
    /** Quantas mensagens do outro vieram depois do marcador de cada conversa; toda conversa pedida aparece, com zero quando não há. */
    contarNaoLidas(consulta: ConsultaNaoLidas): Promise<Record<string, number>>;
    /**
   * Busca textual (sem acento, todas as palavras) nas conversas da pessoa, mais relevantes primeiro. Com `grupoIds`, olha também as mensagens
   * desses grupos (a service passa só os grupos em que a pessoa é membro agora); sem eles, a mensagem de grupo nunca aparece.
   */
    buscar(consulta: ConsultaBuscaDireta): Promise<MensagemDiretaResumoDto[]>;
    /** Só para a supervisão: as conversas **um a um** em que nenhum participante está em `usuarioIdsExcluidos`, paginadas. Conversa de grupo nunca entra. */
    listarTodasConversas(consulta: ConsultaSupervisao): Promise<PaginaDeConversasSupervisionadas>;
    /**
   * As conversas dos grupos pedidos (`G<id>`), da que teve mensagem mais recente, no formato da lista um a um (`participantes` vazio). Grupo sem
   * mensagem não aparece; a service o completa com o que sabe do grupo.
   */
    listarConversasDeGrupos(consulta: ConsultaConversasDeGrupos): Promise<ResumoDeConversaDireta[]>;
    /** Como `contarNaoLidas`, para os grupos: o marcador de cada grupo já traz o ponto de partida (a leitura ou a entrada da pessoa, o que for mais novo). */
    contarNaoLidasDeGrupos(consulta: ConsultaNaoLidas): Promise<Record<string, number>>;
    /** Só para a supervisão: as conversas dos grupos elegíveis (`grupoIds`, decididos pela service), paginadas, com busca de texto, período e filtro de código. */
    listarGruposSupervisionados(consulta: ConsultaSupervisaoDeGrupos): Promise<PaginaDeConversasSupervisionadas>;
}

export const ARMAZENAMENTO_DE_MENSAGEM_DIRETA = 'ARMAZENAMENTO_DE_MENSAGEM_DIRETA';

/** Cria só o armazenamento escolhido: o outro nem é instanciado (não tenta conectar, não loga aviso). */
export const armazenamentoDeMensagemDiretaProvider = {
    provide: ARMAZENAMENTO_DE_MENSAGEM_DIRETA,
    inject: [ConfigService, DATABASE_CONNECTION],
    useFactory: (configService: ConfigService, conexaoBancoDados: Knex): ArmazenamentoDeMensagemDireta => {
        const configuracao = configService.obter();
        switch (configuracao.chat.armazenamento) {
            case 'postgres':
                return new MensagemDiretaPostgresRepository(conexaoBancoDados);
            case 'elasticsearch':
                return new MensagemDiretaElasticsearchRepository(criarClienteElasticsearchMensagemDireta(configuracao.elasticsearch));
            default:
                return new MensagemDiretaOpenSearchRepository(criarClienteOpenSearchMensagemDireta(configuracao.openSearch));
        }
    },
};
