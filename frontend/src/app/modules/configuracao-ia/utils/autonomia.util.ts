import { ChaveDeNivelDaProposta, CHAVES_CONFIGURAVEIS_DE_NIVEL, PropostaIaNivelEnum, REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA, TipoPropostaIaEnum, TIPOS_COM_NIVEL_FIXO } from '@project20/shared';
import { OpcaoDoSelect } from './configuracao-ia.util';

/** Uma regra que o administrador configura no painel de autonomia (task 228). */
export interface RegraDeAutonomia {
  chave: ChaveDeNivelDaProposta;
  rotulo: string;
  /** O que a regra cobre, em uma frase curta. */
  descricao: string;
}

/** Um caso que sempre pergunta: sem escolha, com o motivo no `pTooltip` do escudo. */
export interface RegraFixaDeAutonomia {
  rotulo: string;
  descricao: string;
  motivo: string;
}

/** As escolhas do painel: o `SEMPRE_PERGUNTA` não se escolhe, ele é o escudo das regras fixas. */
export const OPCOES_DE_NIVEL: OpcaoDoSelect<PropostaIaNivelEnum>[] = [
  { valor: PropostaIaNivelEnum.FAZ_E_AVISA, rotulo: 'Faz e avisa' },
  { valor: PropostaIaNivelEnum.PERGUNTA, rotulo: 'Pergunta' },
];

/** O que cada nível quer dizer, mostrado no alto do painel. */
export const EXPLICACAO_DOS_NIVEIS: Record<PropostaIaNivelEnum, string> = {
  [PropostaIaNivelEnum.FAZ_E_AVISA]: 'A IA executa na hora e deixa uma linha na conversa, com Desfazer por 30 minutos.',
  [PropostaIaNivelEnum.PERGUNTA]: 'Nada acontece até o usuário confirmar no cartão da conversa.',
  [PropostaIaNivelEnum.SEMPRE_PERGUNTA]: 'Fixo: a IA sempre pergunta, e isto não se configura.',
};

const DESCRICAO_DA_REGRA: Record<ChaveDeNivelDaProposta, Pick<RegraDeAutonomia, 'rotulo' | 'descricao'>> = {
  [TipoPropostaIaEnum.ANOTAR_PAD]: { rotulo: 'Anotar no pad', descricao: 'Nas seções do próprio pad, menos a Pessoal.' },
  [TipoPropostaIaEnum.ATRIBUIR_TAG]: { rotulo: 'Colocar e tirar tags', descricao: 'Em demandas e atividades.' },
  [TipoPropostaIaEnum.DESCREVER_EXECUCAO]: { rotulo: 'Descrever a execução', descricao: 'Continuando na mesma atividade ou trocando para outra.' },
  [TipoPropostaIaEnum.CONECTAR_DEMANDA]: { rotulo: 'Conectar e desconectar demandas', descricao: 'No grafo do projeto. Só gestor.' },
  [TipoPropostaIaEnum.CRIAR_ATIVIDADE]: { rotulo: 'Criar atividade', descricao: 'No próprio trabalho.' },
  [TipoPropostaIaEnum.INICIAR_EXECUCAO]: { rotulo: 'Iniciar execução', descricao: 'A própria execução.' },
  [TipoPropostaIaEnum.PAUSAR_EXECUCAO]: { rotulo: 'Pausar execução', descricao: 'A própria execução.' },
  [REGRA_MARCAR_ATIVIDADE_DESENVOLVIDA]: { rotulo: 'Marcar atividade como desenvolvida', descricao: 'Só a própria atividade, sem outra mudança junto.' },
  [TipoPropostaIaEnum.ALTERAR_ATIVIDADE]: { rotulo: 'Alterar atividade', descricao: 'Status, prioridade e nome.' },
  [TipoPropostaIaEnum.CONCLUIR_DEMANDA]: { rotulo: 'Concluir demanda', descricao: 'As atividades abertas continuam como estão.' },
  [TipoPropostaIaEnum.MOVER_ATIVIDADE]: { rotulo: 'Mover atividade para outra demanda', descricao: 'Dono da atividade e gestor; as execuções vão junto.' },
  [TipoPropostaIaEnum.DESCONECTAR_DEMANDA]: { rotulo: 'Desconectar demandas', descricao: 'Tira só a ligação do grafo; as demandas ficam onde estão. Só gestor.' },
  [TipoPropostaIaEnum.EXCLUIR_ATIVIDADE]: { rotulo: 'Excluir atividade sem execução', descricao: 'Só atividade que nunca teve execução; dono e gestor. Desfazer restaura.' },
  [TipoPropostaIaEnum.CRIAR_DEMANDA]: { rotulo: 'Criar demanda', descricao: 'Inclusive a estrutura de um projeto novo.' },
  [TipoPropostaIaEnum.ALTERAR_DEMANDA]: { rotulo: 'Alterar demanda', descricao: 'Nome, status, prazo e documentação.' },
  [TipoPropostaIaEnum.DESCREVER_DEMANDA]: { rotulo: 'Descrever demanda', descricao: 'Os textos para o cliente e o técnico. Só gestor.' },
  [TipoPropostaIaEnum.SUSPENDER_CHECKIN]: { rotulo: 'Suspender e retomar o check-in', descricao: 'Os check-ins do próprio usuário.' },
  [TipoPropostaIaEnum.ATRIBUIR_MEMBRO]: { rotulo: 'Entrar numa demanda', descricao: 'O próprio usuário participando ou saindo.' },
  [TipoPropostaIaEnum.REGISTRAR_EXECUCAO]: { rotulo: 'Registrar execução', descricao: '' },
  [TipoPropostaIaEnum.CORRIGIR_EXECUCAO]: { rotulo: 'Corrigir execução', descricao: '' },
  [TipoPropostaIaEnum.CRIAR_PROJETO]: { rotulo: 'Criar projeto', descricao: '' },
};

