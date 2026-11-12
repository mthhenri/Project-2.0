import { IaModeloPrecoDto, LINHA_DE_RESUMO_POR_IA, MAXIMO_DE_CHAMADAS_POR_RESUMO, TRECHO_DE_CODIGO_OMITIDO, contemBlocoDeCodigo } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { calcularCustoDolar } from '../../ia-custo/domain/calculo-de-custo';

/**
 * Regras puras do resumo de grupo e canal com a IA (task 249): o que sai do servidor (código omitido, sem nome de autor), a divisão em blocos que cobre o
 * período inteiro, as instruções, a estimativa e o texto que vai para a documentação. Ficam fora da service para serem testadas sem dublê.
 */

/** O tamanho máximo, em caracteres, do texto de um bloco enviado ao provedor (cerca de 3 mil tokens: cabe com folga em qualquer modelo do nível rápido). */
export const LIMITE_DE_CARACTERES_DO_BLOCO = 12_000;
/** O que cada chamada gasta além das mensagens: as instruções. */
const TOKENS_DAS_INSTRUCOES = 250;
/** O teto de tokens do resumo de um bloco e do fechamento (também a estimativa de saída de cada chamada). */
export const MAXIMO_DE_TOKENS_DO_BLOCO = 900;
export const MAXIMO_DE_TOKENS_DO_FECHAMENTO = 1500;
const CARACTERES_POR_TOKEN = 4;

export const INSTRUCOES_DO_RESUMO_DO_BLOCO = [
    'Você resume conversas de uma equipe de desenvolvimento de software, em português do Brasil.',
    'Escreva o resumo em Markdown, em tópicos curtos: decisões tomadas, pendências e dúvidas em aberto, o que ficou combinado e por quem fica claro só se não houver nome.',
    'Não cite nomes de pessoas nem autores das mensagens: use "a equipe" ou "alguém". Não invente nada que não esteja na conversa.',
    `Trechos marcados com ${TRECHO_DE_CODIGO_OMITIDO} foram retirados de propósito: não tente adivinhar o que diziam.`,
    'Responda só com o resumo, sem introdução nem conclusão.',
].join('\n');

export const INSTRUCOES_DO_FECHAMENTO_DO_RESUMO = [
    'Você recebe resumos parciais, em ordem, de uma mesma conversa de uma equipe de desenvolvimento, e os junta num único resumo, em português do Brasil.',
    'Escreva em Markdown, em tópicos curtos, sem repetir o que aparece em mais de um resumo parcial e sem inventar nada.',
    'Não cite nomes de pessoas nem autores: use "a equipe" ou "alguém". Responda só com o resumo.',
].join('\n');

/** Uma mensagem de pessoa do período, como o armazenamento a entrega. */
export interface MensagemParaResumo {
    texto: string;
    createdDate: Date;
}

export interface MensagensPreparadas {
    /** Uma entrada por mensagem, em ordem, sem autor, com a hora; o código já trocado quando a pessoa não o envia. */
    linhas: string[];
    blocosDeCodigoOmitidos: number;
}

