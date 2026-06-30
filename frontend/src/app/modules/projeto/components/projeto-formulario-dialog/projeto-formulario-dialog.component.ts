import { Component, inject, signal, output, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ProjetoCriarDto, TipoProjetoStatusEnum } from '@project20/shared';
import { ProjetoService } from '../../services/projeto.service';
import { gerarCodigoDoNome } from '../../models/projeto.model';
import { SeletorCorComponent } from '../../../../shared/components/seletor-cor/seletor-cor.component';

@Component({
  selector: 'app-projeto-formulario-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, Select, SeletorCorComponent, DatePickerModule, DialogModule],
  templateUrl: './projeto-formulario-dialog.component.html',
  styleUrl: './projeto-formulario-dialog.component.scss',
})
export class ProjetoFormularioDialogComponent {
  private readonly projetoService = inject(ProjetoService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  /** Emitido com o id do projeto criado, para a listagem navegar até o detalhe. */
  readonly aoCriar = output<number>();

  readonly formulario = this.formBuilder.group(
    {
      nome:            ['', [Validators.required, Validators.maxLength(255)]],
      codigo:          ['', [Validators.required, Validators.maxLength(50)]],
      cor:             ['#3b82f6', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      status:          [TipoProjetoStatusEnum.ATIVO as TipoProjetoStatusEnum, [Validators.required]],
      inicioData:      [null as Date | null],
      previsaoFimData: [null as Date | null],
    },
    { validators: this.validarPrevisaoFim },
  );

  readonly carregando = signal<boolean>(false);
  readonly mostrarDialog = signal<boolean>(false);

  /**
   * Enquanto `false`, o código acompanha o nome (slug derivado). Vira `true` no
   * instante em que o gestor digita um código próprio; volta a `false` se ele
   * apagar todo o código (pedindo o padrão automático de volta).
   */
  readonly codigoEditadoManualmente = signal<boolean>(false);

  readonly statusOpcoes = [
    { label: 'Ativo',     value: TipoProjetoStatusEnum.ATIVO },
    { label: 'Pausado',   value: TipoProjetoStatusEnum.PAUSADO },
    { label: 'Concluído', value: TipoProjetoStatusEnum.CONCLUIDO },
    { label: 'Cancelado', value: TipoProjetoStatusEnum.CANCELADO },
  ];

  constructor() {
    // Nome -> Código: enquanto o gestor não assumir o código, ele segue derivado
    // do nome. `emitEvent: false` evita disparar o valueChanges do próprio código
    // (que marcaria edição manual e criaria laço).
    this.formulario.controls.nome.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((nome) => {
        if (this.codigoEditadoManualmente()) return;
        this.formulario.controls.codigo.setValue(gerarCodigoDoNome(nome ?? ''), { emitEvent: false });
      });

    // Edição manual do código: como o sync acima usa `emitEvent: false`, este
    // valueChanges só dispara na digitação do usuário. Código vazio devolve o
    // controle à derivação automática; qualquer outro valor a desliga.
    this.formulario.controls.codigo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((codigo) => {
        this.codigoEditadoManualmente.set(!!codigo?.trim());
      });
  }

  /** Abre o dialog com o formulário limpo. */
  abrir(): void {
    this.formulario.reset({ cor: '#3b82f6', status: TipoProjetoStatusEnum.ATIVO });
    this.codigoEditadoManualmente.set(false);
    this.mostrarDialog.set(true);
  }

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
          this.mostrarDialog.set(false);
          if (resposta.dados?.id !== undefined) {
            this.aoCriar.emit(resposta.dados.id);
          }
        },
      });
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
