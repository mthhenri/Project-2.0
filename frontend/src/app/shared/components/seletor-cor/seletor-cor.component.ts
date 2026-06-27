import { Component, forwardRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { ColorPickerModule } from 'primeng/colorpicker';

const CORES_PREDEFINIDAS: readonly string[] = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#64748b',
];

@Component({
  selector: 'app-seletor-cor',
  standalone: true,
  imports: [ReactiveFormsModule, ColorPickerModule],
  templateUrl: './seletor-cor.component.html',
  styleUrl: './seletor-cor.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SeletorCorComponent),
      multi: true,
    },
  ],
})
export class SeletorCorComponent implements ControlValueAccessor {
  readonly coresPredefinidas = CORES_PREDEFINIDAS;
  readonly controleCor = new FormControl<string>('#3b82f6', { nonNullable: true });
  readonly cor = signal<string>('#3b82f6');
  readonly desabilitado = signal<boolean>(false);

  private aoMudar: (valor: string) => void = () => {};
  private aoTocar: () => void = () => {};

  constructor() {
    this.controleCor.valueChanges.pipe(takeUntilDestroyed()).subscribe((valor) => {
      this.cor.set(valor);
      this.aoMudar(valor);
      this.aoTocar();
    });
  }

  writeValue(valor: string | null): void {
    const corResolvida = valor ?? '#3b82f6';
    this.controleCor.setValue(corResolvida, { emitEvent: false });
    this.cor.set(corResolvida);
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.aoMudar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.aoTocar = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitado.set(desabilitado);
    if (desabilitado) {
      this.controleCor.disable({ emitEvent: false });
    } else {
      this.controleCor.enable({ emitEvent: false });
    }
  }

  corSelecionada(valor: string): boolean {
    return this.cor().toLowerCase() === valor.toLowerCase();
  }

  selecionarPredefinida(valor: string): void {
    if (this.desabilitado()) return;
    this.controleCor.setValue(valor);
  }

  digitarHex(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value.trim();
    const hexNormalizado = valor.startsWith('#') ? valor : '#' + valor;
    if (/^#[0-9A-Fa-f]{6}$/.test(hexNormalizado)) {
      this.controleCor.setValue(hexNormalizado);
    }
  }
}
