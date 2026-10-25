import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import {
  ConfiguracaoIaCriarDto,
  ConfiguracaoIaModelosDto,
  ConfiguracaoIaModelosPorProvedorDto,
  ConfiguracaoIaResumoDto,
  EsforcoIaEnum,
  EstadoIaEnum,
  MAXIMO_FALLBACKS_IA,
  ModoContextoChatEnum,
  PropostaIaNivelEnum,
  TipoProvedorIaEnum,
  cadeiaDeProvedoresIa,
  modeloPertenceAoProvedor,
  normalizarNiveisDaProposta,
  validarProvedoresDaConfiguracaoIa,
} from '@project20/shared';

export interface OpcaoDoSelect<T> {
  valor: T;
  rotulo: string;
  desabilitada?: boolean;
}

/** Os três provedores têm implementação (task 203); a chave de cada um vem do `.env` do backend. */
export const OPCOES_PROVEDOR: OpcaoDoSelect<TipoProvedorIaEnum>[] = [
  { valor: TipoProvedorIaEnum.ANTHROPIC, rotulo: 'Anthropic' },
  { valor: TipoProvedorIaEnum.GOOGLE, rotulo: 'Google (Gemini)' },
  { valor: TipoProvedorIaEnum.OPENAI, rotulo: 'OpenAI' },
];

export const OPCOES_ESFORCO: OpcaoDoSelect<EsforcoIaEnum>[] = [
  { valor: EsforcoIaEnum.BAIXO, rotulo: 'Baixo' },
  { valor: EsforcoIaEnum.MEDIO, rotulo: 'Médio' },
  { valor: EsforcoIaEnum.ALTO, rotulo: 'Alto' },
];

export const OPCOES_MODO_CONTEXTO: OpcaoDoSelect<ModoContextoChatEnum>[] = [
  { valor: ModoContextoChatEnum.MISTURADO, rotulo: 'Misturado' },
  { valor: ModoContextoChatEnum.SEPARADO, rotulo: 'Separado' },
];

/** O que cada modo faz, mostrado abaixo da escolha. */
export const EXPLICACAO_MODO_CONTEXTO: Record<ModoContextoChatEnum, string> = {
  [ModoContextoChatEnum.MISTURADO]: 'A IA lê a conversa inteira, de código e de Project, e pode relacionar uma com a outra.',
  [ModoContextoChatEnum.SEPARADO]: 'Dúvidas de código e assuntos do Project não se enxergam: cada pergunta só vê as mensagens do próprio assunto.',
};

export const rotuloDoModoContexto = (modo: ModoContextoChatEnum): string =>
  OPCOES_MODO_CONTEXTO.find((opcao) => opcao.valor === modo)?.rotulo ?? modo;

/** Sugestões dos campos de modelo de cada provedor (o campo é texto livre: os nomes mudam com frequência). */
export const SUGESTOES_MODELOS: Record<TipoProvedorIaEnum, readonly string[]> = {
  [TipoProvedorIaEnum.ANTHROPIC]: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1'],
  [TipoProvedorIaEnum.GOOGLE]: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  [TipoProvedorIaEnum.OPENAI]: ['gpt-5-mini', 'gpt-5', 'o3'],
};

export const ROTULO_ESTADO_IA: Record<EstadoIaEnum, string> = {
  [EstadoIaEnum.NO_AR]: 'No ar',
  [EstadoIaEnum.FORA_DO_AR]: 'Fora do ar',
  [EstadoIaEnum.DESLIGADA]: 'Desligada',
};

export const SEVERIDADE_ESTADO_IA: Record<EstadoIaEnum, 'success' | 'danger' | 'secondary'> = {
  [EstadoIaEnum.NO_AR]: 'success',
  [EstadoIaEnum.FORA_DO_AR]: 'danger',
  [EstadoIaEnum.DESLIGADA]: 'secondary',
};

export const rotuloDoEsforco = (esforco: EsforcoIaEnum): string =>
  OPCOES_ESFORCO.find((opcao) => opcao.valor === esforco)?.rotulo ?? esforco;

