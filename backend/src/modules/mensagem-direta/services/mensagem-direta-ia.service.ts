import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
    AutorMensagemDiretaEnum,
    ContextoChatEnum,
    EstadoIaEnum,
    JANELA_DE_CONTEXTO_DA_IA_NO_CHAT_DIRETO,
    MensagemDiretaResumoDto,
    NivelIaEnum,
    TipoPromptEnum,
    TipoUsuarioEnum,
    chamadaDaIa,
    outroParticipanteDaConversaDireta,
    pedidoPendenteDaIa,
} from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { LacoDeFerramentas } from '../../chat/services/laco-de-ferramentas';
import { MAXIMO_TOKENS_DO_CHAT } from '../../chat/services/chat.service';
import { FerramentaIaRegistro } from '../../ferramenta-ia/services/ferramenta-ia.registro';
import { IaException } from '../../ia/domain/ia.exception';
import { executarNoTurno, TurnoIa } from '../../ia/domain/turno-ia';
import { IaService } from '../../ia/services/ia.service';
import { IaUsoService } from '../../ia-custo/services/ia-uso.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { UsuarioRepository } from '../../usuario/repositories/usuario.repository';
import { montarContextoDoChatDireto, montarOrientacaoDoChatDireto, PessoaDaConversaComIa, textoDaRespostaDaIa } from '../domain/mensagem-direta-ia';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, ArmazenamentoDeMensagemDireta } from '../repositories/armazenamento-de-mensagem-direta';
import { MensagemDiretaEventosService } from './mensagem-direta-eventos.service';

/** O que a service do envio entrega depois de gravar uma mensagem de pessoa: a mensagem como ficou gravada e quem a escreveu. */
export interface MensagemDiretaIaAvaliar {
    mensagem: MensagemDiretaResumoDto;
    usuarioAtivo: JwtPayload;
}

const MOTIVO_GENERICO = 'o serviço de IA está temporariamente indisponível';
const DESCRICAO_DO_USO = '@IA no chat entre colaboradores';

/**
 * O `@IA` do chat entre colaboradores (task 315). Depois de a mensagem de uma pessoa ser gravada e publicada, decide se ela chama a IA (pela regra pura do
 * `shared`: `@IA` com pedido, ou a mensagem seguinte a um `@IA` sozinho, em até 10 minutos) e, se chama, conduz o turno **fora da requisição**: lê as
 * últimas mensagens das duas pessoas, chama a IA com as ferramentas e as permissões de **quem chamou** (o laço do chat da IA) e grava a resposta como
 * mensagem de autor `IA`, publicada às duas pontas. O custo vai para a aba Custos em nome de quem chamou. Toda falha termina numa mensagem do sistema,
 * nunca numa exceção solta.
 */
@Injectable()
export class MensagemDiretaIaService {
    private readonly logger = new Logger(MensagemDiretaIaService.name);
    /** Conversas com uma chamada em andamento nesta instância: um segundo `@IA` na mesma conversa espera a primeira terminar. */
    private readonly emAndamento = new Set<string>();
    private readonly lacoDeFerramentas: LacoDeFerramentas;

    constructor(
        @Inject(ARMAZENAMENTO_DE_MENSAGEM_DIRETA) private readonly armazenamento: ArmazenamentoDeMensagemDireta,
        private readonly eventosService: MensagemDiretaEventosService,
        private readonly usuarioRepositorio: UsuarioRepository,
        private readonly iaService: IaService,
        private readonly ferramentaIaRegistro: FerramentaIaRegistro,
        private readonly promptService: PromptService,
        private readonly propostaIaService: PropostaIaService,
        private readonly iaUsoService: IaUsoService,
    ) {
        this.lacoDeFerramentas = new LacoDeFerramentas(iaService, ferramentaIaRegistro);
    }

    /**
     * Se a mensagem chama a IA, conduz o turno. Devolve a promessa do turno (os testes a esperam); quem envia a mensagem não espera: a resposta do
     * `POST mensagem` sai antes. Nunca rejeita.
     */
    async atenderSeChamada(dto: MensagemDiretaIaAvaliar): Promise<void> {
        try {
            const pedido = await this.pedidoDaMensagem(dto);
            if (pedido === null) return;
            await this.atender(dto, pedido);
        } catch (erro) {
            this.logger.error(`Falha ao avaliar o @IA da conversa ${dto.mensagem.conversaId}: ${erro instanceof Error ? erro.message : String(erro)}`);
        }
    }

