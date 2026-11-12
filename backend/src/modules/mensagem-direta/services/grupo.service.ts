import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
    AutorMensagemDiretaEnum,
    GrupoAlteradoDto,
    GrupoAlterarDto,
    GrupoCanalCriadoDto,
    GrupoCanalCriarDto,
    GrupoCanalRecuperadoDto,
    GrupoCanalRecuperarDto,
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
    grupoEhCanal,
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
    nomeDoCanalParaGuardar,
    normalizarEmojiDoGrupo,
    normalizarMencoesDoGrupo,
    normalizarNomeDoGrupo,
    normalizarNovosMembros,
    pontoDeLeituraDoGrupo,
    textoDeAparenciaDoGrupo,
    textoDeCriacaoDoCanal,
    textoDeCriacaoDoGrupo,
    textoDeEntradaNoCanal,
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
import { CanalAcessoService } from './canal-acesso.service';
import { GrupoSupervisaoService } from './grupo-supervisao.service';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';

const NOME_DE_USUARIO_REMOVIDO = 'Usuário removido';

/** O grupo, os membros atuais e a relação de quem pede com ele. */
interface ContextoDoGrupo {
    grupo: GrupoRegistrado;
    membros: GrupoMembroRegistrado[];
    membrosIds: number[];
    /** Quem pede é membro agora (no canal, por `demanda_usuario` ou por ter escrito, se for gestor). */
    ehMembro: boolean;
    /** Canal em que gestor ou administrador, sem ser membro, lê por tipo (a leitura é a da supervisão: auditada e avisada). */
    leitorPorTipo: boolean;
}

function ehErroDeChaveDuplicada(erro: unknown): boolean {
    return (erro as { code?: string } | null)?.code === '23505';
}