export const rotuloDoProvedor = (provedor: TipoProvedorIaEnum): string =>
  OPCOES_PROVEDOR.find((opcao) => opcao.valor === provedor)?.rotulo ?? provedor;

/** Os modelos de cada provedor no formulário: o provedor fora da cadeia continua com o que foi digitado (ou vazio). */
export type ModelosPorProvedorDoFormulario = Record<TipoProvedorIaEnum, ConfiguracaoIaModelosDto>;

const MODELOS_VAZIOS: ConfiguracaoIaModelosDto = { modeloRapido: '', modeloPadrao: '', modeloAnalitico: '' };

/** Valor do formulário (campos numéricos podem estar vazios enquanto se digita). */
export interface ValorFormularioConfiguracaoIa {
  provedor: TipoProvedorIaEnum;
  /** Os dois campos de contingência, na ordem; `null` é "Nenhum". */
  fallbackPrimeiro: TipoProvedorIaEnum | null;
  fallbackSegundo: TipoProvedorIaEnum | null;
  modelos: ModelosPorProvedorDoFormulario;
  esforcoAnalitico: EsforcoIaEnum;
  checkinMinimoMinutos: number | null;
  checkinMaximoMinutos: number | null;
  duracaoRecomendadaMinutos: number | null;
  checkinInteligente: boolean;
  rigorProporcional: boolean;
  deteccaoAutomatica: boolean;
  duvidasCodigo: boolean;
  modoContextoChat: ModoContextoChatEnum;
  iaDesligada: boolean;
  /** O nível de autonomia da IA por regra de proposta (task 228), sempre completo. */
  niveisProposta: Record<string, PropostaIaNivelEnum>;
}

/** Os fallbacks do formulário em ordem, sem os campos em "Nenhum" (um fallback só no segundo campo sobe para o primeiro). */
export function fallbacksDoFormulario(valor: Pick<ValorFormularioConfiguracaoIa, 'fallbackPrimeiro' | 'fallbackSegundo'>): TipoProvedorIaEnum[] {
  return [valor.fallbackPrimeiro, valor.fallbackSegundo].filter((provedor): provedor is TipoProvedorIaEnum => provedor !== null);
}

/** Os modelos que vão na gravação: os de todo provedor da cadeia e os guardados de qualquer outro cujo trio esteja completo e coerente, aparados. */
function modelosParaGravar(valor: ValorFormularioConfiguracaoIa): ConfiguracaoIaModelosPorProvedorDto {
  const cadeia = cadeiaDeProvedoresIa({ provedor: valor.provedor, fallbacks: fallbacksDoFormulario(valor) });
  const mapa: ConfiguracaoIaModelosPorProvedorDto = {};
  for (const provedor of Object.values(TipoProvedorIaEnum)) {
    const modelos = valor.modelos[provedor];
    const aparados = {
      modeloRapido: modelos.modeloRapido.trim(),
      modeloPadrao: modelos.modeloPadrao.trim(),
      modeloAnalitico: modelos.modeloAnalitico.trim(),
    };
    // Fora da cadeia o trio só fica guardado se estiver completo e for do provedor: um rascunho incoerente que a tela não mostra não pode bloquear o salvar.
    const coerente = Object.values(aparados).every((modelo) => modelo !== '' && modeloPertenceAoProvedor(provedor, modelo));
    if (cadeia.includes(provedor) || coerente) mapa[provedor] = aparados;
  }
  return mapa;
}

/**
 * Os erros de modelo de cada provedor da cadeia, pela mesma regra do `shared` aplicada a um provedor por vez (a cadeia em si não repete provedor na tela).
 * Só entram provedores com erro: a tela marca o cartão deles e abre o primeiro.
 */