/** As regras configuráveis, na ordem do `shared`. */
export const REGRAS_DE_AUTONOMIA: RegraDeAutonomia[] = CHAVES_CONFIGURAVEIS_DE_NIVEL.map((chave) => ({ chave, ...DESCRICAO_DA_REGRA[chave] }));

const MOTIVO_HORAS = 'Mexe em horas trabalhadas: a IA sempre pergunta.';

const REGRAS_FIXAS_POR_TIPO: Partial<Record<TipoPropostaIaEnum, Pick<RegraFixaDeAutonomia, 'descricao' | 'motivo'>>> = {
  [TipoPropostaIaEnum.REGISTRAR_EXECUCAO]: { descricao: 'Lançar horas que não foram cronometradas. Só gestor.', motivo: MOTIVO_HORAS },
  [TipoPropostaIaEnum.CORRIGIR_EXECUCAO]: { descricao: 'Mudar horário e duração de uma execução já registrada.', motivo: MOTIVO_HORAS },
  [TipoPropostaIaEnum.CRIAR_PROJETO]: { descricao: 'Um projeto novo, com código próprio. Só gestor.', motivo: 'Cria um projeto: a IA sempre pergunta.' },
};

/**
 * O que a IA sempre pergunta, sem escolha: os tipos fixos (horas e projeto) e os dois casos de qualquer tipo (o que é de outra pessoa e a seção
 * Pessoal do pad). A lista de tipos vem do `shared`; o texto de cada um, daqui.
 */
export const REGRAS_FIXAS_DE_AUTONOMIA: RegraFixaDeAutonomia[] = [
  ...TIPOS_COM_NIVEL_FIXO.map((tipo) => ({ rotulo: DESCRICAO_DA_REGRA[tipo].rotulo, descricao: REGRAS_FIXAS_POR_TIPO[tipo]?.descricao ?? '', motivo: REGRAS_FIXAS_POR_TIPO[tipo]?.motivo ?? 'A IA sempre pergunta.' })),
  { rotulo: 'Qualquer ação em nome de outra pessoa', descricao: 'Iniciar, pausar, criar atividade ou pôr membro para outro. Só gestor.', motivo: 'Mexe no trabalho de outra pessoa: a IA sempre pergunta.' },
  { rotulo: 'Anotar na seção Pessoal do pad', descricao: 'Só quando o usuário pede de forma explícita.', motivo: 'A seção Pessoal é do usuário: a IA sempre pergunta.' },
];
