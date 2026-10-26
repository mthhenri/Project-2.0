import { PosicaoPopupChatEnum } from '../../enums/posicao-popup-chat.enum';

/** As preferências do chat do usuário; sem linha gravada vale `PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA`. */
export interface MensagemDiretaPreferenciaRecuperadaDto {
  avisosAtivos: boolean;
  /** Aviso também com o Project Desktop minimizado ou oculto. */
  avisoDesktopAtivo: boolean;
  somAtivo: boolean;
  /** Até quando os avisos ficam silenciados; `null` quando não há silêncio. */
  silenciadoAteDate: Date | null;
  /** Atalho global do Project Desktop, no formato do Electron. */
  atalhoGlobal: string;  /** Onde o popup do chat abre na tela (task 221). */
  posicaoPopup: PosicaoPopupChatEnum;
}
