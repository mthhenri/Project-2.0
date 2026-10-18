/** O que a instrução de retomada precisa saber (tudo no fuso do sistema, exceto `desde`, que vai em ISO para a ferramenta). */
export interface DadosDaRetomada {
  /** `HH:mm` de agora. */
  hora: string;
  /** `HH:mm` da última mensagem da conversa de hoje. */
  horaDaUltimaMensagem: string;
  /** O instante da última mensagem (ISO 8601): o `desde` da ferramenta `consultar_mudancas_da_queda`. */
  desde: string;
  /** Quantas propostas pendentes ficaram obsoletas e foram descartadas na volta. */
  propostasDescartadas: number;
}

/**
 * A instrução de retomada (task 158): vai ao modelo como a última mensagem do usuário **sem ser gravada como mensagem do chat**, e fica
 * no conteúdo bruto da resposta, como a abertura do dia. A IA lê o estado real e continua dali.
 */
export function montarRetomadaAposQueda(dados: DadosDaRetomada): string {
  return [
    '[Retomada — instrução do sistema, não é uma mensagem do usuário] A IA ficou indisponível por um tempo e voltou; o usuário acabou de voltar ao chat.',
    `Agora são ${dados.hora}; a última mensagem desta conversa foi às ${dados.horaDaUltimaMensagem}.`,
    `Antes de escrever, use as ferramentas: consultar_mudancas_da_queda com desde="${dados.desde}" (o que o usuário fez à mão no sistema desde então) e consultar_execucao_ativa.`,
    'Diga, em poucas frases, o que mudou (execução iniciada ou pausada, atividades criadas) e qual é a situação agora (se há execução em andamento), e continue dali.',
    'Se nada mudou, diga só que está tudo como estava. Não invente nada e não proponha nenhuma ação agora; termine perguntando como pode ajudar.',
    dados.propostasDescartadas > 0
      ? `${dados.propostasDescartadas === 1 ? 'Uma proposta pendente ficou obsoleta' : `${dados.propostasDescartadas} propostas pendentes ficaram obsoletas`} porque o estado mudou e ${dados.propostasDescartadas === 1 ? 'foi descartada' : 'foram descartadas'}: avise em uma frase.`
      : '',
  ]
    .filter((linha) => linha !== '')
    .join(' ');
}
