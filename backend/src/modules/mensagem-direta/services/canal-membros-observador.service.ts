import { Injectable, OnModuleInit } from '@nestjs/common';
import { DemandaMembrosAlteradosDto } from '@project20/shared';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { ObservadorDeMembrosDaDemanda, ObservadoresDeMembrosDaDemandaRegistro } from '../../demanda/domain/observador-de-membros-da-demanda';
import { GrupoRepository } from '../repositories/grupo.repository';
import { CanalAcessoService } from './canal-acesso.service';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';

/**
 * Mantém a lista de conversas em dia quando as pessoas de uma demanda mudam (I-054). O acesso aos canais da demanda e do projeto é derivado de
 * `demanda_usuario` e já vale na hora no servidor (o pedido seguinte de quem saiu volta 403), mas a lista no cliente só relia quando o popup
 * reabria. Aqui quem entrou ou saiu recebe `SINCRONIZAR` sem conversa: a lista é relida e o canal aparece ou some, e o canal aberto que a pessoa
 * perdeu fecha. Não grava nada nem muda o acesso: só avisa.
 *
 * O aviso vai também a **quem já está nos canais da demanda e do projeto** (P-089): a lista de membros do canal aberto nessas telas só muda se for relida, e
 * sem isso quem já estava no grupo continuava vendo a lista antiga depois de alguém entrar na demanda.
 */
@Injectable()
export class CanalMembrosObservadorService implements ObservadorDeMembrosDaDemanda, OnModuleInit {
    constructor(
        private readonly registro: ObservadoresDeMembrosDaDemandaRegistro,
        private readonly eventosService: MensagemDiretaEventosService,
        private readonly demandaRepositorio: DemandaRepository,
        private readonly grupoRepositorio: GrupoRepository,
        private readonly canais: CanalAcessoService,
    ) {}

    onModuleInit(): void {
        this.registro.registrar(this);
    }

    async aoAlterarMembros(dto: DemandaMembrosAlteradosDto): Promise<void> {
        const quemJaEstava = await this.listarMembrosDosCanais(dto.demandaId);
        await this.eventosService.publicarParaUsuarios({ usuarioIds: [...new Set([...dto.usuarioIds, ...quemJaEstava])], evento: { tipo: 'SINCRONIZAR', conversaId: null } });
    }

    /** Quem está agora no canal da demanda e no do projeto dela (os que já foram criados); sem canal criado, ninguém além de quem mudou precisa saber. */
    private async listarMembrosDosCanais(demandaId: number): Promise<number[]> {
        const demanda = await this.demandaRepositorio.recuperar({ id: demandaId });
        if (!demanda) return [];
        const canaisCriados = await this.grupoRepositorio.listarCanais({ demandaIds: [demandaId], projetoIds: [demanda.projetoId] });
        const membros = await this.canais.listarMembrosDeGrupos(canaisCriados);
        return membros.map((membro) => membro.usuarioId);
    }
}
