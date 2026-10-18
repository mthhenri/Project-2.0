import { Injectable } from '@nestjs/common';
import { AgendaDoCheckin, EntradaDaAgenda, calcularAgenda } from '../domain/agenda-do-checkin';

/**
 * O próximo check-in de cada usuário (task 161): um estado **passageiro**, em memória e por usuário, como a suspensão (vale para uma só
 * instância do backend; reiniciar o backend o apaga e o horário é sorteado de novo na próxima consulta). A regra está em
 * `calcularAgenda`; aqui só se guarda o resultado e se fornece o sorteio.
 */
@Injectable()
export class CheckinAgendaService {
  private readonly agendas = new Map<number, AgendaDoCheckin>();

  /** Recalcula a agenda do usuário (guardando o resultado) e a devolve; `null` quando não há próximo check-in. */
  atualizar(usuarioId: number, entrada: Omit<EntradaDaAgenda, 'anterior' | 'aleatorio'>): AgendaDoCheckin | null {
    const agenda = calcularAgenda({ ...entrada, anterior: this.agendas.get(usuarioId) ?? null, aleatorio: this.sortear() });
    if (agenda) this.agendas.set(usuarioId, agenda);
    else this.agendas.delete(usuarioId);
    return agenda;
  }

  /** Separado para os testes fixarem o sorteio. */
  protected sortear(): number {
    return Math.random();
  }
}
