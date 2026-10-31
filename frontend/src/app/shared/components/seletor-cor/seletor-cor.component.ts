import { Component, forwardRef, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { ColorPickerModule } from 'primeng/colorpicker';

export const CORES_PREDEFINIDAS: readonly string[] = [
    '#ef4444', '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1',
    '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16',
    '#eab308', '#f59e0b', '#f97316', '#a16207', '#78716c', '#64748b', '#71717a',
    '#16a34a', '#1e40af', '#7c2d12', '#831843', '#0f172a', '#4b5563', '#94a3b8',
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
    /**
   * Modo compacto (task 112): só a paleta em linha; o seletor completo (roda de cor e hex) fica atrás de
   * "Outra cor…". Sem o input, o componente segue como sempre (Tags e demais usos).
   */
    readonly compacto = input<boolean>(false);
    readonly mostrarOutraCor = signal<boolean>(false);

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

    alternarOutraCor(): void {
        this.mostrarOutraCor.update((aberto) => !aberto);
    }

    /** Cor atual fora da paleta (ex.: escolhida na roda): "Outra cor…" já aparece aberto. */
    get corForaDaPaleta(): boolean {
        return !this.coresPredefinidas.some((predefinida) => this.corSelecionada(predefinida));
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
