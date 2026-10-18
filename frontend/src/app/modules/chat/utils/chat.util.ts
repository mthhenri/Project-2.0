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
  [TipoPropostaIaEnum.ALTERAR_ATIVIDADE]: 'Alterar atividade',
  [TipoPropostaIaEnum.REGISTRAR_EXECUCAO]: 'Registrar execução',
  [TipoPropostaIaEnum.CORRIGIR_EXECUCAO]: 'Corrigir execução',
  [TipoPropostaIaEnum.ALTERAR_DEMANDA]: 'Alterar demanda',
  [TipoPropostaIaEnum.CRIAR_PROJETO]: 'Criar projeto',
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

/** Duração como o cartão a diz: `45 min`, `1h30`, `2h40`. */
export function formatarDuracao(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  if (total < 60) return `${total} min`;
  return `${Math.floor(total / 60)}h${String(total % 60).padStart(2, '0')}`;
}

/** O dia (`yyyy-mm-dd`) de uma conversa, que é o final do `conversaId` (`<usuarioId>-<yyyy-mm-dd>`). */
export function dataDaConversa(conversaId: string): string {
  return conversaId.slice(-10);
}

const MILISSEGUNDOS_POR_DIA = 86_400_000;

function emUtc(data: string): number {
  const [ano, mes, dia] = data.split('-').map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

/** "Hoje", "Ontem" ou "sex., 17/10/2026" para um dia da lista do histórico; `hoje` vem do servidor (o fuso é o do sistema). */
export function rotuloDoDia(data: string, hoje: string): string {
  const diferenca = Math.round((emUtc(hoje) - emUtc(data)) / MILISSEGUNDOS_POR_DIA);
  if (diferenca === 0) return 'Hoje';
  if (diferenca === 1) return 'Ontem';
  const diaDaSemana = new Date(emUtc(data)).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' });
  const [ano, mes, dia] = data.split('-');
  return `${diaDaSemana}, ${dia}/${mes}/${ano}`;
}

/** O texto sem a marcação do Markdown (`*`, `#`, crases, citação) e numa linha só, para trechos curtos como o item do histórico. */
export function semMarcacaoMarkdown(texto: string): string {
  return texto
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
