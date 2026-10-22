import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

/** Uma pessoa com quem o usuário pode conversar (o seletor "Para" e a busca de pessoas). */
export interface MensagemDiretaPessoaResumoDto {
  usuarioId: number;
  usuarioNome: string;
  tipo: TipoUsuarioEnum;
  /** Tem o stream de eventos aberto agora (em qualquer instância da API). */
  online: boolean;
}
