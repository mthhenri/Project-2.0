import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
    AutorMensagemDiretaEnum,
    GrupoSupervisaoLerDto,
    GrupoSupervisaoLidoDto,
    GrupoSupervisaoListadosDto,
    GrupoSupervisaoListarDto,
    GrupoSupervisaoResumoDto,
    LIMITE_PADRAO_DA_CONVERSA_DIRETA,
    LIMITE_PADRAO_DA_SUPERVISAO_DIRETA,
    MensagemDiretaSupervisaoParticipanteDto,
    StandardResponse,
    TipoUsuarioEnum,
    UsuarioTipoListadoDto,
    grupoEhCanal,
    montarConversaGrupoId,
    temPermissaoDeGestor,
} from '@project20/shared';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { textoDoAvisoDeSupervisaoDoGrupo } from '../domain/grupo-regras';
import { conversaEhSupervisionavel, lerPeriodoDaBusca } from '../domain/mensagem-direta-regras';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, ArmazenamentoDeMensagemDireta } from '../repositories/armazenamento-de-mensagem-direta';
import { GrupoRegistrado, GrupoRepository } from '../repositories/grupo.repository';
import { MensagemDiretaSupervisaoRepository } from '../repositories/mensagem-direta-supervisao.repository';
import { CanalAcessoService } from './canal-acesso.service';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';

const NOME_DE_USUARIO_REMOVIDO = 'Usuário removido';

/**
 * Supervisão dos grupos do chat entre colaboradores (task 246): gestor e administrador leem, somente leitura, os grupos livres **sem gestor nem
 * administrador entre os membros atuais**. A elegibilidade é decidida na hora (lista e leitura usam a mesma regra pura da conversa um a um,
 * `conversaEhSupervisionavel`, agora com N membros): entrar um gestor torna o grupo privado, e sair o torna legível de novo. Cada abertura grava a
 * auditoria; o aviso aos membros sai no máximo uma vez por leitor, grupo e dia. Ler não marca nada como lido.
 *
 * Os **canais** de demanda e de projeto (task 248) são **sempre** legíveis: não dependem de quem é membro (nem de um gestor ter escrito neles), só de a
 * demanda ou o projeto ainda existir. O canal em que o próprio leitor é membro segue o caminho normal do chat. A mesma leitura serve ao gestor que abre o
 * canal pelo botão da demanda sem ainda ser membro (`GrupoService.listarMensagens`).
 */
@Injectable()
export class GrupoSupervisaoService {
    private readonly logger = new Logger(GrupoSupervisaoService.name);

    constructor(
        @Inject(ARMAZENAMENTO_DE_MENSAGEM_DIRETA) private readonly armazenamento: ArmazenamentoDeMensagemDireta,
        private readonly grupoRepositorio: GrupoRepository,
        private readonly supervisaoRepositorio: MensagemDiretaSupervisaoRepository,
        private readonly usuarioRepositorio: UsuarioRepository,
        private readonly eventosService: MensagemDiretaEventosService,
        private readonly canais: CanalAcessoService,
    ) {}