    /** O pedido que esta mensagem faz à IA, ou `null` quando ela não chama (ou é um `@IA` sozinho, que espera a próxima mensagem). */
    private async pedidoDaMensagem(dto: MensagemDiretaIaAvaliar): Promise<string | null> {
        const { mensagem, usuarioAtivo } = dto;
        const chamada = chamadaDaIa(mensagem.texto);
        if (chamada) return chamada.pedido === '' ? null : chamada.pedido;
        const anteriores = (await this.lerAnteriores(mensagem)).filter((anterior) => anterior.mensagemId !== mensagem.mensagemId);
        return pedidoPendenteDaIa(anteriores, usuarioAtivo.sub, new Date()) ? mensagem.texto : null;
    }

    private async atender(dto: MensagemDiretaIaAvaliar, pedido: string): Promise<void> {
        const { mensagem, usuarioAtivo } = dto;
        const conversaId = mensagem.conversaId;
        const outroUsuarioId = outroParticipanteDaConversaDireta(conversaId, usuarioAtivo.sub);
        if (outroUsuarioId === null) return;
        const participantes = [usuarioAtivo.sub, outroUsuarioId];

        if (this.emAndamento.has(conversaId)) {
            await this.gravarDoSistema(conversaId, participantes, 'A IA ainda está respondendo a outra chamada nesta conversa. Chame de novo quando ela terminar.');
            return;
        }
        this.emAndamento.add(conversaId);
        const propostasDoTurno: number[] = [];
        const turno = new TurnoIa();
        try {
            const estado = await this.iaService.obterEstado();
            if (estado !== EstadoIaEnum.NO_AR) {
                await this.gravarDoSistema(conversaId, participantes, `A IA não pôde responder: ${estado === EstadoIaEnum.DESLIGADA ? 'a IA está desligada' : 'a IA está fora do ar'}.`);
                return;
            }
            await this.eventosService.publicarParaUsuarios({ usuarioIds: participantes, evento: { tipo: 'IA_DIGITANDO', conversaId } });

            const [quemChamou, outraPessoa] = await Promise.all([this.lerPessoa(usuarioAtivo.sub, usuarioAtivo.tipo), this.lerPessoa(outroUsuarioId, null)]);
            const nomes = new Map<number, string>([
                [quemChamou.usuarioId, quemChamou.nome],
                [outraPessoa.usuarioId, outraPessoa.nome],
            ]);
            const anteriores = (await this.lerAnteriores(mensagem)).filter((anterior) => anterior.mensagemId !== mensagem.mensagemId);
            const citada = mensagem.respondeA && !anteriores.slice(-JANELA_DE_CONTEXTO_DA_IA_NO_CHAT_DIRETO).some((anterior) => anterior.mensagemId === mensagem.respondeA!.mensagemId)
                ? { autorNome: nomes.get(mensagem.respondeA.autorUsuarioId) ?? 'Alguém', trecho: mensagem.respondeA.trecho }
                : null;
            const contexto = montarContextoDoChatDireto(anteriores, { texto: pedido, citacao: citada }, quemChamou, nomes);
            const prompt = await this.promptService.obterAtivo(TipoPromptEnum.CONVERSA);

            const { texto } = await executarNoTurno(turno, () =>
                this.lacoDeFerramentas.conduzirTurno({
                    usuarioAtivo,
                    nivel: NivelIaEnum.RAPIDO,
                    instrucoes: `${prompt.conteudo}\n\n${montarOrientacaoDoChatDireto(quemChamou, outraPessoa)}`,
                    mensagens: [{ papel: 'usuario', conteudo: contexto }],
                    trocasIniciais: [],
                    ferramentas: this.ferramentaIaRegistro.listarParaUsuario(usuarioAtivo),
                    maximoTokens: MAXIMO_TOKENS_DO_CHAT,
                    pesquisaWeb: false,
                    // As ferramentas tratam o `@IA` como o chat da IA (nada nelas depende de ser o chat entre colaboradores).
                    origem: { contexto: ContextoChatEnum.CHAT },
                    propostasDoTurno,
                    // A resposta chega inteira no fim (sem streaming no chat entre colaboradores): os eventos do turno não vão a lugar nenhum.
                    emitir: () => undefined,
                }),
            );

            const gravada = await this.armazenamento.gravar({
                mensagemId: randomUUID(),
                conversaId,
                autor: AutorMensagemDiretaEnum.IA,
                autorUsuarioId: null,
                texto: textoDaRespostaDaIa(texto, propostasDoTurno.length),
                contemCodigo: false,
                mencoes: [],
                referencias: [],
                chamadaPorUsuarioId: usuarioAtivo.sub,
                propostaIds: propostasDoTurno,
            });
            await this.eventosService.publicarParaUsuarios({ usuarioIds: participantes, evento: { tipo: 'MENSAGEM', mensagem: gravada.mensagem } });
        } catch (erro) {
            const motivo = erro instanceof IaException ? erro.mensagem : MOTIVO_GENERICO;
            if (!(erro instanceof IaException)) this.logger.error(`Falha no @IA da conversa ${conversaId}: ${erro instanceof Error ? erro.message : String(erro)}`);
            // Nenhuma proposta fica pendente sem a resposta que a explicava (como no chat da IA).
            for (const propostaId of propostasDoTurno) await this.propostaIaService.recusar(propostaId, usuarioAtivo).catch(() => undefined);
            await this.gravarDoSistema(conversaId, participantes, `A IA não pôde responder: ${motivo.charAt(0).toLowerCase()}${motivo.slice(1).replace(/\.$/, '')}.`);
        } finally {
            this.emAndamento.delete(conversaId);
            await this.registrarUso(turno, usuarioAtivo);
        }
    }

