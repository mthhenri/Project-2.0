import { IaModeloListadoDto, modeloPertenceAoProvedor, TipoProvedorIaEnum } from '@project20/shared';

// Filtros dos modelos que cada provedor lista (spec 309). São funções puras sobre o formato mínimo que cada adaptador lê do SDK; o filtro é
// sempre seguido da regra de prefixo de `modeloPertenceAoProvedor`, a mesma que valida o que se grava na configuração. A lista de trechos
// excluídos é um ponto de partida: nenhum dos dois provedores informa a capacidade do modelo, então o `id` é o único sinal (ponto a confirmar
// com uma chamada real, P-075), e a tela mantém a opção "Outro modelo…" justamente porque este filtro é heurístico.

/** Trechos do `id` que indicam modelo de outra função na OpenAI (embeddings, voz, imagem, moderação, vídeo, pesquisa e tempo real). */
export const TRECHOS_DE_OUTRA_FUNCAO_NA_OPENAI: readonly string[] = [
    'embedding', 'whisper', 'tts', 'transcribe', 'audio', 'realtime', 'image', 'dall-e', 'moderation', 'sora', 'search',
];

/** O mesmo para o Google (embeddings, imagem, vídeo, voz e o `aqa`, de perguntas sobre fontes). */
export const TRECHOS_DE_OUTRA_FUNCAO_NO_GOOGLE: readonly string[] = ['embedding', 'imagen', 'veo', 'tts', 'image', 'aqa'];

/** A ação do Google que um modelo de texto precisa oferecer. */
export const ACAO_DE_TEXTO_DO_GOOGLE = 'generateContent';

export interface ModeloDaAnthropic {
    id: string;
    display_name?: string | null;
    lifecycle?: string | null;
    created_at?: string | null;
}

export interface ModeloDaOpenAi {
    id: string;
    created?: number | null;
    shutdown_date?: string | null;
}

export interface ModeloDoGoogle {
    name?: string | null;
    displayName?: string | null;
    supportedActions?: string[] | null;
}

const temTrecho = (id: string, trechos: readonly string[]): boolean => trechos.some((trecho) => id.toLowerCase().includes(trecho));

/** Do mais novo ao mais antigo pela data; quem não tem data (ou empata) fica por nome. */
function ordenar<T extends { id: string; nome: string }>(itens: Array<T & { data: number | null }>): IaModeloListadoDto[] {
    return [...itens]
        .sort((primeiro, segundo) => (segundo.data ?? -Infinity) - (primeiro.data ?? -Infinity) || primeiro.nome.localeCompare(segundo.nome) || primeiro.id.localeCompare(segundo.id))
        .map(({ id, nome }) => ({ id, nome }));
}

const emMilissegundos = (data: string | null | undefined): number | null => {
    const valor = data ? Date.parse(data) : Number.NaN;
    return Number.isNaN(valor) ? null : valor;
};

/** Só os modelos ativos (a API já pode filtrar por `lifecycle`; repetir aqui protege de uma resposta que traga os outros). Nome = `display_name`. */
export function filtrarModelosDaAnthropic(entradas: readonly ModeloDaAnthropic[]): IaModeloListadoDto[] {
    return ordenar(
        entradas
            .filter((modelo) => modelo.lifecycle === 'active' && modeloPertenceAoProvedor(TipoProvedorIaEnum.ANTHROPIC, modelo.id))
            .map((modelo) => ({ id: modelo.id, nome: modelo.display_name?.trim() || modelo.id, data: emMilissegundos(modelo.created_at) })),
    );
}

/** Prefixo, fora os de outra função e os que já foram desligados (`shutdown_date` no passado). A OpenAI não dá nome amigável: nome = `id`. */
export function filtrarModelosDaOpenAi(entradas: readonly ModeloDaOpenAi[], agora: Date = new Date()): IaModeloListadoDto[] {
    return ordenar(
        entradas
            .filter((modelo) => modeloPertenceAoProvedor(TipoProvedorIaEnum.OPENAI, modelo.id) && !temTrecho(modelo.id, TRECHOS_DE_OUTRA_FUNCAO_NA_OPENAI))
            .filter((modelo) => {
                const desligamento = emMilissegundos(modelo.shutdown_date);
                return desligamento === null || desligamento > agora.getTime();
            })
            .map((modelo) => ({ id: modelo.id, nome: modelo.id, data: modelo.created ? modelo.created * 1000 : null })),
    );
}

/** `generateContent` entre as ações, prefixo e sem os de outra função. O `id` é o `name` sem o `models/`; nome = `displayName`. Sem data: ordem por nome. */
export function filtrarModelosDoGoogle(entradas: readonly ModeloDoGoogle[]): IaModeloListadoDto[] {
    return ordenar(
        entradas.flatMap((modelo) => {
            const id = (modelo.name ?? '').replace(/^models\//, '');
            const geraTexto = (modelo.supportedActions ?? []).includes(ACAO_DE_TEXTO_DO_GOOGLE);
            if (!id || !geraTexto || !modeloPertenceAoProvedor(TipoProvedorIaEnum.GOOGLE, id) || temTrecho(id, TRECHOS_DE_OUTRA_FUNCAO_NO_GOOGLE)) return [];
            return [{ id, nome: modelo.displayName?.trim() || id, data: null }];
        }),
    );
}
