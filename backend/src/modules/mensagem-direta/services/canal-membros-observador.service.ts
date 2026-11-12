import { Injectable, OnModuleInit } from '@nestjs/common';
import { DemandaMembrosAlteradosDto } from '@project20/shared';
import { ObservadorDeMembrosDaDemanda, ObservadoresDeMembrosDaDemandaRegistro } from '../../demanda/domain/observador-de-membros-da-demanda';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';

/**
 * Mantém a lista de conversas em dia quando as pessoas de uma demanda mudam (I-054). O acesso aos canais da demanda e do projeto é derivado de
 * `demanda_usuario` e já vale na hora no servidor (o pedido seguinte de quem saiu volta 403), mas a lista no cliente só relia quando o popup
 * reabria. Aqui quem entrou ou saiu recebe `SINCRONIZAR` sem conversa: a lista é relida e o canal aparece ou some, e o canal aberto que a pessoa
 * perdeu fecha. Não grava nada nem muda o acesso: só avisa.
 */
@Injectable()
export class CanalMembrosObservadorService implements ObservadorDeMembrosDaDemanda, OnModuleInit {
    constructor(
        private readonly registro: ObservadoresDeMembrosDaDemandaRegistro,
        private readonly eventosService: MensagemDiretaEventosService,
    ) {}

    onModuleInit(): void {
        this.registro.registrar(this);
    }

    async aoAlterarMembros(dto: DemandaMembrosAlteradosDto): Promise<void> {
        await this.eventosService.publicarParaUsuarios({ usuarioIds: [...new Set(dto.usuarioIds)], evento: { tipo: 'SINCRONIZAR', conversaId: null } });
    }
}
