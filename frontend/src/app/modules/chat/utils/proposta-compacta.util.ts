import { PlanoAbaEnum, TipoPropostaIaEnum } from '@project20/shared';
import { ATIVIDADE_STATUS_OPCOES } from '../../atividade/models/atividade.model';
import { ROTULO_SECAO_ANOTACAO } from '../../usuario/utils/anotacoes.util';
import { formatarDuracao } from './chat.util';
import { ROTULO_ABA_DO_PLANO } from './plano.util';

/** Mais que isto num texto do cartão e ele deixa de caber numa linha: vai para o cartão grande (decisão do autor, task 226). */
export const LIMITE_DE_TEXTO_COMPACTO = 80;
/** Mais campos que isto (chips e citações) e o cartão fica grande. */
export const LIMITE_DE_CAMPOS_COMPACTO = 3;

/** Status de demanda como as telas os mostram. */
export const ROTULO_STATUS_DA_DEMANDA: Record<string, string> = {
  PENDENTE: 'Pendente',
  PLANEJADA: 'Planejada',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

/** Um pedaço do resumo de uma linha: o que a proposta muda além da ação e do nome. */
export type CampoCompacto =
  /** Valor solto (`Projeto: Portal`, `+ Urgente`). `cor` põe uma bolinha de cor antes (cor do projeto). */
  | { tipo: 'chip'; texto: string; cor?: string }
  /** Antes → depois; com `diff`, os dois textos viram um diff por palavra. */
  | { tipo: 'mudanca'; antes: string; depois: string; diff: boolean }
  /** Prioridade (selo), com a de antes quando muda. */
  | { tipo: 'prioridade'; antes?: string; depois: string }
  /** Texto livre da proposta (descrição, motivo), entre aspas. */
  | { tipo: 'citacao'; texto: string };

/** O que a linha mostra de uma proposta e se ela cabe numa linha só. */
export interface ResumoDaProposta {
  /** O verbo e, quando cabe, para quem (`Iniciar para Ana`). */
  acao: string;
  nome: string;
  /** Quando o nome muda: o nome de antes, para o diff por palavra com `nome`. */
  nomeAnterior?: string;
  /** A demanda ou o projeto a que o nome pertence, em tom apagado. */
  contexto?: string;
  campos: CampoCompacto[];
  /** Cabe numa linha: poucos campos, textos curtos, nada que o usuário precise ler antes de confirmar. */
  compacto: boolean;
}

type Dados = Record<string, unknown>;
type ResumoBruto = Omit<ResumoDaProposta, 'compacto'> & {
  /** O cartão grande é obrigatório (aviso, texto longo por natureza, dependência de outra proposta). */
  exigeCartaoGrande?: boolean;
};

const texto = (dados: Dados, chave: string): string => (typeof dados[chave] === 'string' ? (dados[chave] as string) : '');
const numero = (dados: Dados, chave: string): number => (typeof dados[chave] === 'number' ? (dados[chave] as number) : 0);
const lista = (dados: Dados, chave: string): string[] =>
  Array.isArray(dados[chave]) ? (dados[chave] as unknown[]).filter((item): item is string => typeof item === 'string') : [];
const nomeOu = (dados: Dados, chave: string, rotulo: string, chaveId: string): string => texto(dados, chave) || `${rotulo} ${String(dados[chaveId] ?? '')}`.trim();
const dataBr = (data: string): string => (data ? data.slice(0, 10).split('-').reverse().join('/') : '');
const rotuloStatusDaAtividade = (codigo: string): string => ATIVIDADE_STATUS_OPCOES.find((opcao) => opcao.value === codigo)?.label ?? codigo;
const rotuloStatusDaDemanda = (codigo: string): string => ROTULO_STATUS_DA_DEMANDA[codigo] ?? codigo;
const citacao = (valor: string): CampoCompacto[] => (valor ? [{ tipo: 'citacao', texto: valor }] : []);
const comPessoa = (verbo: string, dados: Dados): string => (texto(dados, 'usuarioNome') ? `${verbo} para ${texto(dados, 'usuarioNome')}` : verbo);

/** Período e duração da execução de antes da correção, em texto (o cartão grande usa o mesmo). */
export function periodoAnteriorDaExecucao(dados: Dados): string {
  const inicio = typeof dados['inicioAnteriorData'] === 'string' ? Date.parse(dados['inicioAnteriorData']) : NaN;
  const fim = typeof dados['fimAnteriorData'] === 'string' ? Date.parse(dados['fimAnteriorData']) : NaN;
  const duracao = Number.isNaN(inicio) || Number.isNaN(fim) ? 0 : Math.round((fim - inicio) / 60000);
  return duracao > 0 ? `${texto(dados, 'periodoAnteriorTexto')} (${formatarDuracao(duracao)})` : texto(dados, 'periodoAnteriorTexto');
}

/** Período e duração da execução depois da correção, em texto. */
export function periodoNovoDaExecucao(dados: Dados): string {
  const duracao = numero(dados, 'duracaoNovaMinutos');
  return duracao > 0 ? `${texto(dados, 'periodoNovoTexto')} (${formatarDuracao(duracao)})` : texto(dados, 'periodoNovoTexto');
}

const RESUMIDORES: Record<TipoPropostaIaEnum, (dados: Dados) => ResumoBruto> = {
  [TipoPropostaIaEnum.INICIAR_EXECUCAO]: (dados) => ({
    acao: comPessoa('Iniciar', dados),
    nome: nomeOu(dados, 'atividadeNome', 'Atividade', 'atividadeId'),
    contexto: texto(dados, 'demandaNome'),
    campos: [
      ...(texto(dados, 'statusAnterior')
        ? [{ tipo: 'mudanca' as const, antes: rotuloStatusDaAtividade(texto(dados, 'statusAnterior')), depois: rotuloStatusDaAtividade(texto(dados, 'novoStatus')), diff: false }]
        : []),
      ...(texto(dados, 'pausaraAtividadeNome') ? [{ tipo: 'chip' as const, texto: `Pausa antes: ${texto(dados, 'pausaraAtividadeNome')}` }] : []),
      ...citacao(texto(dados, 'descricao')),
    ],
  }),
  [TipoPropostaIaEnum.PAUSAR_EXECUCAO]: (dados) => ({
    acao: comPessoa('Pausar', dados),
    nome: texto(dados, 'atividadeNome') || 'Execução em andamento',
    contexto: texto(dados, 'demandaNome'),
    campos: citacao(texto(dados, 'descricao')),
  }),
  [TipoPropostaIaEnum.CRIAR_ATIVIDADE]: (dados) => ({
    acao: comPessoa('Criar atividade', dados),
    nome: texto(dados, 'nome'),
    contexto: texto(dados, 'demandaNome'),
    campos: [{ tipo: 'prioridade', depois: texto(dados, 'prioridade') || 'INDEFINIDA' }],
  }),
  [TipoPropostaIaEnum.ALTERAR_ATIVIDADE]: (dados) => ({
    acao: 'Alterar atividade',
    nome: texto(dados, 'nome') || nomeOu(dados, 'atividadeNome', 'Atividade', 'atividadeId'),
    ...(texto(dados, 'nome') ? { nomeAnterior: texto(dados, 'atividadeNome') } : {}),
    contexto: texto(dados, 'demandaNome'),
    campos: [
      ...(texto(dados, 'statusAnterior')
        ? [{ tipo: 'mudanca' as const, antes: rotuloStatusDaAtividade(texto(dados, 'statusAnterior')), depois: rotuloStatusDaAtividade(texto(dados, 'status')), diff: false }]
        : []),
      ...(texto(dados, 'prioridadeAnterior')
        ? [{ tipo: 'prioridade' as const, antes: texto(dados, 'prioridadeAnterior'), depois: texto(dados, 'prioridade') }]
        : []),
    ],
  }),
  [TipoPropostaIaEnum.REGISTRAR_EXECUCAO]: (dados) => ({
    acao: comPessoa('Registrar', dados),
    nome: nomeOu(dados, 'atividadeNome', 'Atividade', 'atividadeId'),
    contexto: texto(dados, 'demandaNome'),
    campos: [
      {
        tipo: 'chip',
        texto: numero(dados, 'duracaoMinutos') ? `${texto(dados, 'periodoTexto')} (${formatarDuracao(numero(dados, 'duracaoMinutos'))})` : texto(dados, 'periodoTexto'),
      },
      ...citacao(texto(dados, 'descricao')),
    ],
  }),
  [TipoPropostaIaEnum.CORRIGIR_EXECUCAO]: (dados) => ({
    acao: 'Corrigir execução',
    nome: nomeOu(dados, 'atividadeNome', 'Execução', 'execucaoId'),
    contexto: texto(dados, 'demandaNome'),
    campos: [
      { tipo: 'mudanca', antes: periodoAnteriorDaExecucao(dados), depois: periodoNovoDaExecucao(dados), diff: true },
      ...(texto(dados, 'descricao') ? [{ tipo: 'mudanca' as const, antes: texto(dados, 'descricaoAnterior'), depois: texto(dados, 'descricao'), diff: true }] : []),
    ],
  }),
  [TipoPropostaIaEnum.ALTERAR_DEMANDA]: (dados) => ({
    acao: 'Alterar demanda',
    nome: texto(dados, 'nome') || nomeOu(dados, 'demandaNome', 'Demanda', 'demandaId'),
    ...(texto(dados, 'nome') ? { nomeAnterior: texto(dados, 'demandaNome') } : {}),
    contexto: texto(dados, 'projetoNome'),
    campos: [
      ...(texto(dados, 'statusAnterior')
        ? [{ tipo: 'mudanca' as const, antes: rotuloStatusDaDemanda(texto(dados, 'statusAnterior')), depois: rotuloStatusDaDemanda(texto(dados, 'status')), diff: false }]
        : []),
      ...(dados['horasAnteriores'] !== undefined
        ? [{ tipo: 'mudanca' as const, antes: `${numero(dados, 'horasAnteriores')}h`, depois: `${numero(dados, 'horasEstimadas')}h`, diff: false }]
        : []),
      ...(dados['previsaoAnteriorData'] !== undefined
        ? [{ tipo: 'mudanca' as const, antes: dataBr(texto(dados, 'previsaoAnteriorData')) || 'sem previsão', depois: dataBr(texto(dados, 'previsaoFimData')), diff: false }]
        : []),
      ...(texto(dados, 'paiNovoNome')
        ? [{ tipo: 'mudanca' as const, antes: `Pai: ${texto(dados, 'paiAnteriorNome') || 'topo da árvore'}`, depois: texto(dados, 'paiNovoNome'), diff: false }]
        : []),
    ],
    // A documentação acrescentada e o aviso de atividades em aberto precisam ser lidos antes de confirmar.
    exigeCartaoGrande: !!texto(dados, 'acrescentarDocumentacao') || numero(dados, 'atividadesEmAberto') > 0,
  }),
  [TipoPropostaIaEnum.ATRIBUIR_MEMBRO]: (dados) => {
    const remover = texto(dados, 'acao') === 'REMOVER';
    const pessoa = texto(dados, 'usuarioNome') || `Usuário ${String(dados['usuarioId'] ?? '')}`.trim();
    return {
      acao: remover ? `Tirar ${pessoa} de` : `Colocar ${pessoa} em`,
      nome: nomeOu(dados, 'demandaNome', 'Demanda', 'demandaId'),
      contexto: texto(dados, 'projetoNome'),
      campos: texto(dados, 'usuarioCargo') ? [{ tipo: 'chip', texto: texto(dados, 'usuarioCargo') }] : [],
    };
  },
  [TipoPropostaIaEnum.ATRIBUIR_TAG]: (dados) => {
    const antes = lista(dados, 'tagsAntesNomes');
    const depois = lista(dados, 'tagsDepoisNomes');
    const entram = depois.filter((tag) => !antes.includes(tag));
    const saem = antes.filter((tag) => !depois.includes(tag));
    return {
      acao: 'Tags',
      nome: nomeOu(dados, 'alvoNome', 'Alvo', 'alvoId'),
      contexto: texto(dados, 'alvo') === 'ATIVIDADE' ? texto(dados, 'demandaNome') : 'Demanda',
      campos: [
        ...(entram.length > 0 ? [{ tipo: 'chip' as const, texto: `+ ${entram.join(', ')}` }] : []),
        ...(saem.length > 0 ? [{ tipo: 'chip' as const, texto: `− ${saem.join(', ')}` }] : []),
      ],
    };
  },
  [TipoPropostaIaEnum.CRIAR_PROJETO]: (dados) => ({
    acao: 'Criar projeto',
    nome: texto(dados, 'nome'),
    campos: [
      { tipo: 'chip', texto: `Código: ${texto(dados, 'codigo')}`, cor: texto(dados, 'cor') || undefined },
      ...(texto(dados, 'inicioData') ? [{ tipo: 'chip' as const, texto: `Início: ${dataBr(texto(dados, 'inicioData'))}` }] : []),
      ...(texto(dados, 'previsaoFimData') ? [{ tipo: 'chip' as const, texto: `Previsão: ${dataBr(texto(dados, 'previsaoFimData'))}` }] : []),
    ],
  }),
  [TipoPropostaIaEnum.DESCREVER_EXECUCAO]: (dados) => ({
    acao: 'Descrever execução',
    nome: texto(dados, 'atividadeNome') || 'Execução em andamento',
    contexto: texto(dados, 'demandaNome'),
    campos: [
      ...citacao(texto(dados, 'descricao')),
      {
        tipo: 'chip',
        texto: texto(dados, 'escolha') === 'TROCAR' ? `Depois: trocar para ${texto(dados, 'atividadeSeguinteNome') || 'outra atividade'}` : 'Depois: continuar nesta atividade',
      },
    ],
  }),
  [TipoPropostaIaEnum.SUSPENDER_CHECKIN]: (dados) => ({
    acao: 'Check-in',
    nome: texto(dados, 'acao') === 'RETOMAR' ? 'Retomar os check-ins' : 'Suspender até você voltar',
    campos: citacao(texto(dados, 'motivo')),
  }),
  [TipoPropostaIaEnum.ANOTAR_PAD]: (dados) => {
    const troca = texto(dados, 'operacao') === 'TROCAR';
    const secao = (ROTULO_SECAO_ANOTACAO as Record<string, string>)[texto(dados, 'secao')] ?? texto(dados, 'secao');
    return {
      acao: troca ? 'Trocar no pad' : 'Anotar no pad',
      nome: secao,
      campos: troca ? [{ tipo: 'mudanca', antes: texto(dados, 'trechoAntigo'), depois: texto(dados, 'trechoNovo'), diff: true }] : citacao(texto(dados, 'texto')),
    };
  },
  [TipoPropostaIaEnum.CRIAR_DEMANDA]: (dados) => ({
    acao: 'Criar demanda',
    nome: texto(dados, 'nome'),
    campos: [
      { tipo: 'chip', texto: `Projeto: ${texto(dados, 'projetoNome')}` },
      { tipo: 'chip', texto: texto(dados, 'demandaPaiNome') ? `Dentro de: ${texto(dados, 'demandaPaiNome')}` : 'Topo do projeto' },
      { tipo: 'chip', texto: dados['isEstrutural'] === true ? 'Estrutura' : 'Trabalho' },
      ...citacao(texto(dados, 'descricaoTecnica') || texto(dados, 'descricaoCliente')),
    ],
    // Depende de outra proposta do mesmo turno: o aviso "confirme antes" precisa aparecer.
    exigeCartaoGrande: !!dados['projetoPropostaId'] || !!dados['demandaPaiPropostaId'],
  }),
  // As descrições são textos longos por natureza e o diff é o que se vai conferir: sempre cartão grande.
  [TipoPropostaIaEnum.DESCREVER_DEMANDA]: (dados) => ({
    acao: 'Descrever demanda',
    nome: nomeOu(dados, 'demandaNome', 'Demanda', 'demandaId'),
    contexto: texto(dados, 'projetoNome'),
    campos: [],
    exigeCartaoGrande: true,
  }),
  [TipoPropostaIaEnum.CONCLUIR_DEMANDA]: (dados) => ({
    acao: 'Concluir demanda',
    nome: nomeOu(dados, 'demandaNome', 'Demanda', 'demandaId'),
    contexto: texto(dados, 'projetoNome'),
    campos: texto(dados, 'statusAnterior')
      ? [{ tipo: 'mudanca', antes: rotuloStatusDaDemanda(texto(dados, 'statusAnterior')), depois: rotuloStatusDaDemanda('CONCLUIDA'), diff: false }]
      : [],
    // O aviso das atividades que continuam abertas precisa ser lido antes de confirmar.
    exigeCartaoGrande: numero(dados, 'atividadesEmAberto') > 0,
  }),
  [TipoPropostaIaEnum.MOVER_ATIVIDADE]: (dados) => ({
    acao: 'Mover atividade',
    nome: nomeOu(dados, 'atividadeNome', 'Atividade', 'atividadeId'),
    campos: [
      { tipo: 'mudanca', antes: nomeOu(dados, 'demandaOrigemNome', 'Demanda', 'demandaOrigemId'), depois: nomeOu(dados, 'demandaDestinoNome', 'Demanda', 'demandaDestinoId'), diff: false },
      { tipo: 'chip', texto: 'Execuções vão junto' },
    ],
  }),
  [TipoPropostaIaEnum.DESCONECTAR_DEMANDA]: (dados) => ({
    acao: 'Desconectar',
    nome: `${nomeOu(dados, 'demandaOrigemNome', 'Demanda', 'demandaOrigemId')} ${dados['ehBidirecional'] === true ? '↔' : '→'} ${nomeOu(dados, 'demandaDestinoNome', 'Demanda', 'demandaDestinoId')}`,
    campos: [{ tipo: 'chip', texto: 'As demandas ficam onde estão' }],
  }),
  [TipoPropostaIaEnum.EXCLUIR_ATIVIDADE]: (dados) => ({
    acao: 'Excluir atividade',
    nome: nomeOu(dados, 'atividadeNome', 'Atividade', 'atividadeId'),
    contexto: texto(dados, 'demandaNome'),
    campos: [{ tipo: 'chip', texto: 'Sem execuções' }],
  }),
  // A diferença do trecho é o que a pessoa vai conferir antes de aceitar: sempre cartão grande.
  [TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO]: (dados) => ({
    acao: 'Alterar trecho do plano',
    nome: texto(dados, 'planoTitulo') || `Plano ${String(dados['planoId'] ?? '')}`.trim(),
    contexto: ROTULO_ABA_DO_PLANO[texto(dados, 'aba') as PlanoAbaEnum] ?? texto(dados, 'aba'),
    campos: [],
    exigeCartaoGrande: true,
  }),
  [TipoPropostaIaEnum.JUSTIFICAR_PONTO]: (dados) => ({
    acao: comPessoa('Justificar ponto', dados),
    nome: texto(dados, 'nome'),
    contexto: dataBr(texto(dados, 'diaData')),
    campos: [{ tipo: 'chip', texto: `${numero(dados, 'horasCobertas')} h cobertas` }, ...citacao(texto(dados, 'descricao'))],
  }),
  [TipoPropostaIaEnum.CONECTAR_DEMANDA]: (dados) => ({
    acao: 'Conectar',
    nome: `${nomeOu(dados, 'demandaOrigemNome', 'Demanda', 'demandaOrigemId')} ${dados['ehBidirecional'] === true ? '↔' : '→'} ${nomeOu(dados, 'demandaDestinoNome', 'Demanda', 'demandaDestinoId')}`,
    campos: citacao(texto(dados, 'motivo')),
  }),
};

/** Todo texto que a linha vai mostrar, para conferir o comprimento e as quebras de linha. */
function textosDoResumo(resumo: ResumoBruto): string[] {
  const textos = [resumo.nome, resumo.nomeAnterior ?? '', resumo.contexto ?? '', resumo.acao];
  for (const campo of resumo.campos) {
    if (campo.tipo === 'chip' || campo.tipo === 'citacao') textos.push(campo.texto);
    else if (campo.tipo === 'mudanca') textos.push(campo.antes, campo.depois);
  }
  return textos;
}

/**
 * O resumo de uma linha de qualquer proposta e se ela é compacta (task 226): poucos campos (no máximo `LIMITE_DE_CAMPOS_COMPACTO`), todo
 * texto curto (no máximo `LIMITE_DE_TEXTO_COMPACTO` caracteres e sem quebra de linha) e nada que o tipo marque como obrigatoriamente
 * grande. Na dúvida, grande: o usuário nunca confirma sem ver o que precisava ver.
 */
export function resumirProposta(tipo: TipoPropostaIaEnum, dados: Dados): ResumoDaProposta {
  const resumidor = RESUMIDORES[tipo];
  if (!resumidor) return { acao: tipo, nome: '', campos: [], compacto: false };
  const { exigeCartaoGrande, ...resumo } = resumidor(dados);
  const cabe =
    !exigeCartaoGrande &&
    resumo.campos.length <= LIMITE_DE_CAMPOS_COMPACTO &&
    textosDoResumo(resumo).every((conteudo) => conteudo.length <= LIMITE_DE_TEXTO_COMPACTO && !conteudo.includes('\n'));
  return { ...resumo, compacto: cabe };
}
