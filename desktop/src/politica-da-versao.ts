/** A leitura mínima de `GET /desktop/versao`: a versão publicada para download. */
export interface VersaoPublicada {
  versao: string;
}

/** Lê o corpo de `GET /desktop/versao`; `null` se não há executável publicado ou o corpo não tem o formato esperado. */
export function lerVersaoPublicada(corpo: unknown): VersaoPublicada | null {
  const dados = (corpo as { dados?: Record<string, unknown> } | null)?.dados;
  if (!dados || dados['disponivel'] !== true || typeof dados['versao'] !== 'string') return null;
  return lerVersao(dados['versao']) ? { versao: dados['versao'] } : null;
}

function lerVersao(texto: string): [number, number, number] | null {
  const partes = /^(\d+)\.(\d+)\.(\d+)$/.exec(texto.trim());
  return partes ? [Number(partes[1]), Number(partes[2]), Number(partes[3])] : null;
}

/**
 * A versão publicada é mais nova que a instalada? Compara número a número (1.10.0 > 1.9.0); versão ilegível de qualquer lado nunca
 * avisa. (A mesma regra de `versaoEhMaisNova` do pacote compartilhado, repetida aqui porque o desktop não depende dele.)
 */
export function versaoEhMaisNova(publicada: string, instalada: string): boolean {
  const nova = lerVersao(publicada);
  const atual = lerVersao(instalada);
  if (!nova || !atual) return false;
  for (let indice = 0; indice < 3; indice++) {
    if (nova[indice] !== atual[indice]) return nova[indice] > atual[indice];
  }
  return false;
}

/** Confere a versão publicada de hora em hora (e na primeira vez), não a cada leitura do check-in. */
export const INTERVALO_DA_CONFERENCIA_DE_VERSAO_MS = 60 * 60 * 1000;

export function deveConferirVersao(ultimaConferenciaEm: number | null, agora: number): boolean {
  return ultimaConferenciaEm === null || agora - ultimaConferenciaEm >= INTERVALO_DA_CONFERENCIA_DE_VERSAO_MS;
}

/** O Project aberto no navegador com o pedido de baixar o desktop (o front inicia o download com o login do usuário). */
export function enderecoParaBaixar(urlDoProject: string): string {
  const url = new URL(urlDoProject);
  url.searchParams.set('baixar-desktop', '1');
  return url.toString();
}

/** O texto do item do menu da bandeja quando há versão nova; `null` quando está em dia. */
export function textoDaAtualizacao(publicada: VersaoPublicada | null, instalada: string): string | null {
  return publicada && versaoEhMaisNova(publicada.versao, instalada) ? `Nova versão disponível (v${publicada.versao}): baixar` : null;
}
