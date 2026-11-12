import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
    AutorMensagemDiretaEnum,
    EstadoIaEnum,
    GrupoResumoIaCriarDto,
    GrupoResumoIaCriadoDto,
    GrupoResumoIaDestinoEnum,
    GrupoResumoIaEstimadoDto,
    GrupoResumoIaEstimarDto,
    GrupoResumoIaPropostaConfirmadaDto,
    GrupoResumoIaPropostaCriadaDto,
    GrupoResumoIaPropostaCriarDto,
    GrupoResumoIaPropostaDecidirDto,
    GrupoResumoIaPropostaRecusadaDto,
    GrupoResumoIaRecuperadoDto,
    GrupoResumoIaRecuperarDto,
    IaModeloPrecoDto,
    LIMITE_MAXIMO_DA_CONVERSA_DIRETA,
    NivelIaEnum,
    ReferenciaMensagemDiretaEnum,
    StandardResponse,
    TipoGrupoEnum,
    TipoPropostaIaEnum,
    montarConversaGrupoId,
    podeEditarDemanda,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { IaException, traduzirFalhaDeIa } from '../../ia/domain/ia.exception';
import { IaResposta } from '../../ia/domain/ia.tipos';
import { IaService } from '../../ia/services/ia.service';
import { IaUsoService } from '../../ia-custo/services/ia-uso.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import {
    INSTRUCOES_DO_FECHAMENTO_DO_RESUMO,
    INSTRUCOES_DO_RESUMO_DO_BLOCO,
    MAXIMO_DE_TOKENS_DO_BLOCO,
    MAXIMO_DE_TOKENS_DO_FECHAMENTO,
    MensagemParaResumo,
    dividirEmBlocos,
    estimarResumo,
    fecharTextoDoResumo,
    lerPeriodoDoResumo,
    montarBlocoDaDocumentacao,
    montarEntradaDoFechamento,
    prepararMensagens,
    rotuloDoPeriodo,
} from '../domain/grupo-resumo-ia';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, ArmazenamentoDeMensagemDireta } from '../repositories/armazenamento-de-mensagem-direta';
import { GrupoRegistrado } from '../repositories/grupo.repository';
import { GrupoResumoRepository } from '../repositories/grupo-resumo.repository';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';
import { GrupoService } from './grupo.service';

const DESCRICAO_DO_USO = 'Resumo de grupo do chat entre colaboradores';
/** Teto de páginas lidas do armazenamento por resumo (proteção contra um laço sem fim; 100 mensagens por página). */
const MAXIMO_DE_PAGINAS = 2000;

interface PeriodoLido {
    mensagens: MensagemParaResumo[];
    inicio: Date;
    fim: Date;
}

/**
 * Resumo de grupo e canal com a IA (task 249). A pessoa pede com `/resumir`: **estimar** não chama o provedor; **resumir** lê **todas** as mensagens de pessoa
 * do período, troca os blocos de código por `[trecho de código omitido]` **antes** de qualquer envio (se a pessoa não os quer enviados), divide em blocos,
 * resume cada um, fecha num único texto sem nomes de autor e termina com a linha de IA. O texto volta à tela e não é guardado; só a linha de `grupo_resumo`
 * (período, modelo e tokens) fica, e o custo entra na aba Custos pela mensagem de uso do chat. Gravar na documentação é uma **proposta** de alterar a demanda
 * (`ALTERAR_DEMANDA`, acrescentando ao fim) que a pessoa confirma ou recusa; ao confirmar, o canal recebe a mensagem do sistema com o cartão da demanda.
 */
@Injectable()
export class GrupoResumoIaService {
    private readonly logger = new Logger(GrupoResumoIaService.name);

