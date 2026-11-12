import {
    AutorMensagemDiretaEnum,
    CitacaoMensagemDto,
    MensagemDiretaReferenciaRecuperadaDto,
    ReferenciaMensagemDiretaEnum,
    ReferenciaMensagemDto,
    temVisibilidadeTotal,
    trechoDaMensagemDireta,
} from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { AtividadeRepository } from '../../atividade/repositories/atividade.repository';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { ArmazenamentoDeMensagemDireta } from '../repositories/armazenamento-de-mensagem-direta';

/** O que o cartão mostra de uma referência a que **quem pergunta** tem acesso. */
export type ReferenciaResolvida = Omit<MensagemDiretaReferenciaRecuperadaDto, 'tipo' | 'id' | 'acessivel'>;

/**
 * A demanda ou a atividade existe e, para o desenvolvedor, é uma que ele mesmo vê (as mesmas regras de `DemandaService` e `AtividadeService`). Gestor e
 * administrador veem tudo. Devolve os dados do cartão, ou `null` quando não existe ou **quem pergunta** não tem acesso. Uma regra só, para o envio (quem
 * escreve) e o cartão (quem lê), na conversa um a um e no grupo.
 */
export async function resolverReferenciaDireta(
    repositorios: { demandaRepositorio: DemandaRepository; atividadeRepositorio: AtividadeRepository },
    referencia: ReferenciaMensagemDto,
    usuarioAtivo: JwtPayload,
): Promise<ReferenciaResolvida | null> {
    const { demandaRepositorio, atividadeRepositorio } = repositorios;
    const ehDesenvolvedor = !temVisibilidadeTotal(usuarioAtivo.tipo);
    if (referencia.tipo === ReferenciaMensagemDiretaEnum.DEMANDA) {
        const demanda = await demandaRepositorio.recuperar({ id: referencia.id }, ehDesenvolvedor ? { usuarioId: usuarioAtivo.sub } : undefined);
        return demanda ? { nome: demanda.nome, situacao: demanda.status, projetoId: demanda.projetoId, demandaId: null, demandaNome: null } : null;
    }

    const atividade = await atividadeRepositorio.recuperar({ id: referencia.id });
    if (!atividade) return null;
    if (ehDesenvolvedor && !(await atividadeRepositorio.validarAcessoDemanda({ demandaId: atividade.demandaId, usuarioId: usuarioAtivo.sub }))) return null;
    return { nome: atividade.nome, situacao: atividade.status, projetoId: atividade.projetoId, demandaId: atividade.demandaId, demandaNome: atividade.nomeDemanda };
}

/** Confere que **quem escreve** vê cada referência; senão recusa com a mensagem de sempre. */
export async function validarReferenciaDireta(
    repositorios: { demandaRepositorio: DemandaRepository; atividadeRepositorio: AtividadeRepository },
    referencia: ReferenciaMensagemDto,
    usuarioAtivo: JwtPayload,
): Promise<void> {
    if (await resolverReferenciaDireta(repositorios, referencia, usuarioAtivo)) return;
    const rotulo = referencia.tipo === ReferenciaMensagemDiretaEnum.DEMANDA ? 'A demanda' : 'A atividade';
    throw new BusinessException(`${rotulo} ${referencia.id} não existe ou você não tem acesso a ela`);
}

/**
 * A citação da resposta (task 220): autor e trecho saem da mensagem original, lida **nesta conversa**; o cliente só diz qual é. A mensagem do sistema
 * (aviso da supervisão, entrada no grupo) não é respondida.
 */
export async function montarCitacaoDireta(
    armazenamento: ArmazenamentoDeMensagemDireta,
    respondeAMensagemId: string | undefined,
    conversaId: string,
): Promise<CitacaoMensagemDto | null> {
    if (!respondeAMensagemId) return null;
    const original = await armazenamento.recuperarMensagem({ conversaId, mensagemId: respondeAMensagemId });
    if (!original || original.autor !== AutorMensagemDiretaEnum.USUARIO || original.autorUsuarioId === null) {
        throw new BusinessException('A mensagem respondida não existe nesta conversa');
    }
    return { mensagemId: original.mensagemId, autorUsuarioId: original.autorUsuarioId, trecho: trechoDaMensagemDireta(original.texto) };
}
