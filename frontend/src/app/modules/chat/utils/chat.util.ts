import { ChatEventoDto, NivelIaEnum, StatusPropostaIaEnum, TipoPropostaIaEnum } from '@project20/shared';

/**
 * Lê o fluxo `text/event-stream` do chat: cada evento é uma linha `data: {json}` terminada por uma linha em branco. Recebe o texto
 * acumulado (os pedaços chegam cortados em qualquer ponto) e devolve os eventos completos e o resto ainda incompleto. O tipo do evento é
 * o do chat com a IA por padrão; o chat entre colaboradores (task 210) lê o mesmo formato com o seu.
 */
export function extrairEventos<TEvento = ChatEventoDto>(acumulado: string): { eventos: TEvento[]; resto: string } {
  const eventos: TEvento[] = [];
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
      eventos.push(JSON.parse(dados) as TEvento);
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

/** Os botões de quando a conversa ainda não tem sugestão da IA: o que mais se faz por aqui, por tipo de usuário. */
export function sugestoesIniciais(eGestor: boolean): string[] {
  return eGestor
    ? ['O que a equipe fez hoje?', 'Registrar o horário de alguém', 'Criar uma atividade para alguém', 'Criar uma demanda']
    : ['O que eu tenho pra fazer hoje?', 'Quero começar uma atividade', 'Corrigir um horário de ontem', 'Anotar algo no pad'];
}

/** Os próximos passos naturais depois de resolver uma proposta (a IA não responde de novo ao clique no cartão, então os botões não mudariam). */
const PROXIMOS_PASSOS_DA_PROPOSTA: Partial<Record<TipoPropostaIaEnum, { todos?: string[]; gestor?: string[]; desenvolvedor?: string[] }>> = {
  [TipoPropostaIaEnum.CRIAR_ATIVIDADE]: { todos: ['Começar essa atividade', 'Criar outra atividade nessa demanda'], gestor: ['Registrar o horário dessa atividade'], desenvolvedor: ['Anotar algo no pad'] },
  [TipoPropostaIaEnum.ALTERAR_ATIVIDADE]: { todos: ['O que mais eu tenho pra fazer?', 'Começar uma atividade'] },
  [TipoPropostaIaEnum.INICIAR_EXECUCAO]: { todos: ['Pausar essa execução', 'Vou almoçar', 'Trocar para outra atividade'] },
  [TipoPropostaIaEnum.PAUSAR_EXECUCAO]: { todos: ['Começar outra atividade', 'Quanto falta para fechar o dia?', 'O que eu fiz hoje?'] },
  [TipoPropostaIaEnum.DESCREVER_EXECUCAO]: { todos: ['Como está meu dia?', 'Começar outra atividade'] },
  [TipoPropostaIaEnum.REGISTRAR_EXECUCAO]: { todos: ['Registrar outro horário', 'Quanto ele fez no mês?'] },
  [TipoPropostaIaEnum.CORRIGIR_EXECUCAO]: { todos: ['Corrigir outra execução', 'Quanto falta para fechar o dia?'] },
  [TipoPropostaIaEnum.CRIAR_PROJETO]: { todos: ['Criar uma demanda nesse projeto', 'Colocar alguém numa demanda'] },
  [TipoPropostaIaEnum.CRIAR_DEMANDA]: { todos: ['Criar atividades nessa demanda'], gestor: ['Conectar essa demanda a outra', 'Descrever essa demanda'] },
  [TipoPropostaIaEnum.DESCREVER_DEMANDA]: { todos: ['Criar atividades nessa demanda', 'Colocar alguém nessa demanda'] },
  [TipoPropostaIaEnum.ALTERAR_DEMANDA]: { todos: ['Criar uma atividade nessa demanda', 'Alterar outra demanda'], gestor: ['Marcar tags nessa demanda'] },
  [TipoPropostaIaEnum.CONECTAR_DEMANDA]: { todos: ['Conectar outra demanda', 'Mostrar como as demandas se conectam'] },
  [TipoPropostaIaEnum.CONCLUIR_DEMANDA]: { todos: ['O que eu tenho pra fazer hoje?', 'Concluir outra demanda'] },
  [TipoPropostaIaEnum.MOVER_ATIVIDADE]: { todos: ['Começar essa atividade', 'Mover outra atividade'] },
  [TipoPropostaIaEnum.DESCONECTAR_DEMANDA]: { todos: ['Mostrar como as demandas se conectam'], gestor: ['Conectar outras duas demandas'] },
  [TipoPropostaIaEnum.JUSTIFICAR_PONTO]: { todos: ['Justificar outro dia', 'Mostrar o ponto dele no mês'] },
  [TipoPropostaIaEnum.EXCLUIR_ATIVIDADE]: { todos: ['O que eu tenho pra fazer hoje?', 'Criar outra atividade'] },
  [TipoPropostaIaEnum.ATRIBUIR_MEMBRO]: { todos: ['O que eu tenho pra fazer hoje?'], gestor: ['Criar uma atividade para ele', 'Marcar tags nessa demanda'] },
  [TipoPropostaIaEnum.ATRIBUIR_TAG]: { todos: ['Marcar outra atividade'], gestor: ['Marcar outra demanda', 'Quanto tempo o projeto consumiu este mês?'] },
  [TipoPropostaIaEnum.ANOTAR_PAD]: { todos: ['Mostrar meu pad', 'O que eu tenho pra fazer hoje?'] },
  [TipoPropostaIaEnum.SUSPENDER_CHECKIN]: { todos: ['Retomar os check-ins', 'O que eu tenho pra fazer hoje?'] },
};

/**
 * Os botões depois de o usuário **resolver** uma proposta. Só confirmar (ou ajustar e confirmar) abre um próximo passo; recusar, desfazer
 * e expirar devolvem a lista vazia (a tela volta às sugestões de antes).
 */
export function sugestoesAposProposta(tipo: TipoPropostaIaEnum, status: StatusPropostaIaEnum, eGestor: boolean): string[] {
  if (status !== StatusPropostaIaEnum.CONFIRMADA && status !== StatusPropostaIaEnum.AJUSTADA) return [];
  const passos = PROXIMOS_PASSOS_DA_PROPOSTA[tipo];
  if (!passos) return [];
  return [...(passos.todos ?? []), ...((eGestor ? passos.gestor : passos.desenvolvedor) ?? [])].slice(0, 4);
}

export const ROTULO_TIPO_PROPOSTA: Record<TipoPropostaIaEnum, string> = {
  [TipoPropostaIaEnum.INICIAR_EXECUCAO]: 'Iniciar execução',
  [TipoPropostaIaEnum.PAUSAR_EXECUCAO]: 'Pausar execução',
  [TipoPropostaIaEnum.CRIAR_ATIVIDADE]: 'Criar atividade',
  [TipoPropostaIaEnum.ALTERAR_ATIVIDADE]: 'Alterar atividade',
  [TipoPropostaIaEnum.REGISTRAR_EXECUCAO]: 'Registrar execução',
  [TipoPropostaIaEnum.CORRIGIR_EXECUCAO]: 'Corrigir execução',
  [TipoPropostaIaEnum.ALTERAR_DEMANDA]: 'Alterar demanda',
  [TipoPropostaIaEnum.ATRIBUIR_MEMBRO]: 'Atribuir membro',
  [TipoPropostaIaEnum.ATRIBUIR_TAG]: 'Atribuir tags',
  [TipoPropostaIaEnum.CRIAR_PROJETO]: 'Criar projeto',
  [TipoPropostaIaEnum.DESCREVER_EXECUCAO]: 'Descrever execução',
  [TipoPropostaIaEnum.SUSPENDER_CHECKIN]: 'Suspender check-ins',
  [TipoPropostaIaEnum.ANOTAR_PAD]: 'Anotar no pad',
  [TipoPropostaIaEnum.CRIAR_DEMANDA]: 'Criar demanda',
  [TipoPropostaIaEnum.DESCREVER_DEMANDA]: 'Descrever demanda',
  [TipoPropostaIaEnum.CONECTAR_DEMANDA]: 'Conectar demanda',
  [TipoPropostaIaEnum.CONCLUIR_DEMANDA]: 'Concluir demanda',
  [TipoPropostaIaEnum.MOVER_ATIVIDADE]: 'Mover atividade',
  [TipoPropostaIaEnum.DESCONECTAR_DEMANDA]: 'Desconectar demandas',
  [TipoPropostaIaEnum.EXCLUIR_ATIVIDADE]: 'Excluir atividade',
  [TipoPropostaIaEnum.JUSTIFICAR_PONTO]: 'Justificar ponto',
  [TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO]: 'Alterar trecho do plano',
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

/** O limite de caracteres de uma mensagem para a IA (o `maxlength` do campo do chat). */
export const LIMITE_MENSAGEM_CHAT = 4000;
/** A partir daqui o campo mostra o contador (80% do limite). */
export const COMECO_DO_AVISO_DE_LIMITE = 3200;

/** Texto que chega pelo link (`/chat?mensagem=`) para ficar digitado no campo, sem enviar; vazio quando não há o que mostrar. */
export function mensagemInicialDoLink(valor: string | null | undefined, limite: number = LIMITE_MENSAGEM_CHAT): string {
  return (valor ?? '').trim().slice(0, limite);
}
