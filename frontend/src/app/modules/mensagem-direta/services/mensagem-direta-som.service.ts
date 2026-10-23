import { Injectable } from '@angular/core';

/** O volume de pico do toque (0 a 1; era 0,12, baixo demais perto de música e reunião). */
const PICO_DO_VOLUME = 0.3;

/**
 * O som do aviso de mensagem nova (task 212): um toque curto gerado pelo próprio navegador, sem arquivo de áudio. O navegador só libera o áudio depois de
 * o usuário ter interagido com a página; antes disso (ou se o áudio não existir) a falha é engolida e o aviso aparece sem som.
 */
@Injectable({ providedIn: 'root' })
export class MensagemDiretaSomService {
  private contexto: AudioContext | null = null;

  tocar(): void {
    try {
      const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Contexto) return;
      const contexto = (this.contexto ??= new Contexto());
      if (contexto.state === 'suspended') void contexto.resume().catch(() => undefined);

      const inicio = contexto.currentTime;
      const oscilador = contexto.createOscillator();
      const volume = contexto.createGain();
      oscilador.type = 'sine';
      oscilador.frequency.setValueAtTime(880, inicio);
      oscilador.frequency.setValueAtTime(1175, inicio + 0.09);
      volume.gain.setValueAtTime(0.0001, inicio);
      volume.gain.exponentialRampToValueAtTime(PICO_DO_VOLUME, inicio + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.24);
      oscilador.connect(volume).connect(contexto.destination);
      oscilador.start(inicio);
      oscilador.stop(inicio + 0.26);
    } catch {
      // Sem áudio liberado: o aviso segue sem som.
    }
  }
}
