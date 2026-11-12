import { MensagemDiretaResumoDto } from './MensagemDiretaResumoDto';
import { ReacaoMensagemDiretaDto } from './ReacaoMensagemDiretaDto';

/**
 * Evento do stream do chat entre colaboradores (`GET /mensagem-direta/eventos`, `text/event-stream`, um JSON por evento).
 * O stream não é o histórico: ele só avisa. O que o cliente perde numa queda, ele recupera relendo a conversa (`SINCRONIZAR` pede isso).
 *
 * Grupos (task 246): os mesmos eventos valem para o grupo, identificado pelo `conversaId` `G<id do grupo>`, e chegam a todos os membros atuais.
 * `SINCRONIZAR` com `conversaId` de grupo pede para reler a lista de conversas e esse grupo (entrada, saída, nome, cor e emoji mudaram); quem saiu
 * também o recebe, para a lista perder o grupo.
 */
export type MensagemDiretaEventoDto =
  /** Primeiro evento de toda conexão: quem está online agora. */
  | { tipo: 'ABERTURA'; onlineUsuarioIds: number[] }
  /** Uma mensagem nova em conversa do usuário (inclusive as que ele mesmo enviou em outra aba). */
  | { tipo: 'MENSAGEM'; mensagem: MensagemDiretaResumoDto }
  /** Uma mensagem da conversa foi editada pelo autor (task 313): quem a tem na tela troca o texto e mostra "editada". Não avisa nem toca som. */
  | { tipo: 'EDICAO'; mensagem: MensagemDiretaResumoDto }
  /**
   * Alguém reagiu (ou trocou ou tirou a reação) a uma mensagem (task 314). `reacoes` é a lista completa da mensagem depois da mudança. `reacao` é a nova reação
   * de `reatorUsuarioId` (`null` ao remover): só quando há `reacao` e o reator não é o autor a tela avisa o `autorUsuarioId`. Não conta como mensagem nova.
   */
  | { tipo: 'REACAO'; conversaId: string; mensagemId: string; reacoes: ReacaoMensagemDiretaDto[]; reatorUsuarioId: number; autorUsuarioId: number; reacao: string | null }
  /** Alguém marcou a conversa como lida até `lidaAteDate` (a data da última mensagem que viu): é daí que sai o "Lida". */
  | { tipo: 'LEITURA'; conversaId: string; usuarioId: number; lidaAteDate: Date }
  | { tipo: 'PRESENCA'; usuarioId: number; online: boolean }
  /** `usuarioId` está digitando para quem recebe, na conversa `conversaId`. Efêmero: não é gravado nem recuperado; o cliente o deixa expirar em poucos segundos. */
  | { tipo: 'DIGITANDO'; conversaId: string; usuarioId: number }
  /** A IA começou a responder a um `@IA` da conversa (task 315). Efêmero: o fim é a `MENSAGEM` da resposta (ou a do sistema, na falha); o cliente o deixa expirar em 2 minutos. */
  | { tipo: 'IA_DIGITANDO'; conversaId: string }
  /** Reler a conversa (ou todas, com `conversaId: null`): o evento não coube no barramento ou a API perdeu o fio. */
  | { tipo: 'SINCRONIZAR'; conversaId: string | null }
  | { tipo: 'BATIMENTO' }
  /** A API vai fechar o stream (deploy ou parada): reconecte. */
  | { tipo: 'ENCERRANDO' };
