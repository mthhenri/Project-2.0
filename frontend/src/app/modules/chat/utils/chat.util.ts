import { ChatEventoDto, NivelIaEnum, StatusPropostaIaEnum, TipoPropostaIaEnum } from '@project20/shared';

/**
 * Lê o fluxo `text/event-stream` do chat: cada evento é uma linha `data: {json}` terminada por uma linha em branco. Recebe o texto
 * acumulado (os pedaços chegam cortados em qualquer ponto) e devolve os eventos completos e o resto ainda incompleto.
 */
export function extrairEventos(acumulado: string): { eventos: ChatEventoDto[]; resto: string } {
  const eventos: ChatEventoDto[] = [];
  const blocos = acumulado.split('\n\n');
  const resto = blocos.pop() ?? '';
  for (const bloco of blocos) {
    const dados = bloco
      .split('\n')
      .filter((linha) => linha.startsWith('data:'))
      .map((linha) => linha.slice(5).trimStart())
      .join('\n');
    if (!dados) continue;
    try {
      eventos.push(JSON.parse(dados) as ChatEventoDto);
    } catch {
      // Evento malformado: ignora, o fluxo continua.
    }
  }
  return { eventos, resto };
}

export const ROTULO_NIVEL: Record<NivelIaEnum, string> = {
  [NivelIaEnum.RAPIDO]: 'rápido',
  [NivelIaEnum.PADRAO]: 'padrão',
  [NivelIaEnum.ANALITICO]: 'analítico',
};

export const ROTULO_TIPO_PROPOSTA: Record<TipoPropostaIaEnum, string> = {
  [TipoPropostaIaEnum.INICIAR_EXECUCAO]: 'Iniciar execução',
  [TipoPropostaIaEnum.PAUSAR_EXECUCAO]: 'Pausar execução',
  [TipoPropostaIaEnum.CRIAR_ATIVIDADE]: 'Criar atividade',
  [TipoPropostaIaEnum.DESCREVER_EXECUCAO]: 'Descrever execução',
  [TipoPropostaIaEnum.SUSPENDER_CHECKIN]: 'Suspender check-ins',
  [TipoPropostaIaEnum.ANOTAR_PAD]: 'Anotar no pad',
  [TipoPropostaIaEnum.CRIAR_DEMANDA]: 'Criar demanda',
  [TipoPropostaIaEnum.DESCREVER_DEMANDA]: 'Descrever demanda',
  [TipoPropostaIaEnum.CONECTAR_DEMANDA]: 'Conectar demanda',
};

export const ROTULO_STATUS_PROPOSTA: Record<StatusPropostaIaEnum, string> = {
  [StatusPropostaIaEnum.PENDENTE]: 'Aguardando você',
  [StatusPropostaIaEnum.CONFIRMADA]: 'Confirmada',
  [StatusPropostaIaEnum.AJUSTADA]: 'Ajustada e confirmada',
  [StatusPropostaIaEnum.EXPIRADA]: 'Recusada ou expirada',
  [StatusPropostaIaEnum.DESFEITA]: 'Desfeita',
};

export const SEVERIDADE_STATUS_PROPOSTA: Record<StatusPropostaIaEnum, 'warn' | 'success' | 'secondary' | 'info'> = {
  [StatusPropostaIaEnum.PENDENTE]: 'warn',
  [StatusPropostaIaEnum.CONFIRMADA]: 'success',
  [StatusPropostaIaEnum.AJUSTADA]: 'success',
  [StatusPropostaIaEnum.EXPIRADA]: 'secondary',
  [StatusPropostaIaEnum.DESFEITA]: 'info',
};

/** Os dados da proposta como pares legíveis (o resumo por tipo vem com os executores, blocos 6, 8 e 9). */
export function paresDosDados(dados: Record<string, unknown>): { chave: string; valor: string }[] {
  return Object.entries(dados).map(([chave, valor]) => ({
    chave,
    valor: typeof valor === 'string' ? valor : JSON.stringify(valor),
  }));
}
