/** O conjunto de tags depois de acrescentar `adicionar` e tirar `remover` das `atuais` (sem repetir, em ordem crescente). */
export function calcularConjuntoDeTags(atuais: readonly number[], adicionar: readonly number[] = [], remover: readonly number[] = []): number[] {
    const retirar = new Set(remover);
    return [...new Set([...atuais, ...adicionar])].filter((tagId) => !retirar.has(tagId)).sort((primeiro, segundo) => primeiro - segundo);
}

/** Dois conjuntos de ids têm os mesmos elementos (a ordem e a repetição não contam). */
export function mesmoConjuntoDeTags(item: readonly number[], segundo: readonly number[]): boolean {
    const conjuntoA = new Set(item);
    const conjuntoB = new Set(segundo);
    return conjuntoA.size === conjuntoB.size && [...conjuntoA].every((tagId) => conjuntoB.has(tagId));
}
