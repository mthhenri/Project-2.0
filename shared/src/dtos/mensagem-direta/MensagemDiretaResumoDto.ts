import { AutorMensagemDiretaEnum } from '../../enums/autor-mensagem-direta.enum';
import { CitacaoMensagemDto } from './CitacaoMensagemDto';
import { ReferenciaMensagemDto } from './ReferenciaMensagemDto';

/** Uma mensagem de uma conversa entre duas pessoas. Gravada uma vez e nunca reescrita. */
export interface MensagemDiretaResumoDto {
  /** UUID gerado pelo cliente que enviou (ou pelo servidor, nas mensagens do sistema). */
  mensagemId: string;
  /** `<menorUsuarioId>-<maiorUsuarioId>`. */
  conversaId: string;
  autor: AutorMensagemDiretaEnum;
  /** Quem escreveu; `null` quando o autor é o sistema. */
  autorUsuarioId: number | null;
  /** Markdown. */
  texto: string;
  /** Tem ao menos um bloco de código cercado. */
  contemCodigo: boolean;
  mencoes: number[];
  referencias: ReferenciaMensagemDto[];
  /** A mensagem a que esta responde; `null` quando não é resposta. */
  respondeA: CitacaoMensagemDto | null;
  createdDate: Date;
}
