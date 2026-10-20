import { ConfiguracaoIaModelosDto, ConfiguracaoIaModelosPorProvedorDto } from '../dtos/configuracao-ia/ConfiguracaoIaModelosDto';
import { TipoProvedorIaEnum } from '../enums/tipo-provedor-ia.enum';

/** Quantos provedores de contingência a configuração aceita (os três provedores menos o padrão). */
export const MAXIMO_FALLBACKS_IA = 2;

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

/** O modelo é do provedor? (`claude-*` é da Anthropic, `gemini-*` do Google, `gpt-*` e `o1`/`o3`... da OpenAI.) */
export function modeloPertenceAoProvedor(provedor: TipoProvedorIaEnum, modelo: string): boolean {
  return PADRAO_DE_MODELO[provedor].test(modelo.trim().toLowerCase());
}

/** O que a regra de coerência lê da configuração (a criação e a versão gravada têm esta forma). */
export interface ProvedoresDaConfiguracaoIa {
  provedor: TipoProvedorIaEnum;
  fallbacks: TipoProvedorIaEnum[];
  modelosProvedor: ConfiguracaoIaModelosPorProvedorDto;
}

/** O provedor padrão e depois cada fallback, na ordem em que são tentados. */
export function cadeiaDeProvedoresIa(configuracao: Pick<ProvedoresDaConfiguracaoIa, 'provedor' | 'fallbacks'>): TipoProvedorIaEnum[] {
  return [configuracao.provedor, ...configuracao.fallbacks];
}

const NIVEIS_DO_TRIO: ReadonlyArray<[keyof ConfiguracaoIaModelosDto, string]> = [
  ['modeloRapido', 'rápido'],
  ['modeloPadrao', 'padrão'],
  ['modeloAnalitico', 'analítico'],
];

const TAMANHO_MAXIMO_DO_MODELO = 100;

/**
 * A regra de coerência da configuração, a mesma na service e na tela. Devolve as mensagens (vazio: válida):
 * - a cadeia (padrão + fallbacks) respeita o máximo e não repete provedor;
 * - todo provedor da cadeia tem os três modelos;
 * - todo modelo guardado, da cadeia ou não, é texto de até 100 caracteres e é do provedor em que está.
 */
export function validarProvedoresDaConfiguracaoIa(configuracao: ProvedoresDaConfiguracaoIa): string[] {
  const erros: string[] = [];
  const cadeia = cadeiaDeProvedoresIa(configuracao);

  if (configuracao.fallbacks.length > MAXIMO_FALLBACKS_IA) {
    erros.push(`A cadeia de contingência aceita no máximo ${MAXIMO_FALLBACKS_IA} provedores`);
  }
  const vistos = new Set<TipoProvedorIaEnum>();
  for (const provedor of cadeia) {
    if (vistos.has(provedor)) erros.push(`${ROTULO_DO_PROVEDOR[provedor]} aparece mais de uma vez na cadeia de provedores`);
    vistos.add(provedor);
  }

  const mapa = configuracao.modelosProvedor as Record<string, ConfiguracaoIaModelosDto | undefined>;
  for (const chave of Object.keys(mapa)) {
    if (!Object.prototype.hasOwnProperty.call(ROTULO_DO_PROVEDOR, chave)) erros.push(`"${chave}" não é um provedor de IA`);
  }

  for (const provedor of Object.values(TipoProvedorIaEnum)) {
    const modelos = configuracao.modelosProvedor[provedor];
    const naCadeia = vistos.has(provedor);
    if (!modelos) {
      if (naCadeia) erros.push(`${ROTULO_DO_PROVEDOR[provedor]} está na cadeia, mas não tem os modelos informados`);
      continue;
    }
    for (const [campo, nivel] of NIVEIS_DO_TRIO) {
      const modelo = modelos[campo];
      if (typeof modelo !== 'string' || modelo.trim() === '') {
        if (naCadeia) erros.push(`${ROTULO_DO_PROVEDOR[provedor]} está na cadeia, mas o modelo ${nivel} não foi informado`);
        else if (modelo !== undefined && modelo !== '') erros.push(`O modelo ${nivel} de ${ROTULO_DO_PROVEDOR[provedor]} é inválido`);
      } else if (modelo.trim().length > TAMANHO_MAXIMO_DO_MODELO) {
        erros.push(`O modelo ${nivel} de ${ROTULO_DO_PROVEDOR[provedor]} passa de ${TAMANHO_MAXIMO_DO_MODELO} caracteres`);
      } else if (!modeloPertenceAoProvedor(provedor, modelo)) {
        erros.push(`O modelo ${nivel} "${modelo.trim()}" não é de ${ROTULO_DO_PROVEDOR[provedor]}`);
      }
    }
  }
  return erros;
}