const BLOCO_CERCADO = /(^|\n)[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(\n[ \t]*\2[ \t]*(?=\n|$)|$)/g;

/** Troca cada bloco de código cercado (e, por segurança, a mensagem inteira se ainda sobrar bloco de código de outro jeito) por `[trecho de código omitido]`. */
export function omitirCodigo(texto: string): { texto: string; omitidos: number } {
    let omitidos = 0;
    const semCercados = texto.replace(BLOCO_CERCADO, (_trecho, inicio: string) => {
        omitidos++;
        return `${inicio}${TRECHO_DE_CODIGO_OMITIDO}`;
    });
    if (contemBlocoDeCodigo(semCercados)) return { texto: TRECHO_DE_CODIGO_OMITIDO, omitidos: omitidos + 1 };
    return { texto: semCercados, omitidos };
}

const formatarDiaEHora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const formatarHora = { format: (data: Date): string => formatarDiaEHora.format(data).replace(',', '') };

/** As mensagens como linhas do prompt: só o texto e a hora (nunca o autor). Com `enviaCodigo` falso, o código sai daqui, antes de qualquer envio. */
export function prepararMensagens(mensagens: MensagemParaResumo[], enviaCodigo: boolean): MensagensPreparadas {
    let blocosDeCodigoOmitidos = 0;
    const linhas = mensagens
        .map((mensagem) => {
            let conteudo = mensagem.texto;
            if (!enviaCodigo) {
                const sem = omitirCodigo(conteudo);
                conteudo = sem.texto;
                blocosDeCodigoOmitidos += sem.omitidos;
            }
            return `(${formatarHora.format(mensagem.createdDate)}) ${conteudo.trim().replace(/\n/g, '\n  ')}`;
        })
        .filter((linha) => linha.length > 0);
    return { linhas, blocosDeCodigoOmitidos };
}

/** Parte uma linha maior que o limite em pedaços do tamanho do limite, sem perder nenhum caractere. */
function partirLinha(linha: string, limite: number): string[] {
    if (linha.length <= limite) return [linha];
    const pedacos: string[] = [];
    for (let inicio = 0; inicio < linha.length; inicio += limite) pedacos.push(linha.slice(inicio, inicio + limite));
    return pedacos;
}

/**
 * Divide as linhas em blocos de até `limite` caracteres, sem reordenar e **sem perder** nenhuma: juntar os blocos devolve todas as linhas (uma linha maior
 * que o limite é partida). Sem linhas, não há bloco.
 */
export function dividirEmBlocos(linhas: string[], limite = LIMITE_DE_CARACTERES_DO_BLOCO): string[] {
    const blocos: string[] = [];
    let atual: string[] = [];
    let tamanho = 0;
    for (const pedaco of linhas.flatMap((linha) => partirLinha(linha, limite))) {
        if (atual.length > 0 && tamanho + pedaco.length + 1 > limite) {
            blocos.push(atual.join('\n'));
            atual = [];
            tamanho = 0;
        }
        atual.push(pedaco);
        tamanho += pedaco.length + 1;
    }
    if (atual.length > 0) blocos.push(atual.join('\n'));
    return blocos;
}

export function estimarTokens(texto: string): number {
    return Math.ceil(texto.length / CARACTERES_POR_TOKEN);
}

export interface EstimativaDoResumo {
    quantidadeBlocos: number;
    quantidadeChamadas: number;
    tokensEntradaEstimados: number;
    tokensSaidaEstimados: number;
    custoEstimadoDolar: number | null;
    acimaDoTeto: boolean;
}

/** A conta antes de chamar o provedor: cada bloco é uma chamada e, com mais de um, há uma última para fechar (entra o texto estimado dos resumos parciais). */
export function estimarResumo(blocos: string[], preco: IaModeloPrecoDto | null): EstimativaDoResumo {
    const quantidadeBlocos = blocos.length;
    const comFechamento = quantidadeBlocos > 1;
    const quantidadeChamadas = quantidadeBlocos + (comFechamento ? 1 : 0);
    const tokensEntradaDosBlocos = blocos.reduce((total, bloco) => total + estimarTokens(bloco) + TOKENS_DAS_INSTRUCOES, 0);
    const tokensSaidaDosBlocos = quantidadeBlocos * MAXIMO_DE_TOKENS_DO_BLOCO;
    const tokensEntradaEstimados = tokensEntradaDosBlocos + (comFechamento ? tokensSaidaDosBlocos + TOKENS_DAS_INSTRUCOES : 0);
    const tokensSaidaEstimados = tokensSaidaDosBlocos + (comFechamento ? MAXIMO_DE_TOKENS_DO_FECHAMENTO : 0);
    return {
        quantidadeBlocos,
        quantidadeChamadas,
        tokensEntradaEstimados,
        tokensSaidaEstimados,
        custoEstimadoDolar: preco ? calcularCustoDolar({ tokensEntrada: tokensEntradaEstimados, tokensSaida: tokensSaidaEstimados, tokensCache: 0 }, preco) : null,
        acimaDoTeto: quantidadeChamadas > MAXIMO_DE_CHAMADAS_POR_RESUMO,
    };
}

/** O texto do fechamento: os resumos parciais em ordem, numerados só para a IA ver a sequência. */
export function montarEntradaDoFechamento(resumosParciais: string[]): string {
    return resumosParciais.map((resumo, indice) => `Resumo parcial ${indice + 1}:\n${resumo.trim()}`).join('\n\n');
}

/** O resumo final: o texto da IA sem a linha de IA que ela eventualmente escreveu, mais a linha única do sistema. */
export function fecharTextoDoResumo(texto: string): string {
    const limpo = texto.trim().split(LINHA_DE_RESUMO_POR_IA).join('').trim();
    return `${limpo}\n\n${LINHA_DE_RESUMO_POR_IA}`;
}

const formatarDia = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });

export function rotuloDoPeriodo(inicio: Date, fim: Date): string {
    const primeiro = formatarDia.format(inicio);
    const ultimo = formatarDia.format(fim);
    return primeiro === ultimo ? primeiro : `${primeiro} a ${ultimo}`;
}

/** O que a proposta acrescenta ao fim da documentação: o título com o período e a data de hoje, e o texto do resumo. */
export function montarBlocoDaDocumentacao(texto: string, inicio: Date, fim: Date, geradoEm: Date): string {
    return `## Resumo do chat (${rotuloDoPeriodo(inicio, fim)})\n\n_Gravado em ${formatarDia.format(geradoEm)}._\n\n${texto.trim()}`;
}

/** O período pedido: as duas datas existem, o fim não é anterior ao início e o fim não passa de agora (um resumo do futuro não tem o que resumir). */
export function lerPeriodoDoResumo(inicioData: string, fimData: string, agora: Date): { inicio: Date; fim: Date } {
    const inicio = new Date(inicioData);
    const fim = new Date(fimData);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) throw new BusinessException('Período inválido');
    if (fim.getTime() < inicio.getTime()) throw new BusinessException('O fim do período não pode ser anterior ao início');
    return { inicio, fim: fim.getTime() > agora.getTime() ? agora : fim };
}
