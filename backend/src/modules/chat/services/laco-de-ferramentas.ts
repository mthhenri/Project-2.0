import { ChatEventoDto, NivelIaEnum } from '@project20/shared';
import { JwtPayload } from '../../autenticacao/domain/interfaces/jwt-payload.interface';
import { OrigemDaFerramentaIa } from '../../ferramenta-ia/domain/ferramenta-ia';
import { FerramentaIaRegistro } from '../../ferramenta-ia/services/ferramenta-ia.registro';
import { IaBloco, IaFerramenta, IaMensagem } from '../../ia/domain/ia.tipos';
import { IaService } from '../../ia/services/ia.service';
import { separadorEntreVoltas } from '../domain/separador-entre-voltas';

/** Voltas de ferramenta por mensagem do usuário: cada volta é uma chamada ao modelo. */
export const MAXIMO_DE_VOLTAS = 8;

/** Um turno da IA com ferramentas: o que vai ao modelo e para onde vão os eventos. */
export interface TurnoComFerramentasPedido {
    usuarioAtivo: JwtPayload;
    nivel: NivelIaEnum;
    instrucoes: string;
    /** O contexto da conversa. O laço acrescenta as respostas e os resultados das ferramentas a esta mesma lista. */
    mensagens: IaMensagem[];
    /** O que já entra nas trocas do turno antes da primeira volta (a instrução de abertura ou de retomada do chat). */
    trocasIniciais: IaMensagem[];
    ferramentas: IaFerramenta[];
    maximoTokens: number;
    pesquisaWeb: boolean;
    origem: OrigemDaFerramentaIa;
    /** Recebe o id de cada proposta que as ferramentas criarem neste turno, na ordem. */
    propostasDoTurno: number[];
    /** Os eventos do turno (trecho, ferramenta, proposta); quem não transmite passa uma função vazia. */
    emitir: (evento: ChatEventoDto) => void;
}

export interface TurnoComFerramentasConcluido {
    /** O texto da resposta, com as voltas separadas por um parágrafo em branco. */
    texto: string;
    /** As trocas do turno (com as chamadas e os resultados das ferramentas), para guardar e remontar a conversa depois. */
    trocasDoTurno: IaMensagem[];
}

/**
 * O laço da IA com ferramentas, comum ao chat da IA (task 138) e ao `@IA` do chat entre colaboradores (task 315): transmite a resposta, executa as
 * ferramentas pedidas e volta ao modelo com os resultados, até `MAXIMO_DE_VOLTAS`. Não grava nada: quem conduz o turno grava a resposta onde ela mora.
 * As ferramentas de proposta só criam propostas (nada é feito sem confirmação, salvo a autonomia da task 228).
 */
export class LacoDeFerramentas {
    constructor(
        private readonly iaService: IaService,
        private readonly ferramentaIaRegistro: FerramentaIaRegistro,
    ) {}

    async conduzirTurno(pedido: TurnoComFerramentasPedido): Promise<TurnoComFerramentasConcluido> {
        const { mensagens, emitir } = pedido;
        const trocasDoTurno: IaMensagem[] = [...pedido.trocasIniciais];
        let texto = '';

        for (let volta = 1; volta <= MAXIMO_DE_VOLTAS; volta++) {
            // O texto de uma volta nova vem separado do anterior por um parágrafo em branco, tanto no que chega ao vivo quanto no gravado.
            const separador = separadorEntreVoltas(texto);
            let separadorEmitido = separador === '';
            const resposta = await this.iaService.transmitir(
                {
                    nivel: pedido.nivel,
                    instrucoes: pedido.instrucoes,
                    mensagens,
                    ferramentas: pedido.ferramentas,
                    maximoTokens: pedido.maximoTokens,
                    pesquisaWeb: pedido.pesquisaWeb,
                },
                (trecho) => {
                    if (trecho === '') return;
                    if (!separadorEmitido) {
                        emitir({ tipo: 'trecho', texto: separador });
                        separadorEmitido = true;
                    }
                    emitir({ tipo: 'trecho', texto: trecho });
                },
            );
            if (resposta.texto !== '') texto += separador + resposta.texto;

            const mensagemDaIa: IaMensagem = { papel: 'ia', conteudo: resposta.blocos };
            mensagens.push(mensagemDaIa);
            trocasDoTurno.push(mensagemDaIa);
            if (resposta.motivoParada !== 'uso_ferramenta') break;

            const resultados = await this.executarFerramentas(resposta.blocos, pedido);
            const mensagemDeResultados: IaMensagem = { papel: 'usuario', conteudo: resultados };
            mensagens.push(mensagemDeResultados);
            trocasDoTurno.push(mensagemDeResultados);

            if (volta === MAXIMO_DE_VOLTAS) throw new Error(`A IA passou de ${MAXIMO_DE_VOLTAS} voltas de ferramenta na mesma mensagem`);
        }
        return { texto, trocasDoTurno };
    }

    /** Executa os pedidos de ferramenta de uma volta, em ordem, e devolve os resultados no formato do contrato do provedor. */
    private async executarFerramentas(blocos: IaBloco[], pedido: TurnoComFerramentasPedido): Promise<IaBloco[]> {
        const { emitir } = pedido;
        const resultados: IaBloco[] = [];
        for (const bloco of blocos) {
            if (bloco.tipo !== 'uso_ferramenta') continue;
            emitir({ tipo: 'ferramenta', nome: bloco.nome, situacao: 'EXECUTANDO' });
            const resultado = await this.ferramentaIaRegistro.executar(bloco.nome, bloco.entrada, pedido.usuarioAtivo, pedido.origem);
            emitir({ tipo: 'ferramenta', nome: bloco.nome, situacao: resultado.erro ? 'ERRO' : 'CONCLUIDA' });
            if (resultado.propostaId !== undefined) {
                pedido.propostasDoTurno.push(resultado.propostaId);
                emitir({ tipo: 'proposta', propostaId: resultado.propostaId });
            }
            resultados.push({ tipo: 'resultado_ferramenta', usoId: bloco.id, conteudo: resultado.conteudo, erro: resultado.erro });
        }
        return resultados;
    }
}
