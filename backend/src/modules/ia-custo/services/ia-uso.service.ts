import { Inject, Injectable, Logger } from '@nestjs/common';
import { AutorChatEnum, ContextoChatEnum, IaUsoRegistrarDto } from '@project20/shared';
import { ARMAZENAMENTO_DE_CHAT, ArmazenamentoDeChat } from '../../chat/repositories/armazenamento-de-chat';

/**
 * Põe na conta da aba Custos a chamada à IA que não passou pelo chat (task 260). Não há tabela de uso (task 202): a chamada vira uma mensagem de
 * uso, no mesmo armazenamento do chat, com o modelo e os tokens que a aba soma. Ela nunca aparece numa conversa nem na busca. Registrar é de
 * melhor esforço: falhar aqui não pode derrubar quem pediu a chamada.
 */
@Injectable()
export class IaUsoService {
  private readonly logger = new Logger(IaUsoService.name);

  constructor(@Inject(ARMAZENAMENTO_DE_CHAT) private readonly armazenamentoDeChat: ArmazenamentoDeChat) {}

  async registrar(dto: IaUsoRegistrarDto): Promise<void> {
    try {
      await this.armazenamentoDeChat.gravar({
        conversaId: `uso-ia-${dto.usuarioId}`,
        usuarioId: dto.usuarioId,
        contexto: ContextoChatEnum.USO_DE_IA,
        autor: AutorChatEnum.IA,
        texto: dto.descricao,
        nivel: dto.nivel,
        modelo: dto.modelo,
        tokensEntrada: dto.tokensEntrada,
        tokensSaida: dto.tokensSaida,
        tokensCache: dto.tokensCache,
        demandaId: dto.demandaId ?? null,
      });
    } catch (erro) {
      this.logger.warn(`Não foi possível registrar o uso da IA (${dto.descricao}): ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }
}