    /** As mensagens antes da nova, da mais antiga para a mais nova: a janela do contexto mais a própria mensagem (o armazenamento devolve da mais nova). */
    private async lerAnteriores(mensagem: MensagemDiretaResumoDto): Promise<MensagemDiretaResumoDto[]> {
        const pagina = await this.armazenamento.listarConversa({ conversaId: mensagem.conversaId, limite: JANELA_DE_CONTEXTO_DA_IA_NO_CHAT_DIRETO + 1 });
        return [...pagina.mensagens].reverse();
    }

    /** O nome e o tipo de agora; quem foi excluído continua na conversa como "Usuário removido". */
    private async lerPessoa(usuarioId: number, tipoDoToken: TipoUsuarioEnum | null): Promise<PessoaDaConversaComIa> {
        const usuario = await this.usuarioRepositorio.recuperar({ id: usuarioId });
        return { usuarioId, nome: usuario?.nomeCompleto ?? 'Usuário removido', tipo: (usuario?.tipo as TipoUsuarioEnum | undefined) ?? tipoDoToken ?? TipoUsuarioEnum.DESENVOLVEDOR };
    }

    private async gravarDoSistema(conversaId: string, participantes: number[], texto: string): Promise<void> {
        try {
            const gravada = await this.armazenamento.gravar({ mensagemId: randomUUID(), conversaId, autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null, texto, contemCodigo: false, mencoes: [], referencias: [] });
            await this.eventosService.publicarParaUsuarios({ usuarioIds: participantes, evento: { tipo: 'MENSAGEM', mensagem: gravada.mensagem } });
        } catch (erro) {
            this.logger.error(`Não foi possível avisar a falha do @IA na conversa ${conversaId}: ${erro instanceof Error ? erro.message : String(erro)}`);
        }
    }

    /** O custo do turno, em nome de quem chamou; só quando houve chamada ao provedor (o turno tem modelo). */
    private async registrarUso(turno: TurnoIa, usuarioAtivo: JwtPayload): Promise<void> {
        if (!turno.modelo) return;
        const tokens = turno.tokens;
        await this.iaUsoService.registrar({
            usuarioId: usuarioAtivo.sub,
            descricao: DESCRICAO_DO_USO,
            nivel: turno.nivel,
            modelo: turno.modelo,
            tokensEntrada: tokens.entrada,
            tokensSaida: tokens.saida,
            tokensCache: tokens.cache,
        });
    }
}
