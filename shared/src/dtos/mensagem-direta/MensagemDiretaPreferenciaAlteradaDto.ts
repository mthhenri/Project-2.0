import { PosicaoPopupChatEnum } from '../../enums/posicao-popup-chat.enum';

/** As preferências do chat do usuário, como ficaram depois da alteração. */
export interface MensagemDiretaPreferenciaAlteradaDto {
  avisosAtivos: boolean;
  avisoDesktopAtivo: boolean;
  somAtivo: boolean;
  silenciadoAteDate: Date | null;
  atalhoGlobal: string;  /** Onde o popup do chat abre na tela (task 221). */
  posicaoPopup: PosicaoPopupChatEnum;
}
