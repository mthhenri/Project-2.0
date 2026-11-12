import { Inject, Injectable } from '@nestjs/common';
import {
    AutorMensagemDiretaEnum,
    GrupoMensagemBuscadasDto,
    GrupoMensagemBuscarDto,
    GrupoMensagemDesafixadaDto,
    GrupoMensagemDesafixarDto,
    GrupoMensagemFixadaDto,
    GrupoMensagemFixadaListadasDto,
    GrupoMensagemFixadaListarDto,
    GrupoMensagemFixadaResumoDto,
    GrupoMensagemFixarDto,
    LIMITE_DE_FIXADAS_DO_GRUPO,
    StandardResponse,
    montarConversaGrupoId,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { lerPeriodoDaBusca } from '../domain/mensagem-direta-regras';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, ArmazenamentoDeMensagemDireta } from '../repositories/armazenamento-de-mensagem-direta';
import { GrupoFixadaRegistrada, GrupoFixadaRepository } from '../repositories/grupo-fixada.repository';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';
import { GrupoService } from './grupo.service';

/**
 * Mensagens fixadas e busca dentro de um grupo ou canal (task 250). Qualquer **membro** fixa e desafixa (no canal, quem é membro pela regra do canal; o gestor
 * que só lê por tipo não fixa, mas vê as fixadas); há um limite por grupo; fixar de novo a mesma mensagem não faz nada. Fixar e desafixar pedem aos membros
 * que releiam o grupo (`SINCRONIZAR`, sem evento novo) e não geram mensagem do sistema. A busca é **só do grupo pedido** e só de membro: o armazenamento
 * recebe o grupo e a opção de não olhar as conversas um a um, então nada de outro grupo ou conversa vaza.
 */
@Injectable()
export class GrupoFixadaService {
    constructor(
        @Inject(ARMAZENAMENTO_DE_MENSAGEM_DIRETA) private readonly armazenamento: ArmazenamentoDeMensagemDireta,
        private readonly grupoService: GrupoService,
        private readonly fixadaRepositorio: GrupoFixadaRepository,
        private readonly eventosService: MensagemDiretaEventosService,
    ) {}

