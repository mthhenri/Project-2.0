/** O que aconteceu com uma proposta numa resolução em grupo (task 227). */
export enum PropostaIaGrupoSituacaoEnum {
  /** A ação do grupo (confirmar, recusar ou desfazer) valeu para esta proposta. */
  RESOLVIDA = 'RESOLVIDA',
  /** Foi tentada e falhou; `motivo` diz por quê e a proposta ficou como estava. */
  FALHOU    = 'FALHOU',
  /** Não foi tentada porque outra, de que ela depende ou que veio antes na ordem, não deu certo. */
  BLOQUEADA = 'BLOQUEADA',
}
