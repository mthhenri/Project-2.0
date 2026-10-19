import { AbstractControl, ValidationErrors } from '@angular/forms';
import {
  ConfiguracaoIaCriarDto,
  ConfiguracaoIaResumoDto,
  EsforcoIaEnum,
  EstadoIaEnum,
  ModoContextoChatEnum,
  TipoProvedorIaEnum,
} from '@project20/shared';

export interface OpcaoDoSelect<T> {
  valor: T;
  rotulo: string;
  desabilitada?: boolean;
}

/** Só a Anthropic tem implementação (task 130); Google e OpenAI aparecem, mas não podem ser escolhidos. */
export const OPCOES_PROVEDOR: OpcaoDoSelect<TipoProvedorIaEnum>[] = [
  { valor: TipoProvedorIaEnum.ANTHROPIC, rotulo: 'Anthropic' },
  { valor: TipoProvedorIaEnum.GOOGLE, rotulo: 'Google (ainda sem suporte)', desabilitada: true },
  { valor: TipoProvedorIaEnum.OPENAI, rotulo: 'OpenAI (ainda sem suporte)', desabilitada: true },
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

/** Sugestões dos campos de modelo (o campo é texto livre: os nomes mudam com frequência). */
export const SUGESTOES_MODELOS: readonly string[] = [
  'claude-haiku-5-5',
  'claude-sonnet-5-5',
  'claude-opus-5-5',
  'claude-fable-5-1',
];

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
  OPCOES_PROVEDOR.find((opcao) => opcao.valor === provedor)?.rotulo.replace(' (ainda sem suporte)', '') ?? provedor;

/** Valor do formulário (campos numéricos podem estar vazios enquanto se digita). */
export interface ValorFormularioConfiguracaoIa {
  provedor: TipoProvedorIaEnum;
  modeloRapido: string;
  modeloPadrao: string;
  modeloAnalitico: string;
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
}

/** O mínimo do check-in precisa ser menor que o máximo (mesma regra da service). */
export function intervaloDoCheckinValido(controle: AbstractControl): ValidationErrors | null {
  const minimo = controle.get('checkinMinimoMinutos')?.value as number | null;
  const maximo = controle.get('checkinMaximoMinutos')?.value as number | null;
  if (minimo === null || maximo === null || minimo === undefined || maximo === undefined) return null;
  return minimo < maximo ? null : { intervaloInvalido: true };
}

export function valoresDaVersao(versao: ConfiguracaoIaResumoDto): ValorFormularioConfiguracaoIa {
  return {
    provedor: versao.provedor,
    modeloRapido: versao.modeloRapido,
    modeloPadrao: versao.modeloPadrao,
    modeloAnalitico: versao.modeloAnalitico,
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
  };
}

/** O formulário já é igual à versão (nada a salvar). */
export function formularioIgualAVersao(valor: ValorFormularioConfiguracaoIa, versao: ConfiguracaoIaResumoDto): boolean {
  const base = valoresDaVersao(versao);
  return (Object.keys(base) as (keyof ValorFormularioConfiguracaoIa)[]).every((chave) => valor[chave] === base[chave]);
}

export function paraDtoDeCriacao(valor: ValorFormularioConfiguracaoIa): ConfiguracaoIaCriarDto {
  return {
    ...valor,
    modeloRapido: valor.modeloRapido.trim(),
    modeloPadrao: valor.modeloPadrao.trim(),
    modeloAnalitico: valor.modeloAnalitico.trim(),
    checkinMinimoMinutos: valor.checkinMinimoMinutos as number,
    checkinMaximoMinutos: valor.checkinMaximoMinutos as number,
    duracaoRecomendadaMinutos: valor.duracaoRecomendadaMinutos as number,
  };
}
