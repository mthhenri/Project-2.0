import { Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ContextMenu } from 'primeng/contextmenu';
import { DatePicker, DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { MenuItem } from 'primeng/api';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '@project20/shared';
import { SeletorCorComponent } from '../../../../shared/components/seletor-cor/seletor-cor.component';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { dataParaIso, isoParaData } from '../../../execucao/utils/execucao.util';

export type TipoCampoProjeto = 'texto' | 'data' | 'cor';

/**
 * Campo do cabeçalho do projeto que se edita no lugar (task 271), no molde da edição de horas em Execuções: botão direito → "Editar" →
 * o campo aparece ali mesmo → ao sair com mudança, "Salvar alteração? Sim / Não"; um botão "Cancelar" fica ao lado do campo (task 290). A **cor** abre uma paleta
 * num popover ancorado no selo, com "Cancelar" e "Salvar" no rodapé. O valor é texto (nome), `yyyy-mm-dd` (data) ou `#rrggbb` (cor);
 * "Sim" emite o valor novo e fecha, e quem usa aplica a mudança (otimista, com rollback).
 */
@Component({
    selector: 'app-projeto-campo-editavel',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, ContextMenu, DatePickerModule, InputTextModule, PopoverModule, SeletorCorComponent, BloquearCaracteresProibidosDirective],
    templateUrl: './projeto-campo-editavel.component.html',
    styleUrl: './projeto-campo-editavel.component.scss',
})
export class ProjetoCampoEditavelComponent {
    private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

    readonly tipo = input.required<TipoCampoProjeto>();
    /** Texto, `yyyy-mm-dd` ou `#rrggbb`, conforme o tipo; `null` quando o campo não tem valor (data indefinida). */
    readonly valor = input<string | null>(null);
    readonly editavel = input<boolean>(false);
    /** Nome do campo para leitor de tela: "nome do projeto", "data de início". */
    readonly rotulo = input.required<string>();
    readonly confirmado = output<string>();

    readonly editando = signal<boolean>(false);
    readonly confirmando = signal<boolean>(false);
    readonly erro = signal<string>('');
    readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

    readonly rascunhoTexto = new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(3), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)],
    });
    readonly rascunhoData = new FormControl<Date | null>(null);
    readonly rascunhoCor = new FormControl('#3b82f6', { nonNullable: true });

    readonly itensMenu: MenuItem[] = [{ label: 'Editar', icon: 'pi pi-pencil', command: () => this.iniciarEdicao() }];
    readonly rotuloMenu = computed(() => `Editar ${this.rotulo()}`);

    private readonly popoverCor = viewChild<Popover>('popoverCor');
    private readonly ancora = viewChild<ElementRef<HTMLElement>>('ancora');
    private seletorAtivo: DatePicker | null = null;

    abrirMenu(evento: MouseEvent, menu: ContextMenu): void {
        if (!this.editavel() || this.editando()) return;
        evento.preventDefault();
        menu.show(evento);
    }

    iniciarEdicao(): void {
        if (!this.editavel() || this.editando()) return;
        this.erro.set('');
        this.confirmando.set(false);
        this.rascunhoTexto.reset(this.valor() ?? '');
        this.rascunhoData.reset(isoParaData(this.valor()));
        this.rascunhoCor.reset(this.valor() ?? '#3b82f6', { emitEvent: false });
        this.editando.set(true);
        if (this.tipo() === 'cor') {
            setTimeout(() => this.popoverCor()?.show(new Event('click'), this.ancora()?.nativeElement));
            return;
        }
        setTimeout(() => this.elemento.nativeElement.querySelector<HTMLElement>('input')?.focus());
    }

    /** Enter, clique fora ou saída do campo: sem mudança fecha em silêncio; com mudança pergunta antes de salvar. */
    sair(): void {
        if (!this.editando() || this.confirmando()) return;
        // A API não limpa a data: sair com o campo vazio é desistir.
        if (!this.alterado() || (this.tipo() === 'data' && !this.rascunhoData.value)) {
            this.encerrar();
            return;
        }
        if (this.tipo() === 'texto' && this.rascunhoTexto.invalid) {
            this.erro.set(this.rascunhoTexto.hasError('pattern') ? MENSAGEM_CARACTERES_PROIBIDOS : 'O nome precisa ter ao menos 3 caracteres.');
            return;
        }
        this.erro.set('');
        this.confirmando.set(true);
        this.seletorAtivo?.hideOverlay();
    }

    /** O seletor de data perde o foco ao clicar no próprio painel: só sai quando o painel não está aberto. */
    aoSairDoSeletor(seletor: DatePicker): void {
        this.seletorAtivo = seletor;
        setTimeout(() => {
            if (!seletor.overlayVisible) this.sair();
        });
    }

    /** Clique fora ou Esc no popover da cor: descarta o rascunho. */
    aoFecharPopover(): void {
        if (this.editando()) this.encerrar();
    }

    confirmar(): void {
        this.confirmado.emit(this.valorDoRascunho());
        this.encerrar();
    }

    /** "Não" ou Esc: descarta o rascunho. */
    descartar(): void {
        this.encerrar();
    }

    alterado(): boolean {
        return this.valorDoRascunho() !== (this.valor() ?? '');
    }

    private valorDoRascunho(): string {
        switch (this.tipo()) {
            case 'texto': return this.rascunhoTexto.getRawValue().trim();
            case 'data': return this.rascunhoData.value ? dataParaIso(this.rascunhoData.value) : '';
            case 'cor': return this.rascunhoCor.getRawValue();
        }
    }

    private encerrar(): void {
        this.editando.set(false);
        this.confirmando.set(false);
        this.erro.set('');
        this.seletorAtivo = null;
        this.popoverCor()?.hide();
    }
}
