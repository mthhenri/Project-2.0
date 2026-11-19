import { BusinessException } from '../../../core/exceptions/business.exception';

/**
 * Confere se uma demanda pode passar a ficar dentro de outra: a própria demanda, a subárvore (ciclo), o mesmo projeto e o pai **estrutural**.
 * A fonte única é a `DemandaService.alterar` (task 382), que vale para a tela, a API e a IA; a ferramenta que propõe e o executor que confirma
 * a chamam também para recusar cedo, com a mesma mensagem. `idsDaSubarvore` inclui a própria demanda (nível 0).
 */
export function validarNovoPaiDaDemanda(dados: {
    demandaId: number;
    demandaProjetoId: number;
    novoPai: { id: number; nome: string; projetoId: number; estrutural: boolean };
    idsDaSubarvore: readonly number[];
}): void {
    const { demandaId, demandaProjetoId, novoPai, idsDaSubarvore } = dados;
    if (novoPai.id === demandaId) throw new BusinessException('Uma demanda não pode ser pai de si mesma');
    if (idsDaSubarvore.includes(novoPai.id)) {
        throw new BusinessException(`"${novoPai.nome}" está dentro desta demanda: movê-la para lá criaria um ciclo na árvore`);
    }
    if (novoPai.projetoId !== demandaProjetoId) throw new BusinessException('A demanda pai deve pertencer ao mesmo projeto');
    if (!novoPai.estrutural) throw new BusinessException('Apenas demandas estruturais podem ter sub-demandas');
}