export function errosPorProvedor(valor: ValorFormularioConfiguracaoIa): Partial<Record<TipoProvedorIaEnum, string[]>> {
  const modelos = modelosParaGravar(valor);
  const porProvedor: Partial<Record<TipoProvedorIaEnum, string[]>> = {};
  for (const provedor of cadeiaDoFormulario(valor)) {
    const erros = validarProvedoresDaConfiguracaoIa({ provedor, fallbacks: [], modelosProvedor: { [provedor]: modelos[provedor] } });
    if (erros.length > 0) porProvedor[provedor] = erros;
  }
  return porProvedor;
}

/** Os erros de provedor e modelo da regra do `shared` (a mesma da service), para mostrar antes de salvar. */
export function errosDeProvedores(valor: ValorFormularioConfiguracaoIa): string[] {
  return validarProvedoresDaConfiguracaoIa({
    provedor: valor.provedor,
    fallbacks: fallbacksDoFormulario(valor),
    modelosProvedor: modelosParaGravar(valor),
  });
}

/** O mínimo do check-in precisa ser menor que o máximo (mesma regra da service). */
export function intervaloDoCheckinValido(controle: AbstractControl): ValidationErrors | null {
  const minimo = controle.get('checkinMinimoMinutos')?.value as number | null;
  const maximo = controle.get('checkinMaximoMinutos')?.value as number | null;
  if (minimo === null || maximo === null || minimo === undefined || maximo === undefined) return null;
  return minimo < maximo ? null : { intervaloInvalido: true };
}

export function valoresDaVersao(versao: ConfiguracaoIaResumoDto): ValorFormularioConfiguracaoIa {
  const modelos = {} as ModelosPorProvedorDoFormulario;
  for (const provedor of Object.values(TipoProvedorIaEnum)) modelos[provedor] = { ...MODELOS_VAZIOS, ...versao.modelosProvedor[provedor] };
  return {
    provedor: versao.provedor,
    fallbackPrimeiro: versao.fallbacks[0] ?? null,
    fallbackSegundo: versao.fallbacks[1] ?? null,
    modelos,
    esforcoAnalitico: versao.esforcoAnalitico,
    checkinMinimoMinutos: versao.checkinMinimoMinutos,
    checkinMaximoMinutos: versao.checkinMaximoMinutos,
    duracaoRecomendadaMinutos: versao.duracaoRecomendadaMinutos,
    checkinInteligente: versao.checkinInteligente,
    rigorProporcional: versao.rigorProporcional,
    deteccaoAutomatica: versao.deteccaoAutomatica,
    duvidasCodigo: versao.duvidasCodigo,
    modoContextoChat: versao.modoContextoChat,
    iaDesligada: versao.iaDesligada,
    niveisProposta: normalizarNiveisDaProposta(versao.niveisProposta),
  };
}

/** O formulário já é igual à versão (nada a salvar): compara o que seria gravado, que tem ordem de chaves estável. */
export function formularioIgualAVersao(valor: ValorFormularioConfiguracaoIa, versao: ConfiguracaoIaResumoDto): boolean {
  return JSON.stringify(paraDtoDeCriacao(valor)) === JSON.stringify(paraDtoDeCriacao(valoresDaVersao(versao)));
}

export function paraDtoDeCriacao(valor: ValorFormularioConfiguracaoIa): ConfiguracaoIaCriarDto {
  return {
    provedor: valor.provedor,
    fallbacks: fallbacksDoFormulario(valor),
    modelosProvedor: modelosParaGravar(valor),
    esforcoAnalitico: valor.esforcoAnalitico,
    checkinMinimoMinutos: valor.checkinMinimoMinutos as number,
    checkinMaximoMinutos: valor.checkinMaximoMinutos as number,
    duracaoRecomendadaMinutos: valor.duracaoRecomendadaMinutos as number,
    checkinInteligente: valor.checkinInteligente,
    rigorProporcional: valor.rigorProporcional,
    deteccaoAutomatica: valor.deteccaoAutomatica,
    duvidasCodigo: valor.duvidasCodigo,
    modoContextoChat: valor.modoContextoChat,
    iaDesligada: valor.iaDesligada,
    niveisProposta: normalizarNiveisDaProposta(valor.niveisProposta),
  };
}

