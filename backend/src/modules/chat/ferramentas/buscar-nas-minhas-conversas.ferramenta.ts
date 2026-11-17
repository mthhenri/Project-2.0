import { Injectable } from '@nestjs/common';
import { MinhasConversasBuscadasDto, MinhasConversasBuscarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { ChatMinhasConversasService } from '../services/chat-minhas-conversas.service';

/** Busca por texto nas conversas antigas de quem pergunta. Só no chat privado com a IA: nunca no `@IA` entre colaboradores nem no plano. */
@Injectable()
export class BuscarNasMinhasConversasFerramenta extends FerramentaIa<MinhasConversasBuscarDto> {
    readonly nome = 'buscar_nas_minhas_conversas';
    readonly descricao =
        'Procura um assunto (`texto`) nas conversas antigas do próprio usuário com a IA, de qualquer dia, mais relevantes primeiro, cada achado com o dia (yyyy-mm-dd). ' +
        '`inicio` e `fim` (yyyy-mm-dd) limitam o período. Use quando o usuário se referir a algo que já conversaram ("aquilo que combinamos", "semana passada", "como resolvemos X") ' +
        'e o assunto não estiver na conversa de hoje. Para ler o contexto em volta de um achado, use consultar_minha_conversa com o dia.';
    readonly tipo = 'LEITURA' as const;
    readonly permissao = 'QUALQUER' as const;
    readonly somenteChatPrivado = true;
    readonly classeDeEntrada = MinhasConversasBuscarDto;

    constructor(private readonly chatMinhasConversasService: ChatMinhasConversasService) {
        super();
    }

    executar(entrada: MinhasConversasBuscarDto, usuarioAtivo: JwtPayload): Promise<MinhasConversasBuscadasDto> {
        return this.chatMinhasConversasService.buscarMensagens(entrada, usuarioAtivo);
    }
}
