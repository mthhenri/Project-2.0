import { PropostaIaNiveisDto } from '../dtos/configuracao-ia/PropostaIaNiveisDto';
import { PropostaIaNivelEnum } from '../enums/proposta-ia-nivel.enum';
import { TipoAnotacaoEnum } from '../enums/tipo-anotacao.enum';
import { TipoAtividadeStatusEnum } from '../enums/tipo-atividade-status.enum';
import { TipoPropostaIaEnum } from '../enums/tipo-proposta-ia.enum';

/**
 * Marcar a **própria** atividade como desenvolvida: é um caso de `ALTERAR_ATIVIDADE` com nível próprio (a tabela de níveis da task 228 o põe
 * em "Faz e avisa", enquanto o resto de Alterar atividade pergunta).
 */
export const REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA = 'MARCAR_ATIVIDADE_DESENVOLVIDA';

/** Uma regra de nível é o tipo da proposta ou um caso dele que tem nível próprio. */
export type ChaveDeNivelDaProposta = TipoPropostaIaEnum | typeof REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA;

/** O nível de cada tipo quando nada o muda. Todo tipo novo precisa de uma entrada aqui (o compilador cobra). */
const NIVEL_PADRAO_POR_TIPO: Readonly<Record<TipoPropostaIaEnum, PropostaIaNivelEnum>> = {
  [TipoPropostaIaEnum.ANOTAR_PAD]:         PropostaIaNivelEnum.FAZ_E_AVISA,
  [TipoPropostaIaEnum.ATRIBUIR_TAG]:       PropostaIaNivelEnum.FAZ_E_AVISA,
  [TipoPropostaIaEnum.DESCREVER_EXECUCAO]: PropostaIaNivelEnum.FAZ_E_AVISA,
  [TipoPropostaIaEnum.CONECTAR_DEMANDA]:   PropostaIaNivelEnum.FAZ_E_AVISA,
  [TipoPropostaIaEnum.DESCONECTAR_DEMANDA]: PropostaIaNivelEnum.FAZ_E_AVISA,
  [TipoPropostaIaEnum.CRIAR_ATIVIDADE]:    PropostaIaNivelEnum.FAZ_E_AVISA,
  [TipoPropostaIaEnum.INICIAR_EXECUCAO]:   PropostaIaNivelEnum.FAZ_E_AVISA,
  [TipoPropostaIaEnum.PAUSAR_EXECUCAO]:    PropostaIaNivelEnum.FAZ_E_AVISA,
  [TipoPropostaIaEnum.ALTERAR_ATIVIDADE]:  PropostaIaNivelEnum.PERGUNTA,
  [TipoPropostaIaEnum.CRIAR_DEMANDA]:      PropostaIaNivelEnum.PERGUNTA,
  [TipoPropostaIaEnum.ALTERAR_DEMANDA]:    PropostaIaNivelEnum.PERGUNTA,
  [TipoPropostaIaEnum.CONCLUIR_DEMANDA]:   PropostaIaNivelEnum.PERGUNTA,
  [TipoPropostaIaEnum.MOVER_ATIVIDADE]:    PropostaIaNivelEnum.PERGUNTA,
  [TipoPropostaIaEnum.EXCLUIR_ATIVIDADE]:  PropostaIaNivelEnum.PERGUNTA,
  [TipoPropostaIaEnum.DESCREVER_DEMANDA]:  PropostaIaNivelEnum.PERGUNTA,
  [TipoPropostaIaEnum.SUSPENDER_CHECKIN]:  PropostaIaNivelEnum.PERGUNTA,
  [TipoPropostaIaEnum.ATRIBUIR_MEMBRO]:    PropostaIaNivelEnum.PERGUNTA,
  [TipoPropostaIaEnum.REGISTRAR_EXECUCAO]: PropostaIaNivelEnum.SEMPRE_PERGUNTA,
  [TipoPropostaIaEnum.CORRIGIR_EXECUCAO]:  PropostaIaNivelEnum.SEMPRE_PERGUNTA,
  [TipoPropostaIaEnum.CRIAR_PROJETO]:      PropostaIaNivelEnum.SEMPRE_PERGUNTA,
};

/** Os tipos que mexem em horas, em ponto ou em projeto: sempre perguntam, não aparecem na configuração. */
export const TIPOS_COM_NIVEL_FIXO: readonly TipoPropostaIaEnum[] = (Object.values(TipoPropostaIaEnum) as TipoPropostaIaEnum[]).filter(
  (tipo) => NIVEL_PADRAO_POR_TIPO[tipo] === PropostaIaNivelEnum.SEMPRE_PERGUNTA,
);

/** Os níveis que o administrador pode escolher (o `SEMPRE_PERGUNTA` é fixo). */
export const NIVEIS_CONFIGURAVEIS_DA_PROPOSTA: readonly PropostaIaNivelEnum[] = [PropostaIaNivelEnum.FAZ_E_AVISA, PropostaIaNivelEnum.PERGUNTA];

/** As regras que o administrador configura, na ordem do painel. */
export const CHAVES_CONFIGURAVEIS_DE_NIVEL: readonly ChaveDeNivelDaProposta[] = (Object.values(TipoPropostaIaEnum) as TipoPropostaIaEnum[])
  .filter((tipo) => !TIPOS_COM_NIVEL_FIXO.includes(tipo))
  .flatMap((tipo): ChaveDeNivelDaProposta[] => (tipo === TipoPropostaIaEnum.ALTERAR_ATIVIDADE ? [tipo, REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA] : [tipo]));

