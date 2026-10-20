import { Injectable } from '@nestjs/common';
import { ConversasDoDesenvolvedorBuscadasDto, ConversasDoDesenvolvedorBuscarDto } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { FerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { ChatDesenvolvedorService } from '../services/chat-desenvolvedor.service';

/** Busca por texto nas conversas de um desenvolvedor, de qualquer dia. Só o gestor a tem. */
@Injectable()
export class BuscarNasConversasDoDesenvolvedorFerramenta extends FerramentaIa<ConversasDoDesenvolvedorBuscarDto> {
  readonly nome = 'buscar_nas_conversas_do_desenvolvedor';
  readonly descricao =
    'Procura um assunto (`texto`) nas conversas de um desenvolvedor com a IA, de qualquer dia, mais relevantes primeiro, cada achado com o dia (yyyy-mm-dd). ' +
    'Use para "o Fulano falou de bloqueio ou dificuldade com X?" sem ler dia por dia.';
  readonly tipo = 'LEITURA' as const;
  readonly permissao = 'GESTOR' as const;
  readonly classeDeEntrada = ConversasDoDesenvolvedorBuscarDto;

  constructor(private readonly chatDesenvolvedorService: ChatDesenvolvedorService) {
    super();
  }

  executar(entrada: ConversasDoDesenvolvedorBuscarDto, usuarioAtivo: JwtPayload): Promise<ConversasDoDesenvolvedorBuscadasDto> {
    return this.chatDesenvolvedorService.buscarMensagens(entrada, usuarioAtivo);
  }
}
