import { PosicaoBarraChatEnum } from '../../enums/posicao-barra-chat.enum';
import { PosicaoPopupChatEnum } from '../../enums/posicao-popup-chat.enum';

/** Interno (repository): grava o conjunto inteiro de preferências do chat de uma pessoa (a data do silêncio já convertida). */
export interface MensagemDiretaPreferenciaInternoAlterarDto {
    usuarioId: number;
    avisosAtivos: boolean;
    avisoDesktopAtivo: boolean;
    somAtivo: boolean;
    silenciadoAteDate: Date | null;
    atalhoGlobal: string;
    /** Onde o popup do chat abre na tela (task 221). */
    posicaoPopup: PosicaoPopupChatEnum;
    /** Onde fica a barra de conversas da conversa aberta (task 318). */
    posicaoBarra: PosicaoBarraChatEnum;
}
