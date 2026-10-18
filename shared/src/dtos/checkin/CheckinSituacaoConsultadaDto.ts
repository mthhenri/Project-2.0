import { CheckinSuspensaoConsultadaDto } from './CheckinSuspensaoConsultadaDto';

/** A execução em andamento como o check-in a mostra. */
export class CheckinExecucaoDto {
  id: number;
  atividade: string;
  demanda: string;
  projeto: string;
  /** A descrição provisória (a formal vem do check-in). */
  descricao: string;
  /** Início da execução (ISO 8601): o tempo desde o último check-in é sempre contado daqui. */
  inicio: Date;
  minutos: number;
}

/**
 * O que a janela de check-in e o Electron precisam saber agora. Sem execução em andamento não há check-in (`haCheckin` falso, `execucao`
 * nula); a duração, o rigor e os intervalos vêm da configuração ativa da IA.
 */
export class CheckinSituacaoConsultadaDto {
  haCheckin: boolean;
  execucao: CheckinExecucaoDto | null;
  suspensao: CheckinSuspensaoConsultadaDto;
  checkinMinimoMinutos: number;
  checkinMaximoMinutos: number;
  duracaoRecomendadaMinutos: number;
  /** A flag de rigor proporcional da configuração. */
  rigorProporcional: boolean;
  /** Há execução e ela passou da duração recomendada (a janela mostra o selo de rigor). */
  acimaDoRecomendado: boolean;
  /** Quando o backend sorteou o próximo check-in (task 161); `null` sem execução em andamento ou com os check-ins suspensos. */
  proximoCheckinData: Date | null;
  /** O horário do check-in já chegou: o Project (navegador ou desktop) mostra a janelinha até a descrição ser confirmada ou a suspensão valer. */
  disparado: boolean;
}
