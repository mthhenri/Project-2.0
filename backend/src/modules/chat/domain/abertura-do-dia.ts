/** O que a abertura do dia precisa saber do instante em que o usuário abriu o chat (tudo no fuso do sistema). */
export interface DadosDaAberturaDoDia {
  /** `HH:mm`. */
  hora: string;
  diaDaSemana: string;
  /** `dd/MM`. */
  hoje: string;
  /** `dd/MM` do dia útil anterior: onde olhar o que foi feito. */
  diaUtilAnterior: string;
}

/**
 * A instrução de abertura do dia (o "bom dia proativo"). Vai ao modelo como a primeira mensagem do usuário **sem ser gravada como
 * mensagem do chat**; fica no conteúdo bruto da resposta, para as mensagens seguintes do dia terem o mesmo contexto.
 */
export function montarAberturaDoDia(dados: DadosDaAberturaDoDia): string {
  return [
    '[Abertura do dia — instrução do sistema, não é uma mensagem do usuário] O usuário acabou de abrir o chat pela primeira vez hoje.',
    `Agora são ${dados.hora} de ${dados.diaDaSemana}, ${dados.hoje}; o dia útil anterior foi ${dados.diaUtilAnterior}.`,
    'Cumprimente de acordo com a hora (bom dia, boa tarde ou boa noite), sem inventar o nome do usuário.',
    'Antes de escrever, use as ferramentas: consultar_pad (EM_ANDAMENTO, PENDENCIA, LEMBRETE e o FEITO do dia útil anterior, com diaDoFeito), ',
    'listar_minhas_atividades e consultar_execucao_ativa.',
    'Depois apresente, de forma breve, o plano do dia: as atividades em aberto em ordem de prioridade (com a demanda) e, se o pad disser, onde o usuário parou ("ontem você parou em…"), ',
    'os lembretes do dia e se há execução em andamento. Não invente nada: se não houver atividades nem anotações, diga que o dia está livre.',
    'Não proponha nenhuma ação agora; termine perguntando por onde ele quer começar.',
  ].join(' ');
}