    async fixarMensagem(dto: GrupoMensagemFixarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoMensagemFixadaDto>> {
        const { grupo, membrosIds } = await this.grupoService.exigirMembroDoGrupo(dto.grupoId, usuarioAtivo);
        const mensagemId = dto.mensagemId.toLowerCase();
        const mensagem = await this.armazenamento.recuperarMensagem({ conversaId: montarConversaGrupoId(grupo.grupoId), mensagemId });
        if (!mensagem) throw new ResourceNotFoundException('Mensagem');
        if (mensagem.autor !== AutorMensagemDiretaEnum.USUARIO) throw new BusinessException('Só mensagem de pessoa pode ser fixada');

        const jaFixada = await this.fixadaRepositorio.recuperarFixada({ grupoId: grupo.grupoId, mensagemId });
        if (jaFixada) {
            return { sucesso: true, dados: { fixada: { mensagem, fixadaPorUsuarioId: jaFixada.fixadaPorUsuarioId, fixadaDate: jaFixada.fixadaDate }, jaEstavaFixada: true }, mensagem: 'A mensagem já estava fixada' };
        }
        if ((await this.fixadaRepositorio.listarFixadas({ grupoId: grupo.grupoId })).length >= LIMITE_DE_FIXADAS_DO_GRUPO) {
            throw new BusinessException(`Um chat comporta no máximo ${LIMITE_DE_FIXADAS_DO_GRUPO} mensagens fixadas: desafixe uma antes`);
        }
        const criada = await this.fixadaRepositorio.fixar({ grupoId: grupo.grupoId, mensagemId, usuarioId: usuarioAtivo.sub });
        // Duas pessoas fixando a mesma mensagem juntas: o índice único deixa passar uma; a outra recebe a que existe.
        const registrada = criada ?? (await this.fixadaRepositorio.recuperarFixada({ grupoId: grupo.grupoId, mensagemId }));
        if (!registrada) throw new ResourceNotFoundException('Mensagem fixada');
        if (criada) await this.sincronizar(grupo.grupoId, membrosIds);
        return {
            sucesso: true,
            dados: { fixada: { mensagem, fixadaPorUsuarioId: registrada.fixadaPorUsuarioId, fixadaDate: registrada.fixadaDate }, jaEstavaFixada: !criada },
            mensagem: criada ? 'Mensagem fixada com sucesso' : 'A mensagem já estava fixada',
        };
    }

    async desafixarMensagem(dto: GrupoMensagemDesafixarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoMensagemDesafixadaDto>> {
        const { grupo, membrosIds } = await this.grupoService.exigirMembroDoGrupo(dto.grupoId, usuarioAtivo);
        const mensagemId = dto.mensagemId.toLowerCase();
        const estavaFixada = await this.fixadaRepositorio.desafixar({ grupoId: grupo.grupoId, mensagemId });
        if (estavaFixada) await this.sincronizar(grupo.grupoId, membrosIds);
        return { sucesso: true, dados: { grupoId: grupo.grupoId, mensagemId, estavaFixada }, mensagem: estavaFixada ? 'Mensagem desafixada com sucesso' : 'A mensagem não estava fixada' };
    }

    /** As fixadas com o texto de cada uma. A que o armazenamento já não tem é ignorada (não quebra a lista). Membro, ou o gestor que lê o canal por tipo. */
    async listarFixadas(dto: GrupoMensagemFixadaListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoMensagemFixadaListadasDto>> {
        const { grupo } = await this.grupoService.exigirAcessoAoGrupo(dto.grupoId, usuarioAtivo);
        const registradas = await this.fixadaRepositorio.listarFixadas({ grupoId: grupo.grupoId });
        const conversaId = montarConversaGrupoId(grupo.grupoId);
        const resolvidas = await Promise.all(
            registradas.map(async (registrada: GrupoFixadaRegistrada): Promise<GrupoMensagemFixadaResumoDto | null> => {
                const mensagem = await this.armazenamento.recuperarMensagem({ conversaId, mensagemId: registrada.mensagemId });
                return mensagem ? { mensagem, fixadaPorUsuarioId: registrada.fixadaPorUsuarioId, fixadaDate: registrada.fixadaDate } : null;
            }),
        );
        return { sucesso: true, dados: { grupoId: grupo.grupoId, fixadas: resolvidas.filter((fixada): fixada is GrupoMensagemFixadaResumoDto => fixada !== null) }, mensagem: 'Mensagens fixadas listadas com sucesso' };
    }

    /** A busca dentro do grupo: só as mensagens dele (sem acento, com período e "Com código"), só para membro. */
    async buscarNoGrupo(dto: GrupoMensagemBuscarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoMensagemBuscadasDto>> {
        const { grupo } = await this.grupoService.exigirMembroDoGrupo(dto.grupoId, usuarioAtivo);
        const periodo = lerPeriodoDaBusca(dto.inicio, dto.fim);
        const mensagens = await this.armazenamento.buscar({
            usuarioId: usuarioAtivo.sub,
            grupoIds: [grupo.grupoId],
            somenteGrupos: true,
            texto: dto.texto,
            inicio: periodo.inicio,
            fim: periodo.fim,
            somenteCodigo: dto.somenteCodigo,
        });
        return { sucesso: true, dados: { grupoId: grupo.grupoId, mensagens }, mensagem: 'Busca realizada com sucesso' };
    }

    private async sincronizar(grupoId: number, membrosIds: number[]): Promise<void> {
        await this.eventosService.publicarParaUsuarios({ usuarioIds: [...new Set(membrosIds)], evento: { tipo: 'SINCRONIZAR', conversaId: montarConversaGrupoId(grupoId) } });
    }
}
