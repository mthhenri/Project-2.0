/** Duração como a conversa a diz: `45 min`, `1h30`, `2h40`. */
export function formatarDuracao(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  if (total < 60) return `${total} min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return `${horas}h${String(resto).padStart(2, '0')}`;
}

export interface DadosDoContextoDoCheckin {
  atividade: string;
  demanda: string;
  projeto: string;
  descricaoProvisoria: string;
  /** `HH:mm`, no fuso do sistema. */
  inicio: string;
  minutos: number;
  duracaoRecomendadaMinutos: number;
  rigorProporcional: boolean;
}

/**
 * O contexto do check-in, calculado no backend e somado ao prompt `CHECKIN` a cada mensagem (não é gravado como mensagem): a execução
 * e o tempo, o **rigor proporcional** (acima da duração recomendada pede mais detalhe antes de descrever; abaixo, vai direto à
 * descrição) e a regra de que a narrativa crua fica na conversa e só a descrição formal segue para a execução. Nunca é trava: qualquer
 * duração é aceita, o rigor só muda o que a IA pergunta.
 */
export function montarContextoDoCheckin(dados: DadosDoContextoDoCheckin): string {
  const acima = dados.minutos > dados.duracaoRecomendadaMinutos;
  const linhas = [
    '[Contexto do check-in — calculado pelo sistema, não é uma mensagem do usuário]',
    `Execução em andamento: "${dados.atividade}" (demanda "${dados.demanda}", projeto "${dados.projeto}"), iniciada às ${dados.inicio}, há ${formatarDuracao(dados.minutos)}.`,
    `Descrição provisória atual: "${dados.descricaoProvisoria || 'sem descrição'}".`,
    `Duração recomendada de uma execução: ${formatarDuracao(dados.duracaoRecomendadaMinutos)}.`,
    'O tempo desde o último check-in é o tempo desde o início desta execução. A conversa do check-in é sobre o que o desenvolvedor fez nesse tempo.',
  ];
  if (dados.rigorProporcional) {
    linhas.push(
      acima
        ? `A execução passou da duração recomendada (${formatarDuracao(dados.minutos)} contra ${formatarDuracao(dados.duracaoRecomendadaMinutos)}): antes de escrever a descrição, peça mais detalhe, por exemplo "foram ${formatarDuracao(dados.minutos)}, teve mais alguma coisa?". Isso não é uma trava: aceite o que ele disser.`
        : 'A duração está dentro do recomendado: vá direto à descrição assim que tiver o essencial e não insista em detalhes.',
    );
  }
  linhas.push(
    'Pergunte o que foi feito desde o último check-in, de forma curta. Quando tiver o suficiente, escreva a descrição formal do trabalho: terceira pessoa, sem "eu", sem gírias, objetiva, só trabalho (nunca almoço ou pausa pessoal), numa seção iniciada por "**Descrição proposta:**".',
    'A narrativa crua do desenvolvedor fica nesta conversa; só a descrição formal vai para a execução.',
  );
  return linhas.join('\n');
}
