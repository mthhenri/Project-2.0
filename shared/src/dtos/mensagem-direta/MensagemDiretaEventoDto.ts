import { MensagemDiretaResumoDto } from './MensagemDiretaResumoDto';

/**
 * Evento do stream do chat entre colaboradores (`GET /mensagem-direta/eventos`, `text/event-stream`, um JSON por evento).
 * O stream não é o histórico: ele só avisa. O que o cliente perde numa queda, ele recupera relendo a conversa (`SINCRONIZAR` pede isso).
 */
export type MensagemDiretaEventoDto =
  /** Primeiro evento de toda conexão: quem está online agora. */
  | { tipo: 'ABERTURA'; onlineUsuarioIds: number[] }
  /** Uma mensagem nova em conversa do usuário (inclusive as que ele mesmo enviou em outra aba). */
  | { tipo: 'MENSAGEM'; mensagem: MensagemDiretaResumoDto }
  /** Alguém marcou a conversa como lida até `lidaAteDate` (a data da última mensagem que viu): é daí que sai o "Lida". */
  | { tipo: 'LEITURA'; conversaId: string; usuarioId: number; lidaAteDate: Date }
  | { tipo: 'PRESENCA'; usuarioId: number; online: boolean }
  /** `usuarioId` está digitando para quem recebe, na conversa `conversaId`. Efêmero: não é gravado nem recuperado; o cliente o deixa expirar em poucos segundos. */
  | { tipo: 'DIGITANDO'; conversaId: string; usuarioId: number }
  /** Reler a conversa (ou todas, com `conversaId: null`): o evento não coube no barramento ou a API perdeu o fio. */
  | { tipo: 'SINCRONIZAR'; conversaId: string | null }
  | { tipo: 'BATIMENTO' }
  /** A API vai fechar o stream (deploy ou parada): reconecte. */
  | { tipo: 'ENCERRANDO' };
