/** Quantas sugestões voltam e o tamanho máximo de cada uma (cabem num botão). */
export const MAXIMO_DE_SUGESTOES = 4;
export const MAXIMO_DE_CARACTERES_DA_SUGESTAO = 60;

/** Instrução da chamada curta que sugere as próximas mensagens do usuário. */
export const INSTRUCOES_DE_SUGESTOES =
  'Sugira de 2 a 4 mensagens curtas (até 7 palavras cada) que o usuário poderia enviar agora, como respostas ou próximos passos naturais da conversa, ' +
  'em português, em primeira pessoa e sem ponto final. Não repita o que ele já disse e não invente fatos. Responda somente com um array JSON de textos, por exemplo ["Começar pela primeira", "Criar uma atividade"].';

/**
 * O que cada ferramenta permite o usuário pedir, em uma frase. A chamada de sugestões lista só as frases das ferramentas que **o tipo de
 * usuário pode usar** (o registro já filtra por permissão): sem isso o modelo rápido só repete o que a conversa já tinha e nunca lembra, por
 * exemplo, que dá para registrar um horário ou corrigir uma execução. Ferramenta sem frase aqui simplesmente não entra na lista.
 */
export const FRASE_DA_FERRAMENTA: Readonly<Record<string, string>> = {
  listar_minhas_atividades: 'ver as atividades em aberto e as prioridades',
  listar_minhas_execucoes_do_dia: 'ver o que foi feito num dia',
  consultar_execucao_ativa: 'ver no que está trabalhando agora',
  consultar_ponto_do_dia: 'ver as horas do dia e quanto falta para a meta',
  consultar_ponto_do_mes: 'ver as horas e o saldo do mês',
  consultar_dias_nao_uteis: 'ver feriados e recessos',
  consultar_pad: 'ver o pad de anotações',
  propor_anotar_pad: 'anotar algo no pad',
  propor_criar_atividade: 'criar uma atividade (o gestor também para outra pessoa)',
  propor_alterar_atividade: 'mudar o status, a prioridade ou o nome de uma atividade, ou marcá-la como pronta',
  propor_iniciar_execucao: 'começar uma atividade (o gestor também a de outra pessoa)',
  propor_pausar_execucao: 'pausar a execução em andamento, por exemplo para o almoço',
  propor_descrever_execucao: 'descrever o que foi feito na execução em andamento',
  propor_corrigir_execucao: 'corrigir o horário ou a descrição de uma execução (por exemplo, esqueceu de pausar)',
  propor_registrar_execucao: 'registrar o horário de um trabalho que ninguém iniciou (só o gestor)',
  propor_suspender_checkin: 'suspender os check-ins por um tempo',
  propor_retomar_checkin: 'retomar os check-ins',
  listar_projetos: 'ver os projetos',
  propor_criar_projeto: 'criar um projeto',
  listar_demandas_do_projeto: 'ver as demandas de um projeto',
  listar_minhas_demandas: 'ver as demandas atribuídas a mim',
  consultar_grafo_do_projeto: 'ver como as demandas de um projeto se conectam',
  propor_criar_demanda: 'criar uma demanda',
  propor_descrever_demanda: 'descrever uma demanda a partir de uma entrevista',
  propor_conectar_demanda: 'conectar duas demandas',
  propor_alterar_demanda: 'concluir, renomear, reestimar ou replanejar uma demanda',
  propor_atribuir_membro: 'entrar ou sair de uma demanda (o gestor também coloca ou tira outra pessoa)',
  propor_atribuir_tag: 'marcar atividades com tags (o gestor também as demandas)',
  listar_tags: 'ver as tags',
  listar_usuarios: 'ver quem está na equipe',
  listar_execucoes_da_equipe_no_dia: 'ver o que a equipe fez no dia',
  listar_atividades_paradas: 'ver atividades paradas da equipe',
  consultar_relatorio_de_execucoes: 'ver quanto tempo um projeto consumiu num período',
};

/** A instrução das sugestões, com a lista do que a IA consegue fazer para este usuário (as frases das ferramentas que ele pode usar). */
export function montarInstrucoesDeSugestoes(nomesDasFerramentas: readonly string[]): string {
  const frases = [...new Set(nomesDasFerramentas.map((nome) => FRASE_DA_FERRAMENTA[nome]).filter((frase): frase is string => !!frase))];
  if (frases.length === 0) return INSTRUCOES_DE_SUGESTOES;
  return (
    `${INSTRUCOES_DE_SUGESTOES}\n\nO que a IA consegue fazer por este usuário: ${frases.join('; ')}.\n` +
    'Entre as sugestões, inclua ao menos uma ação possível dessa lista que a conversa ainda não usou e que faça sentido agora (por exemplo, depois de criar uma atividade, começá-la). ' +
    'Nunca sugira o que não está na lista.'
  );
}

/** Lê a resposta do modelo (um array JSON, com ou sem cercas de código) e devolve só sugestões válidas, únicas e no tamanho; vazio se não der. */
export function interpretarSugestoes(textoDoModelo: string): string[] {
  const miolo = textoDoModelo.replace(/```(?:json)?/gi, '').trim();
  const inicio = miolo.indexOf('[');
  const fim = miolo.lastIndexOf(']');
  if (inicio === -1 || fim <= inicio) return [];
  try {
    const lido: unknown = JSON.parse(miolo.slice(inicio, fim + 1));
    if (!Array.isArray(lido)) return [];
    const vistas = new Set<string>();
    for (const item of lido) {
      if (typeof item !== 'string') continue;
      const limpa = item.replace(/["'`]/g, '').replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '');
      if (limpa.length >= 2 && limpa.length <= MAXIMO_DE_CARACTERES_DA_SUGESTAO) vistas.add(limpa);
      if (vistas.size === MAXIMO_DE_SUGESTOES) break;
    }
    return [...vistas];
  } catch {
    return [];
  }
}
