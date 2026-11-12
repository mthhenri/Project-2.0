import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
    AutorMensagemDiretaEnum,
    GrupoAlteradoDto,
    GrupoAlterarDto,
    GrupoCriadoDto,
    GrupoCriarDto,
    GrupoLeituraAlteradaDto,
    GrupoLeituraAlterarDto,
    GrupoMembroAdicionadoDto,
    GrupoMembroAdicionarDto,
    GrupoMembroResumoDto,
    GrupoMensagemEnviarDto,
    GrupoMensagemListadasDto,
    GrupoMensagemListarDto,
    GrupoRecuperadoDto,
    GrupoResumoDto,
    GrupoSaidoDto,
    GrupoSilencioAlteradoDto,
    GrupoSilencioAlterarDto,
    LIMITE_MEMBROS_DO_GRUPO,
    LIMITE_PADRAO_DA_CONVERSA_DIRETA,
    MensagemDiretaEnviadaDto,
    StandardResponse,
    TipoGrupoEnum,
    TipoUsuarioEnum,
    contemBlocoDeCodigo,
    ehCorAvatarValida,
    grupoEhPrivado,
    montarConversaGrupoId,
    normalizarCorAvatar,
    temPermissaoDeGestor,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { AtividadeRepository } from '../../atividade/repositories/atividade.repository';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { LIMITE_GRUPOS_DO_USUARIO } from '../domain/mensagem-direta-consultas';
import {
    normalizarEmojiDoGrupo,
    normalizarMencoesDoGrupo,
    normalizarNomeDoGrupo,
    normalizarNovosMembros,
    pontoDeLeituraDoGrupo,
    textoDeAparenciaDoGrupo,
    textoDeCriacaoDoGrupo,
    textoDeEntradaNoGrupo,
    textoDeGrupoPrivado,
    textoDeRenomeacaoDoGrupo,
    textoDeSaidaDoGrupo,
} from '../domain/grupo-regras';
import { limitarLeituraAoAgora, normalizarReferencias } from '../domain/mensagem-direta-regras';
import { montarCitacaoDireta, validarReferenciaDireta } from '../domain/mensagem-direta-referencia';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, ArmazenamentoDeMensagemDireta } from '../repositories/armazenamento-de-mensagem-direta';
import { GrupoLeituraRepository } from '../repositories/grupo-leitura.repository';
import { GrupoMembroRegistrado, GrupoRegistrado, GrupoRepository } from '../repositories/grupo.repository';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';

const NOME_DE_USUARIO_REMOVIDO = 'Usuário removido';

/** O grupo, os membros atuais e quem pede, depois de conferir que ele é membro. */
interface ContextoDoGrupo {
    grupo: GrupoRegistrado;
    membros: GrupoMembroRegistrado[];
    membrosIds: number[];
}

/**
 * Grupos do chat entre colaboradores (task 246): o grupo livre. Toda regra e permissão mora aqui; o armazenamento das mensagens recebe só o
 * `conversaId` (`G<id>`) e não conhece membros. A pessoa que age é sempre a do token. Qualquer membro adiciona pessoas, renomeia e muda cor e emoji;
 * ninguém remove ninguém (cada um só sai por conta própria e pode ser readicionado); o último a sair encerra o grupo, que permanece no histórico.
 * Entrada, saída e mudanças viram mensagem do sistema; entrar gestor ou administrador torna o grupo privado para a supervisão.
 */
@Injectable()
export class GrupoService {
    constructor(
        @Inject(ARMAZENAMENTO_DE_MENSAGEM_DIRETA) private readonly armazenamento: ArmazenamentoDeMensagemDireta,
        private readonly grupoRepositorio: GrupoRepository,
        private readonly leituraRepositorio: GrupoLeituraRepository,
        private readonly usuarioRepositorio: UsuarioRepository,
        private readonly demandaRepositorio: DemandaRepository,
        private readonly atividadeRepositorio: AtividadeRepository,
        private readonly eventosService: MensagemDiretaEventosService,
    ) {}