    async listarGruposSupervisionados(dto: GrupoSupervisaoListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoSupervisaoListadosDto>> {
        this.validarGestor(usuarioAtivo);
        const periodo = lerPeriodoDaBusca(dto.inicio, dto.fim);
        const pagina = dto.pagina ?? 1;
        const porPagina = dto.porPagina ?? LIMITE_PADRAO_DA_SUPERVISAO_DIRETA;

        const usuarioIdsComPoderDeGestor = await this.usuarioRepositorio.listarIdsComPermissaoDeGestor();
        const gruposLivresIds = await this.grupoRepositorio.listarIdsSupervisionaveis({ usuarioIdsComPoderDeGestor });
        const canais = await this.grupoRepositorio.listarCanaisSupervisionaveis({ leitorUsuarioId: usuarioAtivo.sub });
        const alvos = await this.canais.resolverAlvos(canais);
        const grupoIds = [...gruposLivresIds, ...canais.filter((canal) => alvos.has(canal.grupoId)).map((canal) => canal.grupoId)];
        const encontrados = await this.armazenamento.listarGruposSupervisionados({
            grupoIds,
            texto: dto.texto?.trim() || undefined,
            inicio: periodo.inicio,
            fim: periodo.fim,
            somenteCodigo: dto.somenteCodigo,
            pagina,
            porPagina,
        });

        const idsDaPagina = encontrados.conversas.map((conversa) => Number(conversa.conversaId.slice(1)));
        const grupos = await this.grupoRepositorio.listarGruposPorIds({ grupoIds: idsDaPagina });
        const membros = await this.canais.listarMembrosDeGrupos(grupos);
        const usuarios = await this.montarParticipantes([...new Set(membros.map((membro) => membro.usuarioId))]);
        const grupoPorId = new Map(grupos.map((grupo) => [grupo.grupoId, grupo]));

        const lista: GrupoSupervisaoResumoDto[] = [];
        for (const conversa of encontrados.conversas) {
            const grupo = grupoPorId.get(Number(conversa.conversaId.slice(1)));
            if (!grupo) continue;
            lista.push({
                grupoId: grupo.grupoId,
                conversaId: conversa.conversaId,
                tipo: grupo.tipo,
                nome: alvos.get(grupo.grupoId)?.nome ?? grupo.nome,
                corAvatar: grupo.corAvatar,
                emojiAvatar: grupo.emojiAvatar,
                membros: membros
                    .filter((membro) => membro.grupoId === grupo.grupoId)
                    .map((membro) => usuarios.get(membro.usuarioId) ?? this.participanteRemovido(membro.usuarioId)),
                totalMensagens: conversa.totalMensagens,
                ultimaMensagem: conversa.ultimaMensagem,
            });
        }
        return { sucesso: true, dados: { grupos: lista, total: encontrados.total, pagina, porPagina }, mensagem: 'Grupos listados com sucesso' };
    }

    async lerGrupoSupervisionado(dto: GrupoSupervisaoLerDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoSupervisaoLidoDto>> {
        this.validarGestor(usuarioAtivo);
        const grupo = await this.grupoRepositorio.recuperarGrupo({ grupoId: dto.grupoId });
        if (!grupo) throw new ResourceNotFoundException('Grupo');
        const ehCanal = grupoEhCanal(grupo.tipo);
        const alvo = ehCanal ? (await this.canais.resolverAlvos([grupo])).get(grupo.grupoId) : undefined;
        if (ehCanal && !alvo) throw new ResourceNotFoundException('Canal');
        const membros = await this.canais.listarMembros(grupo);
        const membrosIds = membros.map((membro) => membro.usuarioId);

        // O grupo em que o próprio gestor está não é supervisão: segue o caminho normal, sem auditoria nem aviso.
        if (membrosIds.includes(usuarioAtivo.sub)) throw new UnauthorizedAccessException('Este é um grupo seu: abra-o pelo chat');

        const encontrados = await this.usuarioRepositorio.listarTiposPorIds({ usuarioIds: membrosIds });
        if (encontrados.length !== membrosIds.length) throw new ResourceNotFoundException('Grupo');
        // Canal é sempre legível; o grupo livre só enquanto não tem gestor nem administrador entre os membros.
        if (!ehCanal && !conversaEhSupervisionavel(encontrados.map((usuario) => usuario.tipo))) {
            throw new UnauthorizedAccessException('Este grupo envolve um gestor ou administrador e é privado');
        }

        // Abrir o grupo é a primeira página; as mais antigas (com cursor) continuam a mesma abertura e não geram nova auditoria nem novo aviso.
        const conversaId = montarConversaGrupoId(grupo.grupoId);
        let avisou = false;
        if (!dto.cursor) {
            const auditoria = await this.supervisaoRepositorio.registrarLeituraDeGrupo({ leitorUsuarioId: usuarioAtivo.sub, grupoId: grupo.grupoId });
            avisou = await this.avisarMembros(usuarioAtivo, conversaId, grupo, membrosIds, auditoria.id);
        }

        const pagina = await this.armazenamento.listarConversa({ conversaId, cursor: dto.cursor, limite: dto.limite ?? LIMITE_PADRAO_DA_CONVERSA_DIRETA });
        return {
            sucesso: true,
            dados: {
                grupoId: grupo.grupoId,
                conversaId,
                tipo: grupo.tipo,
                nome: alvo?.nome ?? grupo.nome,
                membros: encontrados.map((usuario) => this.paraParticipante(usuario)).sort((primeiro, segundo) => primeiro.usuarioId - segundo.usuarioId),
                mensagens: pagina.mensagens,
                proximoCursor: pagina.proximoCursor,
                membrosAvisados: avisou,
            },
            mensagem: 'Grupo recuperado com sucesso',
        };
    }

    /**
   * Grava a mensagem do sistema que avisa a leitura, se este leitor ainda não avisou este grupo hoje, e a entrega aos membros. Qualquer falha aqui **não**
   * falha a leitura: a auditoria já foi gravada e só vira "avisada" depois que a mensagem existe, então a próxima abertura do dia tenta de novo.
   */
    private async avisarMembros(usuarioAtivo: JwtPayload, conversaId: string, grupo: GrupoRegistrado, membrosIds: number[], supervisaoId: number): Promise<boolean> {
        const grupoId = grupo.grupoId;
        try {
            if (await this.supervisaoRepositorio.existeAvisoDoDia({ leitorUsuarioId: usuarioAtivo.sub, conversaId, agora: new Date() })) return false;
            const leitor = (await this.usuarioRepositorio.listarTiposPorIds({ usuarioIds: [usuarioAtivo.sub] }))[0];
            const gravada = await this.armazenamento.gravar({
                mensagemId: randomUUID(),
                conversaId,
                autor: AutorMensagemDiretaEnum.SISTEMA,
                autorUsuarioId: null,
                texto: textoDoAvisoDeSupervisaoDoGrupo(leitor?.nomeCompleto ?? 'Um gestor', leitor?.tipo ?? usuarioAtivo.tipo, grupoEhCanal(grupo.tipo)),
                contemCodigo: false,
                mencoes: [],
                referencias: [],
            });
            await this.supervisaoRepositorio.marcarAvisoDado({ supervisaoId });
            await this.eventosService.publicarParaUsuarios({ usuarioIds: membrosIds, evento: { tipo: 'MENSAGEM', mensagem: gravada.mensagem } }).catch((erro: unknown) => {
                this.logger.warn(`Não foi possível publicar o aviso do grupo ${grupoId}: ${erro instanceof Error ? erro.message : String(erro)}`);
            });
            return true;
        } catch (erro) {
            this.logger.warn(`Não foi possível avisar os membros do grupo ${grupoId}: ${erro instanceof Error ? erro.message : String(erro)}`);
            return false;
        }
    }

    private validarGestor(usuarioAtivo: JwtPayload): void {
        if (!temPermissaoDeGestor(usuarioAtivo.tipo)) throw new UnauthorizedAccessException('Apenas gestores podem supervisionar grupos');
    }

    private async montarParticipantes(usuarioIds: number[]): Promise<Map<number, MensagemDiretaSupervisaoParticipanteDto>> {
        const encontrados = await this.usuarioRepositorio.listarTiposPorIds({ usuarioIds });
        return new Map(encontrados.map((usuario) => [usuario.id, this.paraParticipante(usuario)]));
    }

    private paraParticipante(usuario: UsuarioTipoListadoDto): MensagemDiretaSupervisaoParticipanteDto {
        return { usuarioId: usuario.id, usuarioNome: usuario.nomeCompleto, tipo: usuario.tipo, corAvatar: usuario.corAvatar };
    }

    private participanteRemovido(usuarioId: number): MensagemDiretaSupervisaoParticipanteDto {
        return { usuarioId, usuarioNome: NOME_DE_USUARIO_REMOVIDO, tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar: null };
    }
}
