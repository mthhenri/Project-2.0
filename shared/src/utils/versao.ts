/** Versão `maior.menor.correcao` (só números); `null` se o texto não tem esse formato. */
export function lerVersao(texto: string): [number, number, number] | null {
    const partes = /^(\d+)\.(\d+)\.(\d+)$/.exec(texto.trim());
    return partes ? [Number(partes[1]), Number(partes[2]), Number(partes[3])] : null;
}

/** Negativo se a primeira versão é menor, zero se iguais, positivo se é maior; versão ilegível vale menos que qualquer legível. */
export function compararVersoes(item: string, segundo: string): number {
    const versaoA = lerVersao(item);
    const versaoB = lerVersao(segundo);
    if (!versaoA || !versaoB) return versaoA ? 1 : versaoB ? -1 : 0;
    for (let indice = 0; indice < 3; indice++) {
        if (versaoA[indice] !== versaoB[indice]) return versaoA[indice] - versaoB[indice];
    }
    return 0;
}

/** A versão publicada é mais nova que a instalada? Versão ilegível de qualquer lado: não (nunca avisa por engano). */
export function versaoEhMaisNova(publicada: string, instalada: string): boolean {
    return lerVersao(publicada) !== null && lerVersao(instalada) !== null && compararVersoes(publicada, instalada) > 0;
}
