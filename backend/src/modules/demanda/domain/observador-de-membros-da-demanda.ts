import { Injectable, Logger } from '@nestjs/common';
import { DemandaMembrosAlteradosDto } from '@project20/shared';

/**
 * Quem precisa saber que as pessoas de uma demanda mudaram (`demanda_usuario`). O chat entre colaboradores é um deles: o acesso aos canais da
 * demanda e do projeto nasce dessa tabela, então quem entra ou sai precisa reler a lista de conversas na hora (I-054). O `DemandaModule` não
 * importa o chat (o chat importa a demanda): cada interessado se registra na subida do módulo dele.
 */
export interface ObservadorDeMembrosDaDemanda {
    aoAlterarMembros(dto: DemandaMembrosAlteradosDto): Promise<void>;
}

@Injectable()
export class ObservadoresDeMembrosDaDemandaRegistro {
    private readonly logger = new Logger(ObservadoresDeMembrosDaDemandaRegistro.name);
    private readonly observadores: ObservadorDeMembrosDaDemanda[] = [];

    registrar(observador: ObservadorDeMembrosDaDemanda): void {
        this.observadores.push(observador);
    }

    /**
     * Avisa todos. A mudança de membros já está gravada: um observador que falha não pode desfazê-la nem falhar o pedido de quem a fez, então o
     * erro só vai para o log. Sem ninguém para avisar (`usuarioIds` vazio), não faz nada.
     */
    async notificar(dto: DemandaMembrosAlteradosDto): Promise<void> {
        if (dto.usuarioIds.length === 0) return;
        for (const observador of this.observadores) {
            try {
                await observador.aoAlterarMembros(dto);
            } catch (erro) {
                this.logger.warn(`Falha ao avisar a mudança de membros da demanda ${dto.demandaId}: ${erro instanceof Error ? erro.message : String(erro)}`);
            }
        }
    }
}
