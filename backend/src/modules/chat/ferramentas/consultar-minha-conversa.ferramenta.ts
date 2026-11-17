import { Injectable } from '@nestjs/common';
import { MinhaConversaConsultadaDto, MinhaConversaConsultarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { ChatMinhasConversasService } from '../services/chat-minhas-conversas.service';

/** Lê a conversa de um dia de quem pergunta. Só no chat privado com a IA: nunca no `@IA` entre colaboradores nem no plano. */
@Injectable()
export class ConsultarMinhaConversaFerramenta extends FerramentaIa<MinhaConversaConsultarDto> {
    readonly nome = 'consultar_minha_conversa';
    readonly descricao =
        'Lê as mensagens da conversa do próprio usuário com a IA num dia (`data` em yyyy-mm-dd; as mais recentes, com texto cortado quando longo). ' +
        'Use depois de buscar_nas_minhas_conversas, para entender o que foi perguntado, decidido ou combinado naquele dia.';
    readonly tipo = 'LEITURA' as const;
    readonly permissao = 'QUALQUER' as const;
    readonly somenteChatPrivado = true;
    readonly classeDeEntrada = MinhaConversaConsultarDto;

    constructor(private readonly chatMinhasConversasService: ChatMinhasConversasService) {
        super();
    }

    executar(entrada: MinhaConversaConsultarDto, usuarioAtivo: JwtPayload): Promise<MinhaConversaConsultadaDto> {
        return this.chatMinhasConversasService.consultarConversa(entrada, usuarioAtivo);
    }
}
