import { Injectable } from '@nestjs/common';
import { CheckinSuspensaoConsultadaDto } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { dataNoFuso } from '../../chat/domain/chat-conversa';

interface Suspensao {
  desde: Date;
  motivo: string | null;
}

/**
 * A suspensão dos check-ins por reunião (task 148): um estado **passageiro**, em memória e por usuário, como o estado da IA (vale para
 * uma só instância do backend, e reiniciar o backend a apaga). Acaba quando o usuário volta ou à meia-noite do fuso do sistema.
 */
@Injectable()
export class CheckinSuspensaoService {
  private readonly suspensoes = new Map<number, Suspensao>();

  constructor(private readonly configService: ConfigService) {}

  suspender(usuarioId: number, motivo: string | null): CheckinSuspensaoConsultadaDto {
    this.suspensoes.set(usuarioId, { desde: this.agora(), motivo: motivo?.trim() || null });
    return this.consultar(usuarioId);
  }

  /** Devolve a suspensão que acabou (para o desfazer poder restaurá-la), ou `null` se não havia. */
  retomar(usuarioId: number): CheckinSuspensaoConsultadaDto | null {
    const anterior = this.consultar(usuarioId);
    this.suspensoes.delete(usuarioId);
    return anterior.suspenso ? anterior : null;
  }

  consultar(usuarioId: number): CheckinSuspensaoConsultadaDto {
    const suspensao = this.suspensoes.get(usuarioId);
    if (suspensao && this.ehDeDiaAnterior(suspensao.desde)) {
      this.suspensoes.delete(usuarioId);
      return { suspenso: false, desde: null, motivo: null };
    }
    return suspensao ? { suspenso: true, desde: suspensao.desde, motivo: suspensao.motivo } : { suspenso: false, desde: null, motivo: null };
  }

  private ehDeDiaAnterior(desde: Date): boolean {
    const fuso = this.configService.obter().aplicacao.fusoHorario;
    return dataNoFuso(desde, fuso) !== dataNoFuso(this.agora(), fuso);
  }

  /** Separado para os testes fixarem o instante. */
  protected agora(): Date {
    return new Date();
  }
}