/** Quantos fallbacks a tela oferece (o máximo da regra do `shared`). */
export const QUANTIDADE_DE_FALLBACKS = MAXIMO_FALLBACKS_IA;

/** O trio de modelos de um provedor: texto livre de até 100 caracteres; se estão preenchidos, o que falta ou destoa do provedor vem da regra do shared. */
function grupoDeModelos(formBuilder: FormBuilder) {
  return formBuilder.nonNullable.group({
    modeloRapido: ['', Validators.maxLength(100)],
    modeloPadrao: ['', Validators.maxLength(100)],
    modeloAnalitico: ['', Validators.maxLength(100)],
  });
}

/** O formulário da configuração da IA (compartilhado pela página e pelas abas dela). Um trio por provedor, sempre presente: o de quem está fora da cadeia fica guardado. */
export function criarFormularioConfiguracaoIa(formBuilder: FormBuilder) {
  return formBuilder.nonNullable.group(
    {
      provedor: [TipoProvedorIaEnum.ANTHROPIC, Validators.required],
      fallbackPrimeiro: [null as TipoProvedorIaEnum | null],
      fallbackSegundo: [null as TipoProvedorIaEnum | null],
      modelos: formBuilder.nonNullable.group({
        [TipoProvedorIaEnum.ANTHROPIC]: grupoDeModelos(formBuilder),
        [TipoProvedorIaEnum.GOOGLE]: grupoDeModelos(formBuilder),
        [TipoProvedorIaEnum.OPENAI]: grupoDeModelos(formBuilder),
      }),
      esforcoAnalitico: [EsforcoIaEnum.MEDIO, Validators.required],
      checkinMinimoMinutos: [null as number | null, [Validators.required, Validators.min(1)]],
      checkinMaximoMinutos: [null as number | null, [Validators.required, Validators.min(1)]],
      duracaoRecomendadaMinutos: [null as number | null, [Validators.required, Validators.min(1)]],
      checkinInteligente: [true],
      rigorProporcional: [true],
      deteccaoAutomatica: [true],
      duvidasCodigo: [false],
      modoContextoChat: [ModoContextoChatEnum.MISTURADO, Validators.required],
      iaDesligada: [true],
      niveisProposta: formBuilder.nonNullable.group(
        Object.fromEntries(
          Object.entries(normalizarNiveisDaProposta(null)).map(([chave, nivel]) => [chave, formBuilder.nonNullable.control(nivel)]),
        ),
      ),
    },
    { validators: intervaloDoCheckinValido },
  );
}

export type FormularioConfiguracaoIa = ReturnType<typeof criarFormularioConfiguracaoIa>;

/** A cadeia (padrão e fallbacks) do formulário, na ordem em que os provedores são tentados. */
export function cadeiaDoFormulario(valor: Pick<ValorFormularioConfiguracaoIa, 'provedor' | 'fallbackPrimeiro' | 'fallbackSegundo'>): TipoProvedorIaEnum[] {
  return cadeiaDeProvedoresIa({ provedor: valor.provedor, fallbacks: fallbacksDoFormulario(valor) });
}

/** A cadeia como os três campos do formulário (o que não existe vira `null`: a cadeia é contígua). */
export function camposDaCadeia(cadeia: TipoProvedorIaEnum[]): Pick<ValorFormularioConfiguracaoIa, 'provedor' | 'fallbackPrimeiro' | 'fallbackSegundo'> {
  return { provedor: cadeia[0], fallbackPrimeiro: cadeia[1] ?? null, fallbackSegundo: cadeia[2] ?? null };
}

/** Tira um fallback da cadeia (o seguinte sobe um lugar); o padrão (posição 0) nunca sai. */
export function removerProvedorDoCartao(cadeia: TipoProvedorIaEnum[], posicao: number): TipoProvedorIaEnum[] {
  if (posicao <= 0 || posicao >= cadeia.length) return cadeia;
  return cadeia.filter((_, indice) => indice !== posicao);
}