    constructor(
        @Inject(ARMAZENAMENTO_DE_MENSAGEM_DIRETA) private readonly armazenamento: ArmazenamentoDeMensagemDireta,
        private readonly grupoService: GrupoService,
        private readonly resumoRepositorio: GrupoResumoRepository,
        private readonly iaService: IaService,
        private readonly iaUsoService: IaUsoService,
        private readonly configuracaoIaService: ConfiguracaoIaService,
        private readonly demandaRepositorio: DemandaRepository,
        private readonly propostaIaService: PropostaIaService,
        private readonly eventosService: MensagemDiretaEventosService,
    ) {}

    /** O que abre o diálogo: o fim do último resumo do grupo e onde este pode ser gravado. */
    async recuperarOpcoes(dto: GrupoResumoIaRecuperarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoResumoIaRecuperadoDto>> {
        const { grupo } = await this.grupoService.exigirMembroDoGrupo(dto.grupoId, usuarioAtivo);
        const ultimo = await this.resumoRepositorio.recuperarUltimoResumo({ grupoId: grupo.grupoId });
        return {
            sucesso: true,
            dados: {
                ultimoResumoData: ultimo?.fimData ?? null,
                destino: this.destinoDoGrupo(grupo),
                demandaId: grupo.tipo === TipoGrupoEnum.DEMANDA ? grupo.demandaId : null,
                projetoId: grupo.tipo === TipoGrupoEnum.PROJETO ? grupo.projetoId : null,
            },
            mensagem: 'Opções do resumo recuperadas com sucesso',
        };
    }

    /** A estimativa: lê o período e faz as contas, sem chamar o provedor de resumo nem gravar nada. */
    async estimar(dto: GrupoResumoIaEstimarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoResumoIaEstimadoDto>> {
        const { grupo } = await this.grupoService.exigirMembroDoGrupo(dto.grupoId, usuarioAtivo);
        const periodo = await this.lerPeriodo(grupo, dto);
        const preparadas = prepararMensagens(periodo.mensagens, dto.enviaCodigo);
        const estimativa = estimarResumo(dividirEmBlocos(preparadas.linhas), await this.precoDoModeloRapido());
        return {
            sucesso: true,
            dados: { quantidadeMensagens: periodo.mensagens.length, ...estimativa, blocosDeCodigoOmitidos: preparadas.blocosDeCodigoOmitidos, enviaCodigo: dto.enviaCodigo },
            mensagem: 'Estimativa calculada com sucesso',
        };
    }

    /** Confirma e executa o resumo. O servidor refaz as contas (nunca confia na estimativa da tela) e recusa período vazio ou acima do teto. */
    async resumir(dto: GrupoResumoIaCriarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoResumoIaCriadoDto>> {
        const { grupo } = await this.grupoService.exigirMembroDoGrupo(dto.grupoId, usuarioAtivo);
        const estado = await this.iaService.obterEstado();
        if (estado !== EstadoIaEnum.NO_AR) throw new BusinessException(`Não dá para resumir agora: ${estado === EstadoIaEnum.DESLIGADA ? 'a IA está desligada' : 'a IA está fora do ar'}`);

        const periodo = await this.lerPeriodo(grupo, dto);
        if (periodo.mensagens.length === 0) throw new BusinessException('Não há mensagens neste período');
        const blocos = dividirEmBlocos(prepararMensagens(periodo.mensagens, dto.enviaCodigo).linhas);
        if (estimarResumo(blocos, null).acimaDoTeto) throw new BusinessException('O período é grande demais para resumir de uma vez: escolha um período menor');

        const uso = { tokensEntrada: 0, tokensSaida: 0, tokensCache: 0, modelo: '' };
        const somar = (resposta: IaResposta) => {
            uso.tokensEntrada += resposta.tokens.entrada;
            uso.tokensSaida += resposta.tokens.saida;
            uso.tokensCache += resposta.tokens.cache;
            uso.modelo = resposta.modelo;
        };
        let texto: string;
        try {
            const parciais: string[] = [];
            for (const bloco of blocos) {
                const resposta = await this.iaService.gerar({ nivel: NivelIaEnum.RAPIDO, instrucoes: INSTRUCOES_DO_RESUMO_DO_BLOCO, mensagens: [{ papel: 'usuario', conteudo: bloco }], maximoTokens: MAXIMO_DE_TOKENS_DO_BLOCO });
                somar(resposta);
                parciais.push(resposta.texto);
            }
            if (parciais.length === 1) {
                texto = parciais[0];
            } else {
                const fechamento = await this.iaService.gerar({
                    nivel: NivelIaEnum.RAPIDO,
                    instrucoes: INSTRUCOES_DO_FECHAMENTO_DO_RESUMO,
                    mensagens: [{ papel: 'usuario', conteudo: montarEntradaDoFechamento(parciais) }],
                    maximoTokens: MAXIMO_DE_TOKENS_DO_FECHAMENTO,
                });
                somar(fechamento);
                texto = fechamento.texto;
            }
        } catch (erro) {
            throw erro instanceof IaException ? traduzirFalhaDeIa(erro) : erro;
        } finally {
            // O que já foi gasto entra nos custos mesmo que uma chamada tenha falhado no meio.
            if (uso.modelo) {
                await this.iaUsoService.registrar({
                    usuarioId: usuarioAtivo.sub,
                    descricao: DESCRICAO_DO_USO,
                    nivel: NivelIaEnum.RAPIDO,
                    modelo: uso.modelo,
                    tokensEntrada: uso.tokensEntrada,
                    tokensSaida: uso.tokensSaida,
                    tokensCache: uso.tokensCache,
                    ...(grupo.demandaId !== null ? { demandaId: grupo.demandaId } : {}),
                });
            }
        }

        const registrado = await this.resumoRepositorio.criarResumo({
            grupoId: grupo.grupoId,
            usuarioId: usuarioAtivo.sub,
            inicioData: periodo.inicio,
            fimData: periodo.fim,
            enviouCodigo: dto.enviaCodigo,
            quantidadeMensagens: periodo.mensagens.length,
            modelo: uso.modelo,
            tokensEntrada: uso.tokensEntrada,
            tokensSaida: uso.tokensSaida,
        });
        return {
            sucesso: true,
            dados: {
                resumoId: registrado.resumoId,
                texto: fecharTextoDoResumo(texto),
                quantidadeMensagens: registrado.quantidadeMensagens,
                inicioData: registrado.inicioData,
                fimData: registrado.fimData,
                tokensEntrada: uso.tokensEntrada,
                tokensSaida: uso.tokensSaida,
            },
            mensagem: 'Resumo gerado com sucesso',
        };
    }

    /**
     * Cria a proposta de acrescentar o resumo ao fim da documentação da demanda. Só quem gerou o resumo o grava, uma vez, e só quem pode editar a demanda (as
     * mesmas regras do executor). Canal de demanda: a demanda do canal; canal de projeto: uma demanda **do projeto**, escolhida na tela; grupo livre: não grava.
     */
    async criarProposta(dto: GrupoResumoIaPropostaCriarDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoResumoIaPropostaCriadaDto>> {
        const { grupo } = await this.grupoService.exigirMembroDoGrupo(dto.grupoId, usuarioAtivo);
        const resumo = await this.exigirResumoDeQuemPediu(dto.resumoId, grupo.grupoId, usuarioAtivo);
        if (resumo.gravadaData) throw new BusinessException('Este resumo já foi gravado na documentação');

        const demandaId = this.demandaDeDestino(grupo, dto.demandaId);
        const demanda = await this.demandaRepositorio.recuperar({ id: demandaId });
        if (!demanda) throw new ResourceNotFoundException('Demanda');
        if (grupo.tipo === TipoGrupoEnum.PROJETO && demanda.projetoId !== grupo.projetoId) throw new BusinessException('A demanda escolhida não é deste projeto');
        if (!podeEditarDemanda(usuarioAtivo.tipo) && !(await this.demandaRepositorio.validarMembro({ demandaId, usuarioId: usuarioAtivo.sub }))) {
            throw new UnauthorizedAccessException('Você não pode editar esta demanda: o resumo só pode ser copiado');
        }

        const textoAcrescentado = montarBlocoDaDocumentacao(dto.texto, resumo.inicioData, resumo.fimData, new Date());
        const proposta = await this.propostaIaService.criar({ usuarioId: usuarioAtivo.sub, tipo: TipoPropostaIaEnum.ALTERAR_DEMANDA, dados: { demandaId, acrescentarDocumentacao: textoAcrescentado } });
        await this.resumoRepositorio.marcarProposta({ resumoId: resumo.resumoId, propostaIaId: proposta.id, demandaId });
        return { sucesso: true, dados: { propostaId: proposta.id, demandaId, demandaNome: demanda.nome, textoAcrescentado }, mensagem: 'Proposta criada com sucesso' };
    }

    /** Confirma a proposta (grava na documentação) e avisa o chat com a mensagem do sistema e o cartão da demanda. */
    async confirmarProposta(dto: GrupoResumoIaPropostaDecidirDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoResumoIaPropostaConfirmadaDto>> {
        const { grupo, membrosIds } = await this.grupoService.exigirMembroDoGrupo(dto.grupoId, usuarioAtivo);
        const resumo = await this.exigirPropostaDoResumo(dto, grupo, usuarioAtivo);
        if (resumo.gravadaData) throw new BusinessException('Este resumo já foi gravado na documentação');
        const demandaId = resumo.demandaId as number;

        await this.propostaIaService.confirmar(dto.propostaId, usuarioAtivo);
        await this.resumoRepositorio.marcarGravado({ resumoId: resumo.resumoId, gravadaData: new Date() });

        const nomeDaDemanda = (await this.demandaRepositorio.recuperar({ id: demandaId }))?.nome ?? `#${demandaId}`;
        await this.avisarGravacao(grupo, membrosIds, demandaId, `Resumo gravado na demanda “${nomeDaDemanda}” (${rotuloDoPeriodo(resumo.inicioData, resumo.fimData)})`);
        return { sucesso: true, dados: { resumoId: resumo.resumoId, demandaId }, mensagem: 'Resumo gravado na documentação' };
    }

    /** Recusa a proposta: nada é gravado e o resumo pode virar proposta de novo. */
    async recusarProposta(dto: GrupoResumoIaPropostaDecidirDto, usuarioAtivo: JwtPayload): Promise<StandardResponse<GrupoResumoIaPropostaRecusadaDto>> {
        const { grupo } = await this.grupoService.exigirMembroDoGrupo(dto.grupoId, usuarioAtivo);
        const resumo = await this.exigirPropostaDoResumo(dto, grupo, usuarioAtivo);
        await this.propostaIaService.recusar(dto.propostaId, usuarioAtivo);
        return { sucesso: true, dados: { resumoId: resumo.resumoId }, mensagem: 'Proposta recusada: nada foi gravado' };
    }

    // ---------------------------------------------------------------------------
    // Apoio
    // ---------------------------------------------------------------------------

    private destinoDoGrupo(grupo: GrupoRegistrado): GrupoResumoIaDestinoEnum {
        if (grupo.tipo === TipoGrupoEnum.DEMANDA) return GrupoResumoIaDestinoEnum.DEMANDA;
        if (grupo.tipo === TipoGrupoEnum.PROJETO) return GrupoResumoIaDestinoEnum.PROJETO;
        return GrupoResumoIaDestinoEnum.NENHUM;
    }

    private demandaDeDestino(grupo: GrupoRegistrado, escolhida: number | undefined): number {
        if (grupo.tipo === TipoGrupoEnum.DEMANDA && grupo.demandaId !== null) return grupo.demandaId;
        if (grupo.tipo === TipoGrupoEnum.PROJETO) {
            if (!escolhida) throw new BusinessException('Escolha a demanda do projeto em que o resumo será gravado');
            return escolhida;
        }
        throw new BusinessException('O resumo de um grupo livre só pode ser copiado');
    }

    private async exigirResumoDeQuemPediu(resumoId: number, grupoId: number, usuarioAtivo: JwtPayload) {
        const resumo = await this.resumoRepositorio.recuperarResumo({ resumoId, grupoId });
        if (!resumo) throw new ResourceNotFoundException('Resumo');
        if (resumo.usuarioId !== usuarioAtivo.sub) throw new UnauthorizedAccessException('Só quem gerou o resumo pode gravá-lo');
        return resumo;
    }

    private async exigirPropostaDoResumo(dto: GrupoResumoIaPropostaDecidirDto, grupo: GrupoRegistrado, usuarioAtivo: JwtPayload) {
        const resumo = await this.exigirResumoDeQuemPediu(dto.resumoId, grupo.grupoId, usuarioAtivo);
        if (resumo.propostaIaId !== dto.propostaId || resumo.demandaId === null) throw new BusinessException('Esta proposta não é a do resumo');
        return resumo;
    }

    /** Todas as mensagens de pessoa do período, da mais antiga para a mais nova (o armazenamento entrega da mais nova, em páginas). */
    private async lerPeriodo(grupo: GrupoRegistrado, dto: GrupoResumoIaEstimarDto): Promise<PeriodoLido> {
        const { inicio, fim } = lerPeriodoDoResumo(dto.inicioData, dto.fimData, new Date());
        const conversaId = montarConversaGrupoId(grupo.grupoId);
        const mensagens: MensagemParaResumo[] = [];
        let cursor: string | undefined;
        for (let pagina = 0; pagina < MAXIMO_DE_PAGINAS; pagina++) {
            const lida = await this.armazenamento.listarConversa({ conversaId, cursor, limite: LIMITE_MAXIMO_DA_CONVERSA_DIRETA });
            let passouDoInicio = false;
            for (const mensagem of lida.mensagens) {
                if (mensagem.createdDate.getTime() < inicio.getTime()) {
                    passouDoInicio = true;
                    break;
                }
                if (mensagem.createdDate.getTime() > fim.getTime() || mensagem.autor !== AutorMensagemDiretaEnum.USUARIO) continue;
                mensagens.push({ texto: mensagem.texto, createdDate: mensagem.createdDate });
            }
            if (passouDoInicio || !lida.proximoCursor) break;
            cursor = lida.proximoCursor;
        }
        return { mensagens: mensagens.reverse(), inicio, fim };
    }

    /** O preço do modelo principal do nível rápido, ou `null` se não há configuração ou preço (a estimativa então só mostra os tokens). */
    private async precoDoModeloRapido(): Promise<IaModeloPrecoDto | null> {
        try {
            const modelo = (await this.configuracaoIaService.obterAtiva()).cadeiaRapido[0]?.modelo;
            if (!modelo) return null;
            return (await this.configuracaoIaService.listarPrecos()).find((preco) => preco.modelo === modelo) ?? null;
        } catch (erro) {
            this.logger.warn(`Sem o preço do modelo para estimar o resumo: ${erro instanceof Error ? erro.message : String(erro)}`);
            return null;
        }
    }

    /** A mensagem do sistema com o cartão da demanda. Falhar aqui não desfaz a gravação, que já aconteceu. */
    private async avisarGravacao(grupo: GrupoRegistrado, membrosIds: number[], demandaId: number, texto: string): Promise<void> {
        try {
            const gravada = await this.armazenamento.gravar({
                mensagemId: randomUUID(),
                conversaId: montarConversaGrupoId(grupo.grupoId),
                autor: AutorMensagemDiretaEnum.SISTEMA,
                autorUsuarioId: null,
                texto,
                contemCodigo: false,
                mencoes: [],
                referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: demandaId }],
            });
            await this.eventosService.publicarParaUsuarios({ usuarioIds: membrosIds, evento: { tipo: 'MENSAGEM', mensagem: gravada.mensagem } });
        } catch (erro) {
            this.logger.warn(`Não foi possível avisar o chat ${grupo.grupoId} do resumo gravado: ${erro instanceof Error ? erro.message : String(erro)}`);
        }
    }
}
