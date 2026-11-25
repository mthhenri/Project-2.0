import { Injectable } from '@angular/core';

/** O volume de pico (0 a 1): um terço do aviso de mensagem do chat entre colaboradores (task 492). */
const PICO_DO_VOLUME = 0.1;
/** Entrada e saída de cada parte (s): curtas, para o contorno aparecer inteiro sem estalo. */
const ATAQUE = 0.008;
const SOLTURA = 0.03;

interface Parte {
    /** Pontos do contorno: [instante (s), frequência (Hz)], ligados em linha reta. */
    readonly pontos: readonly (readonly [number, number])[];
    readonly ganho: number;
    /** Uma segunda voz que acompanha o contorno: [multiplicador da frequência, ganho]. */
    readonly segundaVoz?: readonly [number, number];
}

interface Sopro {
    readonly inicio: number;
    readonly duracao: number;
    readonly frequenciaMinima: number;
    readonly frequenciaMaxima: number;
    readonly ganho: number;
}

/** O desenho aprovado na prévia da task 491 (anexo `proposta.md` da spec 491). */
const PARTES: readonly Parte[] = [
    { pontos: [[0, 3650], [0.04, 3950], [0.06, 3950], [0.1, 2800]], ganho: 1 },
    { pontos: [[0.3, 2500], [0.32, 3650], [0.38, 2200]], ganho: 0.9 },
    { pontos: [[0.45, 2400], [0.57, 3000], [0.62, 3050], [0.8, 2650]], ganho: 1, segundaVoz: [1.5, 0.3] },
];
const SOPROS: readonly Sopro[] = [
    { inicio: 0, duracao: 0.11, frequenciaMinima: 4300, frequenciaMaxima: 6000, ganho: 0.35 },
    { inicio: 0.31, duracao: 0.05, frequenciaMinima: 4600, frequenciaMaxima: 5800, ganho: 0.25 },
];
/** Duração total (s): o fim da última parte. */
export const DURACAO_DO_SOM_DA_PIA = Math.max(...PARTES.map((parte) => parte.pontos[parte.pontos.length - 1][0]));

/**
 * O som curto da Piá (task 491), gerado pelo próprio navegador, sem arquivo de áudio. Um por vez: enquanto toca, um novo
 * pedido é ignorado. Sem áudio disponível ou liberado, não faz nada.
 */
@Injectable({ providedIn: 'root' })
export class PiaSomService {
    private contexto: AudioContext | null = null;
    private tocandoAte = 0;
    private aguardandoGesto = false;

    /**
     * Como `tocar`, para pedidos que não partem de um clique (task 492): com o áudio ainda não liberado pelo navegador, espera o primeiro
     * `pointerdown` ou `keydown` da página. `aoTocar` recebe a duração quando o som de fato começa.
     */
    tocarQuandoPuder(aoTocar?: (duracaoMs: number) => void): void {
        const tocarAgora = (): void => {
            const duracaoMs = this.tocar();
            if (duracaoMs > 0) aoTocar?.(duracaoMs);
        };
        const contexto = this.obterContexto();
        if (!contexto) return;
        if (contexto.state !== 'suspended') {
            tocarAgora();
            return;
        }
        if (this.aguardandoGesto) return;
        this.aguardandoGesto = true;
        const aoLiberar = (): void => {
            if (!this.aguardandoGesto) return;
            this.aguardandoGesto = false;
            document.removeEventListener('pointerdown', aoLiberar, true);
            document.removeEventListener('keydown', aoLiberar, true);
            tocarAgora();
        };
        document.addEventListener('pointerdown', aoLiberar, true);
        document.addEventListener('keydown', aoLiberar, true);
    }

    private obterContexto(): AudioContext | null {
        try {
            const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
            return Contexto ? (this.contexto ??= new Contexto()) : null;
        } catch {
            return null;
        }
    }

