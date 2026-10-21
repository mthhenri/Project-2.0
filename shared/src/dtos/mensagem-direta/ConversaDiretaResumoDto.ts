import { MensagemDiretaResumoDto } from './MensagemDiretaResumoDto';

/** Uma conversa do usuário com outra pessoa, para a lista do popup. */
export interface ConversaDiretaResumoDto {
  /** `<menorUsuarioId>-<maiorUsuarioId>`. */
  conversaId: string;
  /** A outra pessoa. */
  usuarioId: number;
  usuarioNome: string;
  /** `null` quando a conversa ainda não tem mensagem. */
  ultimaMensagem: MensagemDiretaResumoDto | null;
  /** Mensagens da outra pessoa mais novas que o ponto em que o usuário leu. */
  naoLidas: number;
  silenciada: boolean;
  /** A outra pessoa tem o stream de eventos aberto agora (em qualquer instância da API). */
  online: boolean;
}
