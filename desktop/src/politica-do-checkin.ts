/** O que o desktop precisa saber da situação do check-in (a leitura mínima de `GET /checkin/situacao`). */
export interface SituacaoDoCheckin {
  haCheckin: boolean;
  disparado: boolean;
  suspenso: boolean;
  /** Quando o backend sorteou o próximo check-in (ISO 8601), ou `null`. */
  proximoCheckinData: string | null;
}

/** Lê o corpo de `GET /checkin/situacao`; `null` se não tem o formato esperado. */
export function lerSituacao(corpo: unknown): SituacaoDoCheckin | null {
  const dados = (corpo as { dados?: Record<string, unknown> } | null)?.dados;
  if (!dados || typeof dados['haCheckin'] !== 'boolean' || typeof dados['disparado'] !== 'boolean') return null;
  const suspensao = dados['suspensao'] as { suspenso?: unknown } | undefined;
  const proximo = dados['proximoCheckinData'];
  return {
    haCheckin: dados['haCheckin'],
    disparado: dados['disparado'],
    suspenso: suspensao?.suspenso === true,
    proximoCheckinData: typeof proximo === 'string' ? proximo : null,
  };
}

/** Lê o corpo de `GET /ia/disponibilidade` (`NO_AR`, `FORA_DO_AR` ou `DESLIGADA`); `null` se não sabe. */
export function lerEstadoDaIa(corpo: unknown): string | null {
  const estado = (corpo as { dados?: { estado?: unknown } } | null)?.dados?.estado;
  return typeof estado === 'string' ? estado : null;
}

/** O check-in está exigindo uma resposta agora: execução em andamento, horário chegou e check-ins não suspensos. */
export function checkinExigido(situacao: SituacaoDoCheckin | null): boolean {
  return situacao !== null && situacao.haCheckin && situacao.disparado && !situacao.suspenso;
}

export interface EntradaParaAbrir {
  /** O Project principal está minimizado ou escondido (o usuário está em outro programa). */
  principalMinimizada: boolean;
  situacao: SituacaoDoCheckin | null;
  estadoDaIa: string | null;
  janelinhaAberta: boolean;
}

/**
 * A janelinha separada só abre com o Project minimizado, o check-in exigido e a IA no ar (sem IA não há conversa e uma janela que não
 * fecha prenderia o usuário). Com o Project aberto, quem mostra o check-in é o diálogo dentro do Project (task 161).
 */
export function deveAbrirJanelinha(entrada: EntradaParaAbrir): boolean {
  if (entrada.janelinhaAberta || !entrada.principalMinimizada) return false;
  if (entrada.estadoDaIa !== 'NO_AR') return false;
  return checkinExigido(entrada.situacao);
}

/** A janelinha aberta pode sumir: o check-in não é mais exigido (registrado, suspenso, execução acabou) ou o Project voltou à tela. */
export function deveFecharJanelinha(principalMinimizada: boolean, situacao: SituacaoDoCheckin | null): boolean {
  if (!principalMinimizada) return true;
  // Sem leitura da situação (rede caiu) não se solta o usuário nem se prende: a janela fica como está.
  return situacao !== null && !checkinExigido(situacao);
}

/** Quantos segundos faltam para o próximo check-in (para o menu da bandeja), ou `null` quando não há horário. */
export function segundosAteOCheckin(situacao: SituacaoDoCheckin | null, agora: number): number | null {
  if (!situacao?.proximoCheckinData) return null;
  const alvo = Date.parse(situacao.proximoCheckinData);
  if (Number.isNaN(alvo)) return null;
  return Math.max(0, Math.round((alvo - agora) / 1000));
}

/** O endereço de uma rota da API, na mesma origem do front (o front repassa `/api` ao backend). */
export function enderecoDaApi(urlDoProject: string, rota: string): string {
  return new URL(`api/v1/${rota.replace(/^\//, '')}`, urlDoProject).toString();
}
