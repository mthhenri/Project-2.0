import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService } from 'primeng/api';
import { ProjetoCriarDto, ProjetoStatusEnum } from '@project20/shared';
import { ProjetoService } from '../../services/projeto.service';

@Component({
  selector: 'app-projeto-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, Select, ColorPickerModule, DatePickerModule],
  templateUrl: './projeto-formulario.page.html',
  styleUrl: './projeto-formulario.page.scss',
})
export class ProjetoFormularioPage {
  private readonly projetoService = inject(ProjetoService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  readonly formulario = this.formBuilder.group(
    {
      nome:            ['', [Validators.required, Validators.maxLength(255)]],
      codigo:          ['', [Validators.required, Validators.maxLength(50)]],
      cor:             ['#3b82f6', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      status:          [ProjetoStatusEnum.ATIVO as ProjetoStatusEnum, [Validators.required]],
      inicioData:      [null as Date | null],
      previsaoFimData: [null as Date | null],
    },
    { validators: this.validarPrevisaoFim },
  );

  readonly carregando = signal<boolean>(false);

  readonly statusOpcoes = [
    { label: 'Ativo',     value: ProjetoStatusEnum.ATIVO },
    { label: 'Pausado',   value: ProjetoStatusEnum.PAUSADO },
    { label: 'Concluído', value: ProjetoStatusEnum.CONCLUIDO },
    { label: 'Cancelado', value: ProjetoStatusEnum.CANCELADO },
  ];

  salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.carregando.set(true);

    const valor = this.formulario.value;
    const dto: ProjetoCriarDto = {
      nome:   valor.nome!,
      codigo: valor.codigo!.toUpperCase(),
      cor:    valor.cor!,
      status: valor.status!,
      inicioData:      valor.inicioData ? this.formatarData(valor.inicioData) : undefined,
      previsaoFimData: valor.previsaoFimData ? this.formatarData(valor.previsaoFimData) : undefined,
    };

    this.projetoService
      .criar(dto)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Projeto criado com sucesso',
          });
          this.router.navigate(['/projeto', resposta.dados?.id]);
        },
      });
  }

  cancelar(): void {
    this.router.navigate(['/projeto']);
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  get previsaoAnteriorAoInicio(): boolean {
    return !!(
      this.formulario.hasError('previsaoAnteriorAoInicio') &&
      this.formulario.get('previsaoFimData')?.touched
    );
  }

  digitarCor(evento: Event, controle: AbstractControl | null): void {
    if (!controle) return;
    const valor = (evento.target as HTMLInputElement).value.trim();
    const hexNormalizado = valor.startsWith('#') ? valor : '#' + valor;
    if (/^#[0-9A-Fa-f]{6}$/.test(hexNormalizado)) {
      controle.setValue(hexNormalizado);
    }
  }

  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private validarPrevisaoFim(controle: AbstractControl): ValidationErrors | null {
    const inicioData = controle.get('inicioData')?.value as Date | null;
    const previsaoFimData = controle.get('previsaoFimData')?.value as Date | null;
    if (inicioData && previsaoFimData && previsaoFimData <= inicioData) {
      return { previsaoAnteriorAoInicio: true };
    }
    return null;
  }
}
