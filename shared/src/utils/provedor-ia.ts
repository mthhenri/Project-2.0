import { ConfiguracaoIaCadeiaItemDto } from '../dtos/configuracao-ia/ConfiguracaoIaCadeiaItemDto';
import { EsforcoIaEnum } from '../enums/esforco-ia.enum';
import { NivelIaEnum } from '../enums/nivel-ia.enum';
import { TipoProvedorIaEnum } from '../enums/tipo-provedor-ia.enum';

/** Como o nome de um modelo começa em cada provedor. O nome é texto livre na configuração, então este é o único vínculo modelo → provedor. */
const PADRAO_DE_MODELO: Record<TipoProvedorIaEnum, RegExp> = {
    [TipoProvedorIaEnum.ANTHROPIC]: /^claude-/,
    [TipoProvedorIaEnum.GOOGLE]: /^(gemini|gemma)-/,
    [TipoProvedorIaEnum.OPENAI]: /^(gpt-|chatgpt-|o\d)/,
};

const ROTULO_DO_PROVEDOR: Record<TipoProvedorIaEnum, string> = {
    [TipoProvedorIaEnum.ANTHROPIC]: 'Anthropic',
    [TipoProvedorIaEnum.GOOGLE]: 'Google',
    [TipoProvedorIaEnum.OPENAI]: 'OpenAI',
};

const ROTULO_DO_NIVEL: Record<NivelIaEnum, string> = {
    [NivelIaEnum.RAPIDO]: 'rápido',
    [NivelIaEnum.PADRAO]: 'padrão',
    [NivelIaEnum.ANALITICO]: 'analítico',
};

const TAMANHO_MAXIMO_DO_MODELO = 100;

/** O modelo é do provedor? (`claude-*` é da Anthropic, `gemini-*` do Google, `gpt-*` e `o1`/`o3`... da OpenAI.) */
export function modeloPertenceAoProvedor(provedor: TipoProvedorIaEnum, modelo: string): boolean {
    return PADRAO_DE_MODELO[provedor].test(modelo.trim().toLowerCase());
}

/** O que a regra de coerência lê da configuração (a criação e a versão gravada têm esta forma): uma cadeia por nível. */
export interface CadeiasDaConfiguracaoIa {
    cadeiaRapido: ConfiguracaoIaCadeiaItemDto[];
    cadeiaPadrao: ConfiguracaoIaCadeiaItemDto[];
    cadeiaAnalitico: ConfiguracaoIaCadeiaItemDto[];
}

/** O nome do nível em português, como as mensagens de validação e a tela o escrevem. */
export function rotuloDoNivelIa(nivel: NivelIaEnum): string {
    return ROTULO_DO_NIVEL[nivel];
}

/** A cadeia do nível: o item principal primeiro e depois a contingência, na ordem em que são tentados. */
export function cadeiaDoNivelIa(configuracao: CadeiasDaConfiguracaoIa, nivel: NivelIaEnum): ConfiguracaoIaCadeiaItemDto[] {
    switch (nivel) {
        case NivelIaEnum.RAPIDO:
            return configuracao.cadeiaRapido;
        case NivelIaEnum.PADRAO:
            return configuracao.cadeiaPadrao;
        case NivelIaEnum.ANALITICO:
            return configuracao.cadeiaAnalitico;
    }
}

/**
 * A regra de coerência da configuração, a mesma na service e na tela. Devolve as mensagens (vazio: válida). Em cada uma das três cadeias:
 * - há ao menos um item e nenhum provedor aparece duas vezes (então são no máximo tantos itens quanto provedores);
 * - o provedor do item é um provedor de IA e o esforço é um esforço válido;
 * - o modelo é texto não vazio de até 100 caracteres e é do provedor do item.
 * Provedor sem chave de API no ambiente **não** invalida a configuração: o item sem chave é pulado na execução.
 */
export function validarCadeiasDaConfiguracaoIa(configuracao: CadeiasDaConfiguracaoIa): string[] {
    const erros: string[] = [];
    for (const nivel of Object.values(NivelIaEnum)) {
        erros.push(...validarCadeiaDoNivelIa(nivel, cadeiaDoNivelIa(configuracao, nivel)));
    }
    return erros;
}

/** A mesma regra para a cadeia de um nível só (a tela marca o erro no nível a que ele pertence). */
export function validarCadeiaDoNivelIa(nivel: NivelIaEnum, cadeia: unknown): string[] {
    const rotuloDoNivel = ROTULO_DO_NIVEL[nivel];
    if (!Array.isArray(cadeia) || cadeia.length === 0) return [`A cadeia do nível ${rotuloDoNivel} precisa ter ao menos um item`];

    const erros: string[] = [];
    const vistos = new Set<TipoProvedorIaEnum>();
    cadeia.forEach((item: unknown, indice) => {
        const posicao = indice + 1;
        if (item === null || typeof item !== 'object') {
            erros.push(`O item ${posicao} da cadeia do nível ${rotuloDoNivel} é inválido`);
            return;
        }
        const { provedor, modelo, esforco } = item as Partial<ConfiguracaoIaCadeiaItemDto>;

        if (!provedor || !Object.prototype.hasOwnProperty.call(ROTULO_DO_PROVEDOR, provedor)) {
            erros.push(`O provedor do item ${posicao} da cadeia do nível ${rotuloDoNivel} é inválido`);
        } else {
            if (vistos.has(provedor)) erros.push(`${ROTULO_DO_PROVEDOR[provedor]} aparece mais de uma vez na cadeia do nível ${rotuloDoNivel}`);
            vistos.add(provedor);
            erros.push(...validarModeloDoItem(provedor, modelo, posicao, rotuloDoNivel));
        }

        if (!esforco || !Object.values(EsforcoIaEnum).includes(esforco)) {
            erros.push(`O esforço do item ${posicao} da cadeia do nível ${rotuloDoNivel} é inválido`);
        }
    });
    return erros;
}

function validarModeloDoItem(provedor: TipoProvedorIaEnum, modelo: unknown, posicao: number, rotuloDoNivel: string): string[] {
    const rotuloDoProvedor = ROTULO_DO_PROVEDOR[provedor];
    if (typeof modelo !== 'string' || modelo.trim() === '') {
        return [`O modelo do item ${posicao} (${rotuloDoProvedor}) da cadeia do nível ${rotuloDoNivel} não foi informado`];
    }
    if (modelo.trim().length > TAMANHO_MAXIMO_DO_MODELO) {
        return [`O modelo do item ${posicao} (${rotuloDoProvedor}) da cadeia do nível ${rotuloDoNivel} passa de ${TAMANHO_MAXIMO_DO_MODELO} caracteres`];
    }
    if (!modeloPertenceAoProvedor(provedor, modelo)) {
        return [`O modelo "${modelo.trim()}" não é de ${rotuloDoProvedor} (cadeia do nível ${rotuloDoNivel})`];
    }
    return [];
}