/**
 * Grupos do chat entre colaboradores (task 246): o grupo livre. Toda regra e permissão mora aqui; o armazenamento das mensagens recebe só o
 * `conversaId` (`G<id>`) e não conhece membros. A pessoa que age é sempre a do token. Qualquer membro adiciona pessoas, renomeia e muda cor e emoji;
 * ninguém remove ninguém (cada um só sai por conta própria e pode ser readicionado); o último a sair encerra o grupo, que permanece no histórico.
 * Entrada, saída e mudanças viram mensagem do sistema; entrar gestor ou administrador torna o grupo privado para a supervisão.
 *
 * Os **canais** (task 248) passam pelas mesmas operações de mensagem, leitura e silêncio, mas o acesso vem de `CanalAcessoService`: o desenvolvedor é
 * membro por `demanda_usuario`, o nome é o da demanda ou do projeto, ninguém entra, sai nem renomeia, e o gestor ou administrador lê por tipo (pela
 * supervisão) e só vira membro ao escrever.
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
        private readonly canais: CanalAcessoService,
        private readonly supervisaoService: GrupoSupervisaoService,
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

        return { sucesso: true, dados: { grupo: await this.montarResumo(grupo.grupoId, usuarioAtivo) }, mensagem: 'Grupo criado com sucesso' };
    }

    async recuperarGrupo(grupoId: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoRecuperadoDto>> {
        await this.exigirAcessoDeLeitura(grupoId, usuarioAtivo);
        return { sucesso: true, dados: { grupo: await this.montarResumo(grupoId, usuarioAtivo) }, mensagem: 'Grupo recuperado com sucesso' };
    }

    // ---------------------------------------------------------------------------
    // Canais de projeto e de demanda
    // ---------------------------------------------------------------------------

    /** O canal de uma demanda ou de um projeto, ou `null` quando ainda não foi criado (a tela oferece "Criar chat"). Exige o mesmo acesso de quem cria. */
    async recuperarCanal(dto: GrupoCanalRecuperarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoCanalRecuperadoDto>> {
        const alvo = await this.canais.validarAcessoAoAlvo(dto, usuarioAtivo);
        const existente = await this.grupoRepositorio.recuperarCanalPorAlvo(this.chaveDoCanal(dto, alvo.projetoId));
        return {
            sucesso: true,
            dados: { grupo: existente ? await this.montarResumo(existente.grupoId, usuarioAtivo) : null },
            mensagem: existente ? 'Chat recuperado com sucesso' : 'Esta demanda ou projeto ainda não tem chat',
        };
    }

    /**
     * Abre o canal de uma demanda ou de um projeto. Idempotente: se já existe (inclusive criado por outra pessoa no mesmo instante, que o índice único
     * garante), devolve o existente sem nova mensagem. Quem cria não vira membro por isso: o desenvolvedor já é pela demanda; o gestor só ao escrever.
     */
    async criarCanal(dto: GrupoCanalCriarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoCanalCriadoDto>> {
        const alvo = await this.canais.validarAcessoAoAlvo(dto, usuarioAtivo);
        const chave = this.chaveDoCanal(dto, alvo.projetoId);
        const jaExistente = await this.grupoRepositorio.recuperarCanalPorAlvo(chave);
        if (jaExistente) return this.respostaDoCanal(jaExistente.grupoId, true, usuarioAtivo);

        let criado: GrupoRegistrado;
        try {
            criado = await this.grupoRepositorio.criarGrupo({
                nome: nomeDoCanalParaGuardar(alvo.nome),
                tipo: dto.tipo,
                criadorUsuarioId: usuarioAtivo.sub,
                corAvatar: null,
                emojiAvatar: null,
                projetoId: chave.projetoId,
                demandaId: chave.demandaId,
            });
        } catch (erro) {
            // Duas pessoas clicaram em "Criar chat" ao mesmo tempo: o índice único deixou passar uma só.
            if (!ehErroDeChaveDuplicada(erro)) throw erro;
            const vencedor = await this.grupoRepositorio.recuperarCanalPorAlvo(chave);
            if (!vencedor) throw erro;
            return this.respostaDoCanal(vencedor.grupoId, true, usuarioAtivo);
        }

        const membrosIds = (await this.canais.listarMembros(criado)).map((membro) => membro.usuarioId);
        const nomeDeQuemCriou = (await this.lerNomes([usuarioAtivo.sub])).get(usuarioAtivo.sub) ?? NOME_DE_USUARIO_REMOVIDO;
        await this.gravarMensagemDoSistema(criado.grupoId, textoDeCriacaoDoCanal(nomeDeQuemCriou, dto.tipo), membrosIds);
        await this.sincronizar(criado.grupoId, [...membrosIds, usuarioAtivo.sub]);
        return this.respostaDoCanal(criado.grupoId, false, usuarioAtivo);
    }

    private chaveDoCanal(dto: GrupoCanalRecuperarDto, projetoIdDoAlvo: number): { demandaId: number | null; projetoId: number | null } {
        return dto.tipo === TipoGrupoEnum.DEMANDA ? { demandaId: dto.alvoId, projetoId: projetoIdDoAlvo } : { demandaId: null, projetoId: dto.alvoId };
    }

    private async respostaDoCanal(grupoId: number, jaExistia: boolean, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoCanalCriadoDto>> {
        return {
            sucesso: true,
            dados: { grupo: await this.montarResumo(grupoId, usuarioAtivo), jaExistia },
            mensagem: jaExistia ? 'Esta demanda ou projeto já tinha chat' : 'Chat criado com sucesso',
        };
    }

    /** Qualquer membro altera nome, cor e emoji. O que não mudou não grava nem avisa. */
    async alterarGrupo(dto: GrupoAlterarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoAlteradoDto>> {
        const { grupo, membrosIds } = await this.exigirMembro(dto.grupoId, usuarioAtivo);
        this.recusarEmCanal(grupo, 'O nome e a aparência do chat acompanham a demanda ou o projeto');
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
            dados: { grupo: await this.montarResumo(grupo.grupoId, usuarioAtivo) },
            mensagem: mudou.nome || mudou.cor || mudou.emoji ? 'Grupo alterado com sucesso' : 'Grupo sem alterações',
        };
    }

    /** Qualquer membro adiciona pessoas; quem tinha saído volta e vê todo o histórico, com as não lidas contadas desde a nova entrada. */
    async adicionarMembros(dto: GrupoMembroAdicionarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoMembroAdicionadoDto>> {
        const { grupo, membrosIds } = await this.exigirMembro(dto.grupoId, usuarioAtivo);
        this.recusarEmCanal(grupo, 'Os membros do chat vêm da demanda ou do projeto');
        const novos = normalizarNovosMembros(dto.usuarioIds, membrosIds, usuarioAtivo.sub);
        if (novos.length === 0) {
            return { sucesso: true, dados: { grupo: await this.montarResumo(grupo.grupoId, usuarioAtivo), adicionadosUsuarioIds: [] }, mensagem: 'Todas as pessoas já são membros' };
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
            dados: { grupo: await this.montarResumo(grupo.grupoId, usuarioAtivo), adicionadosUsuarioIds: adicionados },
            mensagem: adicionados.length > 0 ? 'Pessoas adicionadas com sucesso' : 'Todas as pessoas já são membros',
        };
    }

    /** Cada um só sai por conta própria. O último a sair encerra o grupo; o histórico permanece. */
    async sairDoGrupo(grupoId: number, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoSaidoDto>> {
        const { grupo, membrosIds } = await this.exigirMembro(grupoId, usuarioAtivo);
        this.recusarEmCanal(grupo, 'O chat da demanda ou do projeto não tem saída: use o silêncio para parar de receber os avisos');
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
        const contexto = await this.carregarContexto(dto.grupoId, usuarioAtivo);
        const { grupo } = contexto;
        if (!contexto.ehMembro && !contexto.leitorPorTipo) this.recusarSemAcesso(grupo);
        const conversaId = montarConversaGrupoId(grupo.grupoId);
        // Gestor ou administrador que escreve num canal passa a contar como membro (entra em `@todos` e nas não lidas daí em diante), mas só depois de a
        // mensagem passar por todas as validações: uma recusa não deixa a pessoa dentro do canal.
        const membrosPrevistos = contexto.ehMembro ? contexto.membrosIds : [...contexto.membrosIds, usuarioAtivo.sub];
        const mencoes = normalizarMencoesDoGrupo(dto.mencoes, dto.mencionaTodos, membrosPrevistos, usuarioAtivo.sub);
        const referencias = normalizarReferencias(dto.referencias);
        for (const referencia of referencias) {
            await validarReferenciaDireta({ demandaRepositorio: this.demandaRepositorio, atividadeRepositorio: this.atividadeRepositorio }, referencia, usuarioAtivo);
        }
        const respondeA = await montarCitacaoDireta(this.armazenamento, dto.respondeAMensagemId, conversaId);
        const membrosIds = contexto.ehMembro ? contexto.membrosIds : await this.entrarNoCanal(contexto, usuarioAtivo);

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
        const { grupo, leitorPorTipo } = await this.exigirAcessoDeLeitura(dto.grupoId, usuarioAtivo);
        // Quem lê o canal sem ser membro lê pela supervisão: a abertura é auditada e os membros são avisados, no máximo uma vez por dia.
        if (leitorPorTipo) {
            const lido = (await this.supervisaoService.lerGrupoSupervisionado({ grupoId: grupo.grupoId, cursor: dto.cursor, limite: dto.limite }, usuarioAtivo)).dados!;
            return { sucesso: true, dados: { grupoId: grupo.grupoId, mensagens: lido.mensagens, proximoCursor: lido.proximoCursor }, mensagem: 'Conversa do canal recuperada com sucesso' };
        }
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
        const { grupo, membrosIds, leitorPorTipo } = await this.exigirAcessoDeLeitura(dto.grupoId, usuarioAtivo);
        // Quem lê o canal por tipo não é membro: não há o que marcar como lido, e a leitura dele não aparece para ninguém.
        if (leitorPorTipo) {
            return {
                sucesso: true,
                dados: { grupoId: grupo.grupoId, conversaId: montarConversaGrupoId(grupo.grupoId), lidaAteData: limitarLeituraAoAgora(dto.lidaAteData, new Date()) },
                mensagem: 'Leitura por supervisão não é registrada',
            };
        }
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
        const { membrosIds, leitorPorTipo } = await this.exigirAcessoDeLeitura(grupoId, usuarioAtivo);
        if (leitorPorTipo) return { sucesso: true, dados: null, mensagem: 'Aviso enviado' };
        await this.eventosService.publicarParaUsuarios({
            usuarioIds: membrosIds.filter((usuarioId) => usuarioId !== usuarioAtivo.sub),
            evento: { tipo: 'DIGITANDO', conversaId: montarConversaGrupoId(grupoId), usuarioId: usuarioAtivo.sub },
        });
        return { sucesso: true, dados: null, mensagem: 'Aviso enviado' };
    }

    // ---------------------------------------------------------------------------
    // Para a lista do popup e a busca
    // ---------------------------------------------------------------------------

    /** Os ids dos grupos e canais de que a pessoa é membro agora (a busca olha só estes). */
    async listarGrupoIdsDoUsuario(usuarioAtivo: JwtPayload): Promise<number[]> {
        return (await this.listarGruposAcessiveis(usuarioAtivo)).map((grupo) => grupo.grupoId);
    }

    /** Os grupos e canais da pessoa para a lista do popup: o que teve mensagem mais recente primeiro; sem mensagem vem depois, do mais novo. */
    async listarResumos(usuarioAtivo: JwtPayload): Promise<GrupoResumoDto[]> {
        return this.montarResumos(await this.listarGruposAcessiveis(usuarioAtivo), usuarioAtivo);
    }

    /**
     * Os grupos livres de que a pessoa é membro e os canais a que tem acesso: o desenvolvedor, pelos canais das demandas e projetos em que está
     * (`demanda_usuario`); o gestor e o administrador, só pelos canais em que escreveram (a linha em `grupo_membro`). Do mais novo para o mais antigo.
     */
    private async listarGruposAcessiveis(usuarioAtivo: JwtPayload): Promise<GrupoRegistrado[]> {
        const porTipo = temPermissaoDeGestor(usuarioAtivo.tipo);
        const proprios = (await this.grupoRepositorio.listarGruposDoUsuario({ usuarioId: usuarioAtivo.sub })).filter((grupo) => !grupoEhCanal(grupo.tipo) || porTipo);
        const derivados = porTipo ? [] : await this.canais.listarCanaisDoUsuario({ usuarioId: usuarioAtivo.sub });
        const candidatos = [...new Map([...proprios, ...derivados].map((grupo) => [grupo.grupoId, grupo])).values()];
        // O canal cuja demanda ou projeto foi excluído não existe mais para ninguém: nem na lista nem na busca.
        const alvos = await this.canais.resolverAlvos(candidatos);
        return candidatos
            .filter((grupo) => !grupoEhCanal(grupo.tipo) || alvos.has(grupo.grupoId))
            .sort((primeiro, segundo) => segundo.createdDate.getTime() - primeiro.createdDate.getTime() || segundo.grupoId - primeiro.grupoId)
            .slice(0, LIMITE_GRUPOS_DO_USUARIO);
    }

    // ---------------------------------------------------------------------------
    // Montagem
    // ---------------------------------------------------------------------------

    private async montarResumo(grupoId: number, usuarioAtivo: JwtPayload): Promise<GrupoResumoDto> {
        const grupo = await this.grupoRepositorio.recuperarGrupo({ grupoId });
        if (!grupo) throw new ResourceNotFoundException('Grupo');
        const resumos = await this.montarResumos([grupo], usuarioAtivo);
        if (resumos.length === 0) throw new ResourceNotFoundException('Canal');
        return resumos[0];
    }

    private async montarResumos(todos: GrupoRegistrado[], usuarioAtivo: JwtPayload): Promise<GrupoResumoDto[]> {
        const usuarioId = usuarioAtivo.sub;
        // O canal cuja demanda ou projeto foi excluído deixou de existir para quem lê (o nome de hoje vem do alvo, não do que ficou guardado).
        const alvos = await this.canais.resolverAlvos(todos);
        const grupos = todos.filter((grupo) => !grupoEhCanal(grupo.tipo) || alvos.has(grupo.grupoId));
        if (grupos.length === 0) return [];
        const grupoIds = grupos.map((grupo) => grupo.grupoId);
        const [membros, marcadores, conversas] = await Promise.all([
            this.canais.listarMembrosDeGrupos(grupos),
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
            const ehMembro = entradaDoUsuario.has(grupo.grupoId);
            return {
                grupoId: grupo.grupoId,
                conversaId,
                nome: alvos.get(grupo.grupoId)?.nome ?? grupo.nome,
                tipo: grupo.tipo,
                corAvatar: grupo.corAvatar,
                emojiAvatar: grupo.emojiAvatar,
                criadorUsuarioId: grupo.criadorUsuarioId,
                membros: membrosDoGrupo,
                ultimaMensagem: conversaPorGrupo.get(conversaId)?.ultimaMensagem ?? null,
                naoLidas: naoLidas[conversaId] ?? 0,
                silenciada: marcadorPorGrupo.get(grupo.grupoId)?.silenciada ?? false,
                privado: grupoEhPrivado(membrosDoGrupo.map((membro) => membro.tipo), grupo.tipo),
                leituraPorSupervisao: grupoEhCanal(grupo.tipo) && !ehMembro && temPermissaoDeGestor(usuarioAtivo.tipo),
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

    /**
     * O grupo existe (o canal, só se a demanda ou o projeto existe) e a relação de quem pede com ele: membro, leitor por tipo ou nada. Grupo inexistente
     * ou encerrado: 404. Não decide o acesso; quem chama escolhe `exigirMembro` ou `exigirAcessoDeLeitura`.
     */
    private async carregarContexto(grupoId: number, usuarioAtivo: JwtPayload): Promise<ContextoDoGrupo> {
        const grupo = await this.grupoRepositorio.recuperarGrupo({ grupoId });
        if (!grupo) throw new ResourceNotFoundException('Grupo');
        if (grupoEhCanal(grupo.tipo) && !(await this.canais.resolverAlvos([grupo])).has(grupo.grupoId)) throw new ResourceNotFoundException('Canal');
        const membros = await this.canais.listarMembros(grupo);
        const ehMembro = membros.some((membro) => membro.usuarioId === usuarioAtivo.sub);
        return {
            grupo,
            membros,
            membrosIds: membros.map((membro) => membro.usuarioId),
            ehMembro,
            leitorPorTipo: !ehMembro && grupoEhCanal(grupo.tipo) && temPermissaoDeGestor(usuarioAtivo.tipo),
        };
    }

    /** Para o resumo com a IA (task 249): o grupo e os membros, só se quem pede é membro agora (no canal, também o gestor que já escreveu). */
    async exigirMembroParaResumo(grupoId: number, usuarioAtivo: JwtPayload): Promise<{ grupo: GrupoRegistrado; membrosIds: number[] }> {
        const { grupo, membrosIds } = await this.exigirMembro(grupoId, usuarioAtivo);
        return { grupo, membrosIds };
    }

    /** A pessoa é membro agora. Não membro (inclusive quem saiu, ou saiu da demanda) recebe 403. */
    private async exigirMembro(grupoId: number, usuarioAtivo: JwtPayload): Promise<ContextoDoGrupo> {
        const contexto = await this.carregarContexto(grupoId, usuarioAtivo);
        if (!contexto.ehMembro) this.recusarSemAcesso(contexto.grupo);
        return contexto;
    }

    /** Membro, ou gestor e administrador lendo um canal por tipo; qualquer outra pessoa recebe 403. */
    private async exigirAcessoDeLeitura(grupoId: number, usuarioAtivo: JwtPayload): Promise<ContextoDoGrupo> {
        const contexto = await this.carregarContexto(grupoId, usuarioAtivo);
        if (!contexto.ehMembro && !contexto.leitorPorTipo) this.recusarSemAcesso(contexto.grupo);
        return contexto;
    }

    private recusarSemAcesso(grupo: GrupoRegistrado): never {
        throw new UnauthorizedAccessException(grupoEhCanal(grupo.tipo) ? 'Você não tem acesso a este chat' : 'Você não é membro deste grupo');
    }

    private recusarEmCanal(grupo: GrupoRegistrado, mensagem: string): void {
        if (grupoEhCanal(grupo.tipo)) throw new BusinessException(mensagem);
    }

    /** O gestor ou administrador que escreve num canal vira membro (uma linha em `grupo_membro`) e a entrada dele é avisada. Devolve os membros de agora. */
    private async entrarNoCanal(contexto: ContextoDoGrupo, usuarioAtivo: JwtPayload): Promise<number[]> {
        const membrosIds = [...contexto.membrosIds, usuarioAtivo.sub];
        const entrou = await this.grupoRepositorio.adicionarMembro({ grupoId: contexto.grupo.grupoId, usuarioId: usuarioAtivo.sub, entradaData: new Date() });
        if (entrou) {
            const nome = (await this.lerNomes([usuarioAtivo.sub])).get(usuarioAtivo.sub) ?? NOME_DE_USUARIO_REMOVIDO;
            await this.gravarMensagemDoSistema(contexto.grupo.grupoId, textoDeEntradaNoCanal({ nome, tipo: usuarioAtivo.tipo }), membrosIds);
            await this.sincronizar(contexto.grupo.grupoId, membrosIds);
        }
        return membrosIds;
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
