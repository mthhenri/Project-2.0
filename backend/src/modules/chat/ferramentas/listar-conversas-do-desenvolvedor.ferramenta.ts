import { Injectable } from '@nestjs/common';
import { ConversasDoDesenvolvedorListadasDto, ConversasDoDesenvolvedorListarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { ChatDesenvolvedorService } from '../services/chat-desenvolvedor.service';

/** Lista as conversas (dias) do chat de um desenvolvedor, sem as mensagens. Só o gestor a tem. */
@Injectable()
export class ListarConversasDoDesenvolvedorFerramenta extends FerramentaIa<ConversasDoDesenvolvedorListarDto> {
  readonly nome = 'listar_conversas_do_desenvolvedor';
  readonly descricao =
    'Lista as conversas que um desenvolvedor teve com a IA no chat (uma por dia, da mais recente à mais antiga), com data, nome, primeira mensagem e quantidade de mensagens. ' +
    'Informe `usuarioId` (ache com listar_usuarios) e, se quiser, `inicio` e `fim` em yyyy-mm-dd. Só vale para desenvolvedores. ' +
    'Use para "sobre o que o Fulano tem conversado com a IA?"; depois leia um dia com consultar_conversa_do_desenvolvedor.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = ConversasDoDesenvolvedorListarDto;

  constructor(private readonly chatDesenvolvedorService: ChatDesenvolvedorService) {
    super();
  }

  executar(entrada: ConversasDoDesenvolvedorListarDto, usuarioAtivo: JwtPayload): Promise<ConversasDoDesenvolvedorListadasDto> {
    return this.chatDesenvolvedorService.listarConversas(entrada, usuarioAtivo);
  }
}
