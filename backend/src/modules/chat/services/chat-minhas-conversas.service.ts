import { Inject, Injectable } from '@nestjs/common';
import {
    MinhaConversaConsultadaDto,
    MinhaConversaConsultarDto,
    MinhasConversasBuscadasDto,
    MinhasConversasBuscarDto,
} from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { nomePadraoDaConversa } from '../domain/chat-conversa';
import {
    cortarTexto,
    dentroDoOrcamento,
    diaDentroDoIntervalo,
    ehFalaDaConversa,
    LIMITE_CARACTERES_DA_MENSAGEM,
    LIMITE_MENSAGENS_DA_BUSCA,
    LIMITE_MENSAGENS_DA_CONVERSA,
    ORCAMENTO_DE_CARACTERES_DA_LISTA,
    somenteMensagensDoChat,
    ultimasMensagens,
} from '../domain/conversa-do-desenvolvedor';
import { ARMAZENAMENTO_DE_CHAT, ArmazenamentoDeChat } from '../repositories/armazenamento-de-chat';

/** Folga, em dias, ao pedir o período ao armazenamento: o dia da conversa vem do `conversaId` e o corte exato é feito aqui, sem depender do fuso. */
const FOLGA_DO_PERIODO_EM_DIAS = 2;
const MILISSEGUNDOS_POR_DIA = 24 * 3_600_000;

/**
 * Leitura, pela IA, das conversas antigas **de quem está perguntando** (as ferramentas `buscar_nas_minhas_conversas` e `consultar_minha_conversa`).
 * O dono é sempre o usuário do token: não existe `usuarioId` na entrada, então não há como pedir a conversa de outra pessoa. Só a conversa do chat
 * conta (o check-in, o plano e o uso da IA ficam de fora) e o aviso de falha do sistema não é fala de ninguém.
 */
@Injectable()
export class ChatMinhasConversasService {
    constructor(@Inject(ARMAZENAMENTO_DE_CHAT) private readonly chatMensagemRepositorio: ArmazenamentoDeChat) {}

    async buscarMensagens(dto: MinhasConversasBuscarDto, usuarioAtivo: JwtPayload): Promise<MinhasConversasBuscadasDto> {
        const achadas = await this.chatMensagemRepositorio.buscar({
            usuarioId: usuarioAtivo.sub,
            texto: dto.texto,
            inicio: dto.inicio ? new Date(new Date(`${dto.inicio}T00:00:00Z`).getTime() - FOLGA_DO_PERIODO_EM_DIAS * MILISSEGUNDOS_POR_DIA) : undefined,
            fim: dto.fim ? new Date(new Date(`${dto.fim}T23:59:59Z`).getTime() + FOLGA_DO_PERIODO_EM_DIAS * MILISSEGUNDOS_POR_DIA) : undefined,
        });
        const doChat = somenteMensagensDoChat(achadas)
            .filter(ehFalaDaConversa)
            .filter((mensagem) => diaDentroDoIntervalo(mensagem.conversaId.slice(-10), dto.inicio, dto.fim));
        return {
            mensagens: dentroDoOrcamento(
                doChat.slice(0, LIMITE_MENSAGENS_DA_BUSCA).map((mensagem) => ({ mensagem, ...cortarTexto(mensagem.texto, LIMITE_CARACTERES_DA_MENSAGEM) })),
                ORCAMENTO_DE_CARACTERES_DA_LISTA,
                false,
            ).itens.map(({ mensagem, texto, truncada }) => ({ data: mensagem.conversaId.slice(-10), autor: mensagem.autor, texto, truncada })),
        };
    }

    async consultarConversa(dto: MinhaConversaConsultarDto, usuarioAtivo: JwtPayload): Promise<MinhaConversaConsultadaDto> {
        const conversaId = `${usuarioAtivo.sub}-${dto.data}`;
        const mensagens = somenteMensagensDoChat(await this.chatMensagemRepositorio.listarConversa({ conversaId, usuarioId: usuarioAtivo.sub })).filter(ehFalaDaConversa);
        const recentes = ultimasMensagens(mensagens, LIMITE_MENSAGENS_DA_CONVERSA);
        const cortadas = recentes.mensagens.map((mensagem) => ({ mensagem, ...cortarTexto(mensagem.texto, LIMITE_CARACTERES_DA_MENSAGEM) }));
        const noOrcamento = dentroDoOrcamento(cortadas, ORCAMENTO_DE_CARACTERES_DA_LISTA, true);
        const titulos = await this.chatMensagemRepositorio.listarTitulos({ usuarioId: usuarioAtivo.sub, conversaIds: [conversaId] });
        return {
            data: dto.data,
            titulo: titulos[conversaId]?.titulo || nomePadraoDaConversa(conversaId),
            mensagens: noOrcamento.itens.map(({ mensagem, texto, truncada }) => ({ autor: mensagem.autor, texto, truncada, data: mensagem.createdDate.toISOString() })),
            haMais: recentes.haMais || noOrcamento.cortou,
        };
    }
}
