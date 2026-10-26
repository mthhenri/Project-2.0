import { IsBoolean, IsDateString, IsEnum, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { PosicaoPopupChatEnum } from '../../enums/posicao-popup-chat.enum';
import { LIMITE_ATALHO_GLOBAL, REGEX_ATALHO_GLOBAL } from '../../utils/mensagem-direta';

/** As preferências do chat do próprio usuário. O pedido troca todas de uma vez: o cliente envia o conjunto inteiro. */
export class MensagemDiretaPreferenciaAlterarDto {
  @IsBoolean()
  avisosAtivos: boolean;

  /** Aviso também com o Project Desktop minimizado ou oculto. */
  @IsBoolean()
  avisoDesktopAtivo: boolean;

  @IsBoolean()
  somAtivo: boolean;

  /** Até quando os avisos ficam silenciados (ex.: "1 hora", para a reunião); `null` não silencia. */
  @ValidateIf((preferencia: MensagemDiretaPreferenciaAlterarDto) => preferencia.silenciadoAteDate !== null)
  @IsDateString()
  silenciadoAteDate: string | null;

  /** Atalho global do Project Desktop, no formato do Electron (`Ctrl+Shift+Space`): ao menos um modificador e uma tecla. */
  @IsString()
  @MaxLength(LIMITE_ATALHO_GLOBAL)
  @Matches(REGEX_ATALHO_GLOBAL, { message: 'atalhoGlobal deve ter ao menos um modificador e uma tecla, como Ctrl+Shift+Space' })
  atalhoGlobal: string;

  /** Onde o popup do chat abre na tela (task 221). */
  @IsEnum(PosicaoPopupChatEnum)
  posicaoPopup: PosicaoPopupChatEnum;
}