    // ---------------------------------------------------------------------------
    // Grupo
    // ---------------------------------------------------------------------------

    async criarGrupo(dto: GrupoCriarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoCriadoDto>> {
        const nome = normalizarNomeDoGrupo(dto.nome);
        const emojiAvatar = normalizarEmojiDoGrupo(dto.emojiAvatar);
        const corAvatar = this.lerCor(dto.corAvatar);
        const convidados = [...new Set(dto.membroUsuarioIds ?? [])].filter((usuarioId) => usuarioId !== usuarioAtivo.sub);
        if (convidados.length + 1 > LIMITE_MEMBROS_DO_GRUPO) throw new BusinessException(`O grupo comporta no máximo ${LIMITE_MEMBROS_DO_GRUPO} pessoas`);
        await this.validarPessoasAtivas(convidados);

        const grupo = await this.grupoRepositorio.criarGrupo({
            nome,
            tipo: TipoGrupoEnum.LIVRE,
            criadorUsuarioId: usuarioAtivo.sub,
            corAvatar,
            emojiAvatar,
            projetoId: null,
            demandaId: null,
        });
        const entradaData = new Date();
        for (const usuarioId of [usuarioAtivo.sub, ...convidados]) {
            await this.grupoRepositorio.adicionarMembro({ grupoId: grupo.grupoId, usuarioId, entradaData });
        }

        const nomes = await this.lerNomes([usuarioAtivo.sub, ...convidados]);
        const membrosIds = [usuarioAtivo.sub, ...convidados];
        const nomeDeQuemCriou = nomes.get(usuarioAtivo.sub) ?? NOME_DE_USUARIO_REMOVIDO;
        await this.gravarMensagemDoSistema(
            grupo.grupoId,
            textoDeCriacaoDoGrupo(nomeDeQuemCriou, convidados.map((usuarioId) => nomes.get(usuarioId) ?? NOME_DE_USUARIO_REMOVIDO)),
            membrosIds,
        );
        await this.avisarSeFicouPrivado(grupo.grupoId, convidados, membrosIds, false);
        await this.sincronizar(grupo.grupoId, membrosIds);

        return { sucesso: true, dados: { grupo: await this.montarResumo(grupo.grupoId, usuarioAtivo.sub) }, mensagem: 'Grupo criado com sucesso' };
    }

    async recuperarGrupo(grupoId: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoRecuperadoDto>> {
        await this.exigirMembro(grupoId, usuarioAtivo);
        return { sucesso: true, dados: { grupo: await this.montarResumo(grupoId, usuarioAtivo.sub) }, mensagem: 'Grupo recuperado com sucesso' };
    }

    /** Qualquer membro altera nome, cor e emoji. O que não mudou não grava nem avisa. */
    async alterarGrupo(dto: GrupoAlterarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoAlteradoDto>> {
        const { grupo, membrosIds } = await this.exigirMembro(dto.grupoId, usuarioAtivo);
        const nome = dto.nome !== undefined ? normalizarNomeDoGrupo(dto.nome) : grupo.nome;
        const corAvatar = dto.corAvatar !== undefined ? this.lerCor(dto.corAvatar) : grupo.corAvatar;
        const emojiAvatar = dto.emojiAvatar !== undefined ? normalizarEmojiDoGrupo(dto.emojiAvatar) : grupo.emojiAvatar;
        const mudou = { nome: nome !== grupo.nome, cor: corAvatar !== grupo.corAvatar, emoji: emojiAvatar !== grupo.emojiAvatar };

        if (mudou.nome || mudou.cor || mudou.emoji) {
            const alterado = await this.grupoRepositorio.alterarGrupo({ grupoId: grupo.grupoId, nome, corAvatar, emojiAvatar });
            if (!alterado) throw new ResourceNotFoundException('Grupo');
            const nomeDeQuem = (await this.lerNomes([usuarioAtivo.sub])).get(usuarioAtivo.sub) ?? NOME_DE_USUARIO_REMOVIDO;
            if (mudou.nome) await this.gravarMensagemDoSistema(grupo.grupoId, textoDeRenomeacaoDoGrupo(nomeDeQuem, nome), membrosIds);
            if (mudou.cor || mudou.emoji) await this.gravarMensagemDoSistema(grupo.grupoId, textoDeAparenciaDoGrupo(nomeDeQuem, mudou), membrosIds);
            await this.sincronizar(grupo.grupoId, membrosIds);
        }
        return {
            sucesso: true,
            dados: { grupo: await this.montarResumo(grupo.grupoId, usuarioAtivo.sub) },
            mensagem: mudou.nome || mudou.cor || mudou.emoji ? 'Grupo alterado com sucesso' : 'Grupo sem alterações',
        };
    }

    /** Qualquer membro adiciona pessoas; quem tinha saído volta e vê todo o histórico, com as não lidas contadas desde a nova entrada. */
    async adicionarMembros(dto: GrupoMembroAdicionarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoMembroAdicionadoDto>> {
        const { grupo, membrosIds } = await this.exigirMembro(dto.grupoId, usuarioAtivo);
        const novos = normalizarNovosMembros(dto.usuarioIds, membrosIds, usuarioAtivo.sub);
        if (novos.length === 0) {
            return { sucesso: true, dados: { grupo: await this.montarResumo(grupo.grupoId, usuarioAtivo.sub), adicionadosUsuarioIds: [] }, mensagem: 'Todas as pessoas já são membros' };
        }
        await this.validarPessoasAtivas(novos);

        const tiposAntes = await this.lerTipos(membrosIds);
        const entradaData = new Date();
        const adicionados: number[] = [];
        for (const usuarioId of novos) {
            if (await this.grupoRepositorio.adicionarMembro({ grupoId: grupo.grupoId, usuarioId, entradaData })) adicionados.push(usuarioId);
        }
        if (adicionados.length > 0) {
            const todosIds = [...membrosIds, ...adicionados];
            const nomes = await this.lerNomes([usuarioAtivo.sub, ...adicionados]);
            await this.gravarMensagemDoSistema(
                grupo.grupoId,
                textoDeEntradaNoGrupo(
                    nomes.get(usuarioAtivo.sub) ?? NOME_DE_USUARIO_REMOVIDO,
                    adicionados.map((usuarioId) => nomes.get(usuarioId) ?? NOME_DE_USUARIO_REMOVIDO),
                ),
                todosIds,
            );
            await this.avisarSeFicouPrivado(grupo.grupoId, adicionados, todosIds, grupoEhPrivado([...tiposAntes.values()]));
            await this.sincronizar(grupo.grupoId, todosIds);
        }
        return {
            sucesso: true,
            dados: { grupo: await this.montarResumo(grupo.grupoId, usuarioAtivo.sub), adicionadosUsuarioIds: adicionados },
            mensagem: adicionados.length > 0 ? 'Pessoas adicionadas com sucesso' : 'Todas as pessoas já são membros',
        };
    }

    /** Cada um só sai por conta própria. O último a sair encerra o grupo; o histórico permanece. */
    async sairDoGrupo(grupoId: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoSaidoDto>> {
        const { membrosIds } = await this.exigirMembro(grupoId, usuarioAtivo);
        const saida = await this.grupoRepositorio.sairDoGrupo({ grupoId, usuarioId: usuarioAtivo.sub, saidaData: new Date() });
        if (!saida) throw new BusinessException('Você já saiu deste grupo');

        const restantes = membrosIds.filter((usuarioId) => usuarioId !== usuarioAtivo.sub);
        if (!saida.grupoEncerrado) {
            const nome = (await this.lerNomes([usuarioAtivo.sub])).get(usuarioAtivo.sub) ?? NOME_DE_USUARIO_REMOVIDO;
            await this.gravarMensagemDoSistema(grupoId, textoDeSaidaDoGrupo(nome), restantes);
        }
        // Quem saiu também sincroniza: a lista dele perde o grupo.
        await this.sincronizar(grupoId, [usuarioAtivo.sub, ...restantes]);
        return {
            sucesso: true,
            dados: { grupoId, grupoEncerrado: saida.grupoEncerrado },
            mensagem: saida.grupoEncerrado ? 'Você saiu e o grupo foi encerrado' : 'Você saiu do grupo',
        };
    }

    // ---------------------------------------------------------------------------
    // Mensagens
    // ---------------------------------------------------------------------------

    async enviarMensagem(dto: GrupoMensagemEnviarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<MensagemDiretaEnviadaDto>> {
        const { grupo, membrosIds } = await this.exigirMembro(dto.grupoId, usuarioAtivo);
        const conversaId = montarConversaGrupoId(grupo.grupoId);
        const mencoes = normalizarMencoesDoGrupo(dto.mencoes, dto.mencionaTodos, membrosIds, usuarioAtivo.sub);
        const referencias = normalizarReferencias(dto.referencias);
        for (const referencia of referencias) {
            await validarReferenciaDireta({ demandaRepositorio: this.demandaRepositorio, atividadeRepositorio: this.atividadeRepositorio }, referencia, usuarioAtivo);
        }
        const respondeA = await montarCitacaoDireta(this.armazenamento, dto.respondeAMensagemId, conversaId);

        const enviada = await this.armazenamento.gravar({
            mensagemId: dto.mensagemId.toLowerCase(),
            conversaId,
            autor: AutorMensagemDiretaEnum.USUARIO,
            autorUsuarioId: usuarioAtivo.sub,
            texto: dto.texto,
            contemCodigo: contemBlocoDeCodigo(dto.texto),
            mencoes,
            referencias,
            respondeA,
        });

        // O reenvio de uma mensagem já gravada não avisa de novo. Todos os membros recebem (a do autor cobre as outras abas dele).
        if (!enviada.jaExistia) {
            await this.eventosService.publicarParaUsuarios({ usuarioIds: membrosIds, evento: { tipo: 'MENSAGEM', mensagem: enviada.mensagem } });
        }
        return { sucesso: true, dados: enviada, mensagem: enviada.jaExistia ? 'Mensagem já enviada' : 'Mensagem enviada com sucesso' };
    }

    async listarMensagens(dto: GrupoMensagemListarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoMensagemListadasDto>> {
        const { grupo } = await this.exigirMembro(dto.grupoId, usuarioAtivo);
        const pagina = await this.armazenamento.listarConversa({
            conversaId: montarConversaGrupoId(grupo.grupoId),
            cursor: dto.cursor,
            limite: dto.limite ?? LIMITE_PADRAO_DA_CONVERSA_DIRETA,
        });
        return { sucesso: true, dados: { grupoId: grupo.grupoId, mensagens: pagina.mensagens, proximoCursor: pagina.proximoCursor }, mensagem: 'Conversa do grupo recuperada com sucesso' };
    }

    // ---------------------------------------------------------------------------
    // Leitura, silêncio e digitação
    // ---------------------------------------------------------------------------

    async alterarLeitura(dto: GrupoLeituraAlterarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoLeituraAlteradaDto>> {
        const { grupo, membrosIds } = await this.exigirMembro(dto.grupoId, usuarioAtivo);
        const marcador = await this.leituraRepositorio.alterarLeitura({
            grupoId: grupo.grupoId,
            usuarioId: usuarioAtivo.sub,
            lidaAteData: limitarLeituraAoAgora(dto.lidaAteData, new Date()),
        });
        const lidaAteData = marcador.lidaAteData as Date;
        const conversaId = montarConversaGrupoId(grupo.grupoId);
        await this.eventosService.publicarParaUsuarios({
            usuarioIds: membrosIds,
            evento: { tipo: 'LEITURA', conversaId, usuarioId: usuarioAtivo.sub, lidaAteDate: lidaAteData },
        });
        return { sucesso: true, dados: { grupoId: grupo.grupoId, conversaId, lidaAteData }, mensagem: 'Leitura registrada com sucesso' };
    }

    async alterarSilencio(dto: GrupoSilencioAlterarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoSilencioAlteradoDto>> {
        const { grupo } = await this.exigirMembro(dto.grupoId, usuarioAtivo);
        const marcador = await this.leituraRepositorio.alterarSilencio({ grupoId: grupo.grupoId, usuarioId: usuarioAtivo.sub, silenciada: dto.silenciada });
        return {
            sucesso: true,
            dados: { grupoId: grupo.grupoId, silenciada: marcador.silenciada },
            mensagem: marcador.silenciada ? 'Grupo silenciado' : 'Grupo reativado',
        };
    }

    /** O "digitando…": só repassa o aviso aos outros membros e não grava nada. */
    async avisarDigitacao(grupoId: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<void>> {
        const { membrosIds } = await this.exigirMembro(grupoId, usuarioAtivo);
        await this.eventosService.publicarParaUsuarios({
            usuarioIds: membrosIds.filter((usuarioId) => usuarioId !== usuarioAtivo.sub),
            evento: { tipo: 'DIGITANDO', conversaId: montarConversaGrupoId(grupoId), usuarioId: usuarioAtivo.sub },
        });
        return { sucesso: true, dados: null, mensagem: 'Aviso enviado' };
    }

    // ---------------------------------------------------------------------------
    // Para a lista do popup e a busca
    // ---------------------------------------------------------------------------

    /** Os ids dos grupos de que a pessoa é membro agora (a busca olha só estes). */
    async listarGrupoIdsDoUsuario(usuarioId: number): Promise<number[]> {
        return (await this.grupoRepositorio.listarGruposDoUsuario({ usuarioId })).slice(0, LIMITE_GRUPOS_DO_USUARIO).map((grupo) => grupo.grupoId);
    }

    /** Os grupos da pessoa para a lista do popup: o que teve mensagem mais recente primeiro; grupo sem mensagem vem depois, do mais novo. */
    async listarResumos(usuarioId: number): Promise<GrupoResumoDto[]> {
        const grupos = (await this.grupoRepositorio.listarGruposDoUsuario({ usuarioId })).slice(0, LIMITE_GRUPOS_DO_USUARIO);
        return this.montarResumos(grupos, usuarioId);
    }

    // ---------------------------------------------------------------------------
    // Montagem
    // ---------------------------------------------------------------------------

    private async montarResumo(grupoId: number, usuarioId: number): Promise<GrupoResumoDto> {
        const grupo = await this.grupoRepositorio.recuperarGrupo({ grupoId });
        if (!grupo) throw new ResourceNotFoundException('Grupo');
        return (await this.montarResumos([grupo], usuarioId))[0];
    }

    private async montarResumos(grupos: GrupoRegistrado[], usuarioId: number): Promise<GrupoResumoDto[]> {
        if (grupos.length === 0) return [];
        const grupoIds = grupos.map((grupo) => grupo.grupoId);
        const [membros, marcadores, conversas] = await Promise.all([
            this.grupoRepositorio.listarMembrosDeGrupos({ grupoIds }),
            this.leituraRepositorio.listarMarcadores({ usuarioId }),
            this.armazenamento.listarConversasDeGrupos({ grupoIds }),
        ]);
        const usuarios = new Map((await this.usuarioRepositorio.listarTiposPorIds({ usuarioIds: [...new Set(membros.map((membro) => membro.usuarioId))] })).map((usuario) => [usuario.id, usuario]));
        const marcadorPorGrupo = new Map(marcadores.map((marcador) => [marcador.grupoId, marcador]));
        const conversaPorGrupo = new Map(conversas.map((conversa) => [conversa.conversaId, conversa]));
        const online = this.eventosService.listarUsuariosOnline();

        const membrosPorGrupo = new Map<number, GrupoMembroResumoDto[]>();
        const entradaDoUsuario = new Map<number, Date>();
        for (const membro of membros) {
            const usuario = usuarios.get(membro.usuarioId);
            const lista = membrosPorGrupo.get(membro.grupoId) ?? [];
            lista.push({
                usuarioId: membro.usuarioId,
                usuarioNome: usuario?.nomeCompleto ?? NOME_DE_USUARIO_REMOVIDO,
                tipo: usuario?.tipo ?? TipoUsuarioEnum.DESENVOLVEDOR,
                corAvatar: usuario?.corAvatar ?? null,
                entradaData: membro.entradaData,
                online: online.has(membro.usuarioId),
            });
            membrosPorGrupo.set(membro.grupoId, lista);
            if (membro.usuarioId === usuarioId) entradaDoUsuario.set(membro.grupoId, membro.entradaData);
        }

        const naoLidas = await this.armazenamento.contarNaoLidasDeGrupos({
            usuarioId,
            marcadores: grupos
                .filter((grupo) => entradaDoUsuario.has(grupo.grupoId))
                .map((grupo) => ({
                    conversaId: montarConversaGrupoId(grupo.grupoId),
                    lidaAteDate: pontoDeLeituraDoGrupo(marcadorPorGrupo.get(grupo.grupoId)?.lidaAteData ?? null, entradaDoUsuario.get(grupo.grupoId) as Date),
                })),
        });

        const resumos = grupos.map((grupo): GrupoResumoDto => {
            const conversaId = montarConversaGrupoId(grupo.grupoId);
            const membrosDoGrupo = membrosPorGrupo.get(grupo.grupoId) ?? [];
            return {
                grupoId: grupo.grupoId,
                conversaId,
                nome: grupo.nome,
                tipo: grupo.tipo,
                corAvatar: grupo.corAvatar,
                emojiAvatar: grupo.emojiAvatar,
                criadorUsuarioId: grupo.criadorUsuarioId,
                membros: membrosDoGrupo,
                ultimaMensagem: conversaPorGrupo.get(conversaId)?.ultimaMensagem ?? null,
                naoLidas: naoLidas[conversaId] ?? 0,
                silenciada: marcadorPorGrupo.get(grupo.grupoId)?.silenciada ?? false,
                privado: grupoEhPrivado(membrosDoGrupo.map((membro) => membro.tipo)),
            };
        });
        const instante = (resumo: GrupoResumoDto, grupo: GrupoRegistrado) => (resumo.ultimaMensagem ? resumo.ultimaMensagem.createdDate.getTime() : grupo.createdDate.getTime());
        const criado = new Map(grupos.map((grupo) => [grupo.grupoId, grupo]));
        return resumos.sort((primeiro, segundo) => {
            const comMensagemPrimeiro = primeiro.ultimaMensagem ? 1 : 0;
            const comMensagemSegundo = segundo.ultimaMensagem ? 1 : 0;
            if (comMensagemPrimeiro !== comMensagemSegundo) return comMensagemSegundo - comMensagemPrimeiro;
            return instante(segundo, criado.get(segundo.grupoId) as GrupoRegistrado) - instante(primeiro, criado.get(primeiro.grupoId) as GrupoRegistrado);
        });
    }

    // ---------------------------------------------------------------------------
    // Validações e apoio
    // ---------------------------------------------------------------------------

    /** O grupo existe e a pessoa é membro agora. Não membro (inclusive quem saiu) recebe 403; grupo inexistente ou encerrado, 404. */
    private async exigirMembro(grupoId: number, usuarioAtivo: JwtPayload): Promise<ContextoDoGrupo> {
        const grupo = await this.grupoRepositorio.recuperarGrupo({ grupoId });
        if (!grupo) throw new ResourceNotFoundException('Grupo');
        const membros = await this.grupoRepositorio.listarMembros({ grupoId });
        if (!membros.some((membro) => membro.usuarioId === usuarioAtivo.sub)) throw new UnauthorizedAccessException('Você não é membro deste grupo');
        return { grupo, membros, membrosIds: membros.map((membro) => membro.usuarioId) };
    }

    /** Todas as pessoas existem e estão ativas. */
    private async validarPessoasAtivas(usuarioIds: number[]): Promise<void> {
        if (usuarioIds.length === 0) return;
        const ativos = new Set((await this.usuarioRepositorio.listarAtivos()).map((usuario) => usuario.id));
        if (usuarioIds.some((usuarioId) => !ativos.has(usuarioId))) throw new BusinessException('Há pessoas que não existem ou estão inativas');
    }

    private lerCor(cor: string | null | undefined): string | null {
        if (cor === null || cor === undefined) return null;
        const normalizada = normalizarCorAvatar(cor);
        if (!ehCorAvatarValida(normalizada)) throw new BusinessException('A cor deve ser um hexadecimal #RRGGBB');
        return normalizada;
    }

    private async lerNomes(usuarioIds: number[]): Promise<Map<number, string>> {
        const encontrados = await this.usuarioRepositorio.listarNomesPorIds({ usuarioIds: [...new Set(usuarioIds)] });
        return new Map(encontrados.map((usuario) => [usuario.id, usuario.nomeCompleto]));
    }

    private async lerTipos(usuarioIds: number[]): Promise<Map<number, TipoUsuarioEnum>> {
        const encontrados = await this.usuarioRepositorio.listarTiposPorIds({ usuarioIds: [...new Set(usuarioIds)] });
        return new Map(encontrados.map((usuario) => [usuario.id, usuario.tipo]));
    }

    /**
   * Entrou gestor ou administrador: o grupo passa a ser privado para a supervisão e os membros são avisados. Só avisa na virada (grupo que já era
   * privado não repete). `jaEraPrivado` é o estado antes da entrada.
   */
    private async avisarSeFicouPrivado(grupoId: number, entraramIds: number[], membrosIds: number[], jaEraPrivado: boolean): Promise<void> {
        if (jaEraPrivado || entraramIds.length === 0) return;
        const encontrados = (await this.usuarioRepositorio.listarTiposPorIds({ usuarioIds: entraramIds })).filter((usuario) => temPermissaoDeGestor(usuario.tipo));
        if (encontrados.length === 0) return;
        await this.gravarMensagemDoSistema(grupoId, textoDeGrupoPrivado(encontrados.map((usuario) => ({ nome: usuario.nomeCompleto, tipo: usuario.tipo }))), membrosIds);
    }

    /** Grava a mensagem do sistema e a entrega aos membros. Falhar na entrega não falha a operação: a mensagem já está gravada e o cliente a relê. */
    private async gravarMensagemDoSistema(grupoId: number, texto: string, destinatariosIds: number[]): Promise<void> {
        const gravada = await this.armazenamento.gravar({
            mensagemId: randomUUID(),
            conversaId: montarConversaGrupoId(grupoId),
            autor: AutorMensagemDiretaEnum.SISTEMA,
            autorUsuarioId: null,
            texto,
            contemCodigo: false,
            mencoes: [],
            referencias: [],
        });
        await this.eventosService.publicarParaUsuarios({ usuarioIds: destinatariosIds, evento: { tipo: 'MENSAGEM', mensagem: gravada.mensagem } });
    }

    /** Pede aos clientes que releiam a lista (e o grupo): entrada, saída, nome, cor e emoji mudam o que está na tela. */
    private async sincronizar(grupoId: number, usuarioIds: number[]): Promise<void> {
        await this.eventosService.publicarParaUsuarios({ usuarioIds: [...new Set(usuarioIds)], evento: { tipo: 'SINCRONIZAR', conversaId: montarConversaGrupoId(grupoId) } });
    }
}