/** O tipo de proposta a que a regra se aplica. */
export function tipoDaChaveDeNivel(chave: ChaveDeNivelDaProposta): TipoPropostaIaEnum {
  return chave === REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA ? TipoPropostaIaEnum.ALTERAR_ATIVIDADE : chave;
}

/** O nível padrão de uma regra configurável. */
export function nivelPadraoDaChave(chave: ChaveDeNivelDaProposta): PropostaIaNivelEnum {
  return chave === REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA ? PropostaIaNivelEnum.FAZ_E_AVISA : NIVEL_PADRAO_POR_TIPO[chave];
}

/** O padrão de todas as regras configuráveis: o que vale numa instalação nova e para uma versão antiga da configuração que não guardou o mapa. */
export const NIVEIS_PADRAO_DA_PROPOSTA: Readonly<Record<string, PropostaIaNivelEnum>> = Object.fromEntries(
  CHAVES_CONFIGURAVEIS_DE_NIVEL.map((chave) => [chave, nivelPadraoDaChave(chave)]),
);

function nivelConfiguravel(valor: unknown): valor is PropostaIaNivelEnum {
  return NIVEIS_CONFIGURAVEIS_DA_PROPOSTA.includes(valor as PropostaIaNivelEnum);
}

/**
 * O mapa completo de níveis: o padrão de cada regra configurável, com por cima o que o mapa recebido traz de válido. Chave desconhecida ou
 * fixa e valor que não se configura são ignorados (lê-se uma versão antiga ou um mapa nulo sem quebrar).
 */
export function normalizarNiveisDaProposta(niveis: unknown): Record<string, PropostaIaNivelEnum> {
  const recebidos = niveis !== null && typeof niveis === 'object' && !Array.isArray(niveis) ? (niveis as Record<string, unknown>) : {};
  const completo: Record<string, PropostaIaNivelEnum> = { ...NIVEIS_PADRAO_DA_PROPOSTA };
  for (const chave of CHAVES_CONFIGURAVEIS_DE_NIVEL) {
    const valor = recebidos[chave];
    if (nivelConfiguravel(valor)) completo[chave] = valor;
  }
  return completo;
}

/** O que há de errado num mapa enviado para gravar (chave que não se configura, valor que não é um nível configurável); lista vazia: serve. */
export function validarNiveisDaProposta(niveis: PropostaIaNiveisDto): string[] {
  const erros: string[] = [];
  for (const [chave, valor] of Object.entries(niveis)) {
    if (!(CHAVES_CONFIGURAVEIS_DE_NIVEL as readonly string[]).includes(chave)) erros.push(`A regra "${chave}" não se configura`);
    else if (!nivelConfiguravel(valor)) erros.push(`O nível "${String(valor)}" não vale para a regra "${chave}"`);
  }
  return erros;
}

/** A proposta é feita em nome de outra pessoa: os dados trazem um `usuarioId` que não é de quem confirma. */
export function ehEmNomeDeOutraPessoa(dados: Record<string, unknown>, usuarioId: number): boolean {
  const alvo = dados['usuarioId'];
  return typeof alvo === 'number' && Number.isInteger(alvo) && alvo !== usuarioId;
}

/** Alterar atividade que só marca **a própria** atividade como desenvolvida (os dados trazem o dono da atividade). */
function ehMarcarDesenvolvidaNaPropria(dados: Record<string, unknown>, usuarioId: number): boolean {
  return (
    dados['status'] === TipoAtividadeStatusEnum.DESENVOLVIDA &&
    dados['prioridade'] === undefined &&
    dados['nome'] === undefined &&
    dados['atividadeUsuarioId'] === usuarioId
  );
}

export interface NivelDaPropostaEntrada {
  tipo: TipoPropostaIaEnum;
  dados: Record<string, unknown>;
  /** Quem confirma (o dono da proposta). */
  usuarioId: number;
  /** O mapa da configuração ativa; ausente ou incompleto, vale o padrão. */
  niveis?: PropostaIaNiveisDto | null;
}

/**
 * O nível de **uma proposta** (task 228), decidido pelo backend a partir do tipo, dos dados dela e da configuração, nunca pelo modelo.
 * Sempre pergunta, sem olhar a configuração: o que mexe em horas, em ponto ou em projeto, o que é feito em nome de outra pessoa e a seção
 * Pessoal do pad. O resto vale o nível configurado da regra (o tipo, ou o caso "marcar a própria atividade desenvolvida").
 */
export function nivelDaProposta(entrada: NivelDaPropostaEntrada): PropostaIaNivelEnum {
  const { tipo, dados, usuarioId } = entrada;
  if (TIPOS_COM_NIVEL_FIXO.includes(tipo)) return PropostaIaNivelEnum.SEMPRE_PERGUNTA;
  if (ehEmNomeDeOutraPessoa(dados, usuarioId)) return PropostaIaNivelEnum.SEMPRE_PERGUNTA;
  if (tipo === TipoPropostaIaEnum.ANOTAR_PAD && dados['secao'] === TipoAnotacaoEnum.PESSOAL) return PropostaIaNivelEnum.SEMPRE_PERGUNTA;
  const chave: ChaveDeNivelDaProposta =
    tipo === TipoPropostaIaEnum.ALTERAR_ATIVIDADE && ehMarcarDesenvolvidaNaPropria(dados, usuarioId) ? REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA : tipo;
  return normalizarNiveisDaProposta(entrada.niveis)[chave];
}
