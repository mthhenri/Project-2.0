import {
    AutorMensagemDiretaEnum,
    CitacaoMensagemDto,
    LIMITE_TRECHO_MENSAGEM_DIRETA,
    MensagemDiretaResumoDto,
    ReferenciaMensagemDto,
    formatarReferenciaDireta,
    lerConversaDiretaId,
    lerReferenciaDireta,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';

/** A mensagem a gravar: o repository define só a data (`created_date`) e deriva os dois participantes do `conversaId`. */
export interface MensagemDiretaNova {
    /** UUID gerado pelo cliente; vira o `_id` do documento e dá idempotência ao reenvio. */
    mensagemId: string;
    /** `<menorUsuarioId>-<maiorUsuarioId>`. */
    conversaId: string;
    autor: AutorMensagemDiretaEnum;
    /** Quem escreveu; `null` quando o autor é o sistema. */
    autorUsuarioId: number | null;
    /** Markdown. */
    texto: string;
    contemCodigo: boolean;
    mencoes: number[];
    referencias: ReferenciaMensagemDto[];
    /** A mensagem respondida (task 220), já montada pela service a partir da original; `null` ou ausente quando não é resposta. */
    respondeA?: CitacaoMensagemDto | null;
    /** Só na resposta da IA (task 315): quem a chamou, participante da conversa. */
    chamadaPorUsuarioId?: number | null;
    /** Só na resposta da IA: as propostas do turno. */
    propostaIds?: number[];
}

/** A edição de uma mensagem própria (task 313): o texto novo e o que deriva dele; o resto da mensagem (data de envio, resposta, autor) não muda. */
export interface MensagemDiretaAlterar {
    mensagemId: string;
    conversaId: string;
    /** Quem edita: o armazenamento só altera a mensagem se ele for o autor. */
    autorUsuarioId: number;
    texto: string;
    contemCodigo: boolean;
    mencoes: number[];
    referencias: ReferenciaMensagemDto[];
}

/** Forma do documento no índice `mensagem-direta` (nomes da modelagem). */
export interface MensagemDiretaFonte {
    mensagem_id: string;
    conversa_id: string;
    /** Os dois ids da conversa, em ordem crescente. */
    participantes: number[];
    autor_usuario_id: number | null;
    autor: string;
    texto: string;
    contem_codigo: boolean;
    mencoes: number[];
    /** `DEMANDA:212`, `ATIVIDADE:57`. */
    referencias: string[];
    /** Os três campos da resposta (task 220) vêm juntos ou não vêm; documento anterior à task não os tem. */
    responde_a_mensagem_id?: string | null;
    responde_a_autor_usuario_id?: number | null;
    responde_a_trecho?: string | null;
    created_date: string;
    /** Quando o autor editou a mensagem pela última vez (task 313); ausente ou `null` quando nunca foi editada. */
    editada_date?: string | null;
    /** Na resposta da IA (task 315): quem a chamou. Documento anterior à task não tem o campo. */
    chamada_por_usuario_id?: number | null;
    /** Na resposta da IA: as propostas do turno. Ausente (documento anterior à task) é lido como vazio. */
    proposta_ids?: number[];
}

export const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Confere que o documento a gravar é coerente. A service valida o pedido do usuário; isto é a defesa do armazenamento, para nunca
 * gravar uma mensagem que os leitores (que filtram por `participantes` e `autor_usuario_id`) interpretariam errado.
 */
export function validarMensagemDiretaNova(mensagem: MensagemDiretaNova): void {
    const participantes = lerConversaDiretaId(mensagem.conversaId);
    if (!participantes) throw new BusinessException('Conversa direta inválida');
    if (!REGEX_UUID.test(mensagem.mensagemId)) throw new BusinessException('O identificador da mensagem deve ser um UUID');
    if (!mensagem.texto || !mensagem.texto.trim()) throw new BusinessException('A mensagem não pode ser vazia');

    if (mensagem.autor === AutorMensagemDiretaEnum.USUARIO) {
        const participa = mensagem.autorUsuarioId === participantes.usuarioMenorId || mensagem.autorUsuarioId === participantes.usuarioMaiorId;
        if (!participa) throw new BusinessException('Quem escreve a mensagem precisa participar da conversa');
    } else if (mensagem.autorUsuarioId !== null) {
        throw new BusinessException('A mensagem do sistema não tem autor');
    }

    const chamadaPor = mensagem.chamadaPorUsuarioId ?? null;
    const propostaIds = mensagem.propostaIds ?? [];
    if (mensagem.autor === AutorMensagemDiretaEnum.IA) {
        const participa = chamadaPor === participantes.usuarioMenorId || chamadaPor === participantes.usuarioMaiorId;
        if (!participa) throw new BusinessException('A resposta da IA precisa de quem a chamou, participante da conversa');
        if (!propostaIds.every((propostaId) => Number.isInteger(propostaId) && propostaId >= 1)) throw new BusinessException('Proposta inválida na resposta da IA');
    } else if (chamadaPor !== null || propostaIds.length > 0) {
        throw new BusinessException('Só a resposta da IA tem quem a chamou e propostas');
    }

    const respondeA = mensagem.respondeA;
    if (respondeA) {
        if (!REGEX_UUID.test(respondeA.mensagemId)) throw new BusinessException('O identificador da mensagem respondida deve ser um UUID');
        if (respondeA.mensagemId.toLowerCase() === mensagem.mensagemId.toLowerCase()) throw new BusinessException('A mensagem não pode responder a ela mesma');
        if (!Number.isInteger(respondeA.autorUsuarioId) || respondeA.autorUsuarioId < 1) throw new BusinessException('A mensagem respondida precisa de um autor');
        if (!respondeA.trecho || !respondeA.trecho.trim() || respondeA.trecho.length > LIMITE_TRECHO_MENSAGEM_DIRETA) {
            throw new BusinessException(`O trecho da resposta deve ter de 1 a ${LIMITE_TRECHO_MENSAGEM_DIRETA} caracteres`);
        }
    }
}

/** Defesa do armazenamento para a edição (a service valida o pedido): conversa e id válidos e texto não vazio. */
export function validarMensagemDiretaAlterar(alteracao: MensagemDiretaAlterar): void {
    if (!lerConversaDiretaId(alteracao.conversaId)) throw new BusinessException('Conversa direta inválida');
    if (!REGEX_UUID.test(alteracao.mensagemId)) throw new BusinessException('O identificador da mensagem deve ser um UUID');
    if (!Number.isInteger(alteracao.autorUsuarioId) || alteracao.autorUsuarioId < 1) throw new BusinessException('Quem edita a mensagem precisa ser um usuário');
    if (!alteracao.texto || !alteracao.texto.trim()) throw new BusinessException('A mensagem não pode ficar vazia');
}

/** Os campos do documento que a edição troca. A data de envio, a resposta e o autor ficam como estavam. */
export function paraCamposDeEdicao(alteracao: MensagemDiretaAlterar, editadaEm: Date): Pick<MensagemDiretaFonte, 'texto' | 'contem_codigo' | 'mencoes' | 'referencias' | 'editada_date'> {
    return {
        texto: alteracao.texto,
        contem_codigo: alteracao.contemCodigo,
        mencoes: alteracao.mencoes,
        referencias: alteracao.referencias.map(formatarReferenciaDireta),
        editada_date: editadaEm.toISOString(),
    };
}

/** O reenvio de um `mensagemId` só devolve o que já estava gravado se for o mesmo autor, na mesma conversa; senão vazaria a mensagem de outra pessoa. */
export function mesmaOrigemDaMensagem(existente: Pick<MensagemDiretaFonte, 'conversa_id' | 'autor' | 'autor_usuario_id'>, mensagem: MensagemDiretaNova): boolean {
    return existente.conversa_id === mensagem.conversaId && existente.autor === mensagem.autor && (existente.autor_usuario_id ?? null) === mensagem.autorUsuarioId;
}

export function paraFonteDireta(mensagem: MensagemDiretaNova, criadaEm: Date): MensagemDiretaFonte {
    const participantes = lerConversaDiretaId(mensagem.conversaId);
    if (!participantes) throw new BusinessException('Conversa direta inválida');
    return {
        mensagem_id: mensagem.mensagemId,
        conversa_id: mensagem.conversaId,
        participantes: [participantes.usuarioMenorId, participantes.usuarioMaiorId],
        autor_usuario_id: mensagem.autorUsuarioId,
        autor: mensagem.autor,
        texto: mensagem.texto,
        contem_codigo: mensagem.contemCodigo,
        mencoes: mensagem.mencoes,
        referencias: mensagem.referencias.map(formatarReferenciaDireta),
        ...(mensagem.respondeA
            ? {
                responde_a_mensagem_id: mensagem.respondeA.mensagemId.toLowerCase(),
                responde_a_autor_usuario_id: mensagem.respondeA.autorUsuarioId,
                responde_a_trecho: mensagem.respondeA.trecho,
            }
            : {}),
        ...(mensagem.autor === AutorMensagemDiretaEnum.IA ? { chamada_por_usuario_id: mensagem.chamadaPorUsuarioId ?? null, proposta_ids: mensagem.propostaIds ?? [] } : {}),
        created_date: criadaEm.toISOString(),
    };
}

export function deFonteDireta(fonte: MensagemDiretaFonte): MensagemDiretaResumoDto {
    return {
        mensagemId: fonte.mensagem_id,
        conversaId: fonte.conversa_id,
        autor: fonte.autor as AutorMensagemDiretaEnum,
        autorUsuarioId: fonte.autor_usuario_id ?? null,
        texto: fonte.texto,
        contemCodigo: fonte.contem_codigo,
        mencoes: fonte.mencoes ?? [],
        referencias: (fonte.referencias ?? []).flatMap((texto) => {
            const referencia = lerReferenciaDireta(texto);
            return referencia ? [referencia] : [];
        }),
        respondeA:
      fonte.responde_a_mensagem_id && fonte.responde_a_autor_usuario_id && fonte.responde_a_trecho
          ? { mensagemId: fonte.responde_a_mensagem_id, autorUsuarioId: fonte.responde_a_autor_usuario_id, trecho: fonte.responde_a_trecho }
          : null,
        createdDate: new Date(fonte.created_date),
        editadaDate: fonte.editada_date ? new Date(fonte.editada_date) : null,
        // As reações vêm da tabela `mensagem_direta_reacao`: quem junta é a service.
        reacoes: [],
        chamadaPorUsuarioId: fonte.chamada_por_usuario_id ?? null,
        propostaIds: fonte.proposta_ids ?? [],
    };
}
