import { Injectable } from '@nestjs/common';
import { ConversaDoDesenvolvedorConsultadaDto, ConversaDoDesenvolvedorConsultarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { ChatDesenvolvedorService } from '../services/chat-desenvolvedor.service';

/** Lê a conversa de um dia de um desenvolvedor com a IA. Só o gestor a tem. */
@Injectable()
export class ConsultarConversaDoDesenvolvedorFerramenta extends FerramentaIa<ConversaDoDesenvolvedorConsultarDto> {
  readonly nome = 'consultar_conversa_do_desenvolvedor';
  readonly descricao =
    'Lê as mensagens da conversa de um desenvolvedor com a IA num dia (`usuarioId` e `data` em yyyy-mm-dd; as mais recentes, com texto cortado quando longo). ' +
    'Use depois de listar_conversas_do_desenvolvedor, para responder o que ele perguntou, pediu ou decidiu. Só repasse o conteúdo ao gestor que perguntou.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = ConversaDoDesenvolvedorConsultarDto;

  constructor(private readonly chatDesenvolvedorService: ChatDesenvolvedorService) {
    super();
  }

  executar(entrada: ConversaDoDesenvolvedorConsultarDto, usuarioAtivo: JwtPayload): Promise<ConversaDoDesenvolvedorConsultadaDto> {
    return this.chatDesenvolvedorService.consultarConversa(entrada, usuarioAtivo);
  }
}
