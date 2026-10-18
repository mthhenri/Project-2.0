import { BusinessException } from '../../../core/exceptions/business.exception';

/**
 * Confere se uma demanda pode passar a ficar dentro de outra. A `DemandaService.alterar` só confere o projeto; a tela só oferece como pai
 * as demandas **estruturais** e nunca a própria demanda, mas nada impede um ciclo (mover para dentro de uma filha). Aqui valem as três
 * regras, tanto na ferramenta que propõe quanto no executor que confirma. `idsDaSubarvore` inclui a própria demanda (nível 0).
 */
export function validarNovoPaiDaDemanda(dados: {
  demandaId: number;
  demandaProjetoId: number;
  novoPai: { id: number; nome: string; projetoId: number; isEstrutural: boolean };
  idsDaSubarvore: readonly number[];
}): void {
  const { demandaId, demandaProjetoId, novoPai, idsDaSubarvore } = dados;
  if (novoPai.id === demandaId) throw new BusinessException('Uma demanda não pode ser pai de si mesma. Avise o usuário.');
  if (idsDaSubarvore.includes(novoPai.id)) {
    throw new BusinessException(`"${novoPai.nome}" está dentro desta demanda: movê-la para lá criaria um ciclo na árvore. Avise o usuário.`);
  }
  if (novoPai.projetoId !== demandaProjetoId) throw new BusinessException('A demanda pai precisa ser do mesmo projeto. Avise o usuário.');
  if (!novoPai.isEstrutural) throw new BusinessException(`"${novoPai.nome}" não é uma demanda estrutural, e só estas agrupam outras demandas. Avise o usuário.`);
}
