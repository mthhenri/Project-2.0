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

/** Arquivo, na pasta de dados do app, com a última versão que rodou (task 200). */
export const ARQUIVO_DA_ULTIMA_VERSAO = 'ultima-versao.txt';

/** O texto gravado no arquivo, lido de volta: só vale uma versão legível (`maior.menor.correcao`); arquivo ausente ou corrompido é "nunca rodou". */
export function lerUltimaVersaoGravada(conteudo: string | null): string | null {
  const texto = conteudo?.trim() ?? '';
  return lerVersao(texto) ? texto : null;
}

/**
 * O app acabou de ser atualizado? Só se a versão que roda é **maior** que a registrada na última execução. Primeira execução da vida do app
 * (sem registro), versão igual, menor (voltou ao executável antigo) ou ilegível não avisam.
 */
export function deveAvisarQueAtualizou(ultimaVersao: string | null, versaoAtual: string): boolean {
  return ultimaVersao !== null && versaoEhMaisNova(versaoAtual, ultimaVersao);
}

/**
 * O que gravar como "última versão que rodou" depois desta execução, ou `null` para não mexer no arquivo. Grava na primeira execução e quando a versão
 * subiu; abrir uma versão **menor** não apaga a maior registrada (senão abrir o executável novo de novo avisaria "atualizou" à toa).
 */
export function versaoARegistrar(ultimaVersao: string | null, versaoAtual: string): string | null {
  if (!lerVersao(versaoAtual)) return null;
  if (ultimaVersao === null || versaoEhMaisNova(versaoAtual, ultimaVersao)) return versaoAtual;
  return null;
}

/** O corpo da notificação do Windows quando o app abre numa versão nova. */
export function textoDoAvisoDeAtualizacao(versaoAtual: string): string {
  return `Atualizado para a versão ${versaoAtual}`;
}

/** A linha de versão do menu da bandeja (só informativa). */
export function textoDaVersaoNoMenu(versaoAtual: string): string {
  return `Project Desktop ${versaoAtual}`;
}