    /** Toca e devolve a duração (ms); devolve 0 se já estava tocando ou se não há áudio. */
    tocar(): number {
        const agora = Date.now();
        if (agora < this.tocandoAte) return 0;
        try {
            const contexto = this.obterContexto();
            if (!contexto) return 0;
            if (contexto.state === 'suspended') void contexto.resume().catch(() => undefined);
            const inicio = contexto.currentTime + 0.02;
            for (const parte of PARTES) this.tocarParte(contexto, parte, inicio);
            for (const sopro of SOPROS) this.tocarSopro(contexto, sopro, inicio);
            const duracaoMs = Math.round(DURACAO_DO_SOM_DA_PIA * 1000);
            this.tocandoAte = agora + duracaoMs;
            return duracaoMs;
        } catch {
            return 0;
        }
    }

    private tocarParte(contexto: AudioContext, parte: Parte, inicioDoSom: number): void {
        const [primeiro] = parte.pontos;
        const ultimo = parte.pontos[parte.pontos.length - 1];
        const inicio = inicioDoSom + primeiro[0];
        const fim = inicioDoSom + ultimo[0];
        const volume = contexto.createGain();
        volume.gain.setValueAtTime(0.0001, inicio);
        volume.gain.exponentialRampToValueAtTime(PICO_DO_VOLUME, inicio + ATAQUE);
        volume.gain.setValueAtTime(PICO_DO_VOLUME, fim - SOLTURA);
        volume.gain.exponentialRampToValueAtTime(0.0001, fim);
        volume.connect(contexto.destination);

        const vozes: (readonly [number, number])[] = [[1, parte.ganho]];
        if (parte.segundaVoz) vozes.push([parte.segundaVoz[0], parte.ganho * parte.segundaVoz[1]]);
        for (const [multiplicador, ganhoDaVoz] of vozes) {
            const oscilador = contexto.createOscillator();
            oscilador.type = 'sine';
            oscilador.frequency.setValueAtTime(primeiro[1] * multiplicador, inicio);
            for (const [instante, frequencia] of parte.pontos.slice(1)) {
                oscilador.frequency.linearRampToValueAtTime(frequencia * multiplicador, inicioDoSom + instante);
            }
            const ganho = contexto.createGain();
            ganho.gain.value = ganhoDaVoz;
            oscilador.connect(ganho).connect(volume);
            oscilador.start(inicio);
            oscilador.stop(fim + 0.02);
        }
    }

    /** Um sopro de ruído recortado numa faixa aguda, com a forma de um seno ao quadrado (sobe e desce suave). */
    private tocarSopro(contexto: AudioContext, sopro: Sopro, inicioDoSom: number): void {
        const amostras = Math.floor(contexto.sampleRate * sopro.duracao);
        const buffer = contexto.createBuffer(1, amostras, contexto.sampleRate);
        const canal = buffer.getChannelData(0);
        for (let indice = 0; indice < amostras; indice++) {
            canal[indice] = (Math.random() * 2 - 1) * Math.sin((Math.PI * indice) / amostras) ** 2;
        }
        const fonte = contexto.createBufferSource();
        fonte.buffer = buffer;
        const filtros: [BiquadFilterType, number][] = [
            ['highpass', sopro.frequenciaMinima],
            ['highpass', sopro.frequenciaMinima],
            ['highpass', sopro.frequenciaMinima],
            ['lowpass', sopro.frequenciaMaxima],
            ['lowpass', sopro.frequenciaMaxima],
        ];
        let saida: AudioNode = fonte;
        for (const [tipo, frequencia] of filtros) {
            const filtro = contexto.createBiquadFilter();
            filtro.type = tipo;
            filtro.frequency.value = frequencia;
            filtro.Q.value = 0.7;
            saida = saida.connect(filtro);
        }
        const ganho = contexto.createGain();
        ganho.gain.value = PICO_DO_VOLUME * sopro.ganho * 0.8;
        saida.connect(ganho).connect(contexto.destination);
        fonte.start(inicioDoSom + sopro.inicio);
    }
}
