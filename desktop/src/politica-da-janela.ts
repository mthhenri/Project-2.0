/** O que o app sabe sobre o próprio encerramento (decide se um pedido de fechar vale ou só minimiza). */
export interface EstadoDeEncerramento {
  /** O usuário escolheu e confirmou "Fechar completamente" na bandeja. */
  saidaConfirmada: boolean;
  /** O sistema operacional está desligando, reiniciando ou encerrando a sessão. */
  encerramentoDoSistema: boolean;
}

export type DecisaoDeFechamento = 'fechar' | 'minimizar';

/**
 * O Project Desktop nunca fecha por conta própria: fechar, Alt+F4 e equivalentes só minimizam. Só vale o fechamento confirmado pelo
 * usuário na bandeja ou o pedido do sistema operacional (que o app jamais impede, para não travar o desligamento).
 */
export function decidirFechamento(estado: EstadoDeEncerramento): DecisaoDeFechamento {
  return estado.saidaConfirmada || estado.encerramentoDoSistema ? 'fechar' : 'minimizar';
}

/** Os limites da janela de tela cheia: o monitor principal inteiro. */
export interface AreaDeTrabalho {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A janela está fora da área do monitor principal (foi arrastada ou redimensionada)? Então precisa voltar. Maximizada está sempre
 * no lugar; restaurada, ela volta ao tamanho de abertura (a área inteira), então só um arrasto de borda a desloca.
 */
export function janelaForaDoLugar(janela: AreaDeTrabalho, area: AreaDeTrabalho, maximizada: boolean): boolean {
  if (maximizada) return false;
  return janela.x !== area.x || janela.y !== area.y || janela.width !== area.width || janela.height !== area.height;
}

/** Mantém uma janela solta inteira dentro da área de trabalho do monitor (a janelinha do check-in arrasta, mas não sai da tela). */
export function limitarAoMonitor(janela: AreaDeTrabalho, area: AreaDeTrabalho): AreaDeTrabalho {
  const x = Math.min(Math.max(janela.x, area.x), Math.max(area.x, area.x + area.width - janela.width));
  const y = Math.min(Math.max(janela.y, area.y), Math.max(area.y, area.y + area.height - janela.height));
  return { x, y, width: janela.width, height: janela.height };
}

export type DestinoDaNavegacao = 'dentro' | 'navegador';

/** Links do próprio Project abrem na janela; qualquer outro endereço vai para o navegador do sistema. */
export function destinoDaNavegacao(urlDestino: string, urlDoProject: string): DestinoDaNavegacao {
  try {
    return new URL(urlDestino).origin === new URL(urlDoProject).origin ? 'dentro' : 'navegador';
  } catch {
    return 'navegador';
  }
}

/** O endereço do front: a constante do app, ou o que o ambiente manda no desenvolvimento (`PROJECT_DESKTOP_URL`). */
export function resolverUrlDoProject(padrao: string, ambiente: Record<string, string | undefined>): string {
  const informada = ambiente['PROJECT_DESKTOP_URL']?.trim();
  if (!informada) return padrao;
  try {
    new URL(informada);
    return informada;
  } catch {
    return padrao;
  }
}

/** O texto do item de tempo no menu da bandeja: indisponível até o backend informar o próximo check-in (task 161). */
export function textoDoProximoCheckin(restanteEmSegundos: number | null): string {
  if (restanteEmSegundos === null) return 'Próximo check-in: indisponível';
  const total = Math.max(0, Math.floor(restanteEmSegundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const dois = (valor: number) => String(valor).padStart(2, '0');
  return horas > 0 ? `Próximo check-in em ${horas}:${dois(minutos)}:${dois(segundos)}` : `Próximo check-in em ${dois(minutos)}:${dois(segundos)}`;
}
