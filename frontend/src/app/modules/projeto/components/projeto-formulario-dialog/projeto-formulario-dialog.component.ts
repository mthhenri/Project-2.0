import { Component, computed, inject, signal, output, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { finalize, switchMap, map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ProjetoVolumeVigenciasComponent } from '../projeto-volume-vigencias/projeto-volume-vigencias.component';
import { hojeNoFuso } from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  ProjetoCriarDto,
  ProjetoAlterarDto,
  ProjetoAlteradoDto,
  ProjetoRecuperadoDto,
  TipoProjetoStatusEnum,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
  LIMITE_VOLUME_ESPERADO_HORAS_MES,
} from '@project20/shared';
import { ProjetoService } from '../../services/projeto.service';
import { formatarDataIso, lerDataIso } from '../../../demanda/utils/demanda-datas.util';
import { gerarCodigoDoNome } from '../../models/projeto.model';
import { SeletorCorComponent } from '../../../../shared/components/seletor-cor/seletor-cor.component';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';

@Component({
  selector: 'app-projeto-formulario-dialog',
  standalone: true,
  imports: [ProjetoVolumeVigenciasComponent, DialogFormularioDirective, DialogDicaAtalhosComponent, ReactiveFormsModule, ButtonModule, InputTextModule, InputNumberModule, Select, SeletorCorComponent, DatePickerModule, DialogModule, BloquearCaracteresProibidosDirective, TooltipModule],
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
  /** Emitido com o projeto alterado (modo edição), já aplicável na tela sem novo GET. */
  readonly aoAlterar = output<ProjetoAlteradoDto>();

  /** Id do projeto em edição; `null` = criação. */
  readonly projetoIdEdicao = signal<number | null>(null);
  private readonly projetoCriadoPendente = signal<number | null>(null);
  readonly eEdicao = computed(() => this.projetoIdEdicao() !== null);
  /** "Período (opcional)": recolhido na criação; aberto na edição quando já há datas (ou se pediram o foco nelas). */
  readonly periodoAberto = signal<boolean>(false);
  readonly focarDatas = signal<boolean>(false);
  readonly carregandoDados = signal<boolean>(false);

  readonly formulario = this.formBuilder.group(
    {
      nome:            ['', [Validators.required, Validators.maxLength(255), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
      codigo:          ['', [Validators.required, Validators.maxLength(50)]],
      cor:             ['#3b82f6', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      status:          [TipoProjetoStatusEnum.ATIVO as TipoProjetoStatusEnum, [Validators.required]],
      inicioData:      [null as Date | null],
      previsaoFimData: [null as Date | null],
      volumeInicialHoras: [null as number | null, [Validators.min(0), Validators.max(LIMITE_VOLUME_ESPERADO_HORAS_MES)]],
    },
    { validators: this.validarPrevisaoFim },
  );
  readonly limiteVolumeEsperado = LIMITE_VOLUME_ESPERADO_HORAS_MES;

  readonly carregando = signal<boolean>(false);
  readonly mostrarDialog = signal<boolean>(false);

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

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

  /** Abre o dialog de criação com o formulário limpo. */
  abrir(): void {
    this.projetoCriadoPendente.set(null);
    this.projetoIdEdicao.set(null);
    this.focarDatas.set(false);
    this.periodoAberto.set(false);
    this.formulario.controls.codigo.enable({ emitEvent: false });
    this.formulario.reset({ cor: '#3b82f6', status: TipoProjetoStatusEnum.ATIVO });
    this.codigoEditadoManualmente.set(false);
    this.mostrarDialog.set(true);
  }

  /**
   * Abre o dialog de edição. Com o projeto completo em mãos (detalhe) preenche direto; da listagem
   * (só o resumo) busca o projeto para trazer as datas. `focarDatas` leva o foco ao início do período.
   */
  abrirEdicao(projeto: { id: number } & Partial<ProjetoRecuperadoDto>, opcoes: { focarDatas?: boolean } = {}): void {
    this.projetoCriadoPendente.set(null);
    this.projetoIdEdicao.set(projeto.id);
    this.focarDatas.set(!!opcoes.focarDatas);
    this.formulario.controls.codigo.disable({ emitEvent: false });
    this.codigoEditadoManualmente.set(true);
    this.mostrarDialog.set(true);

    if (projeto.inicioData !== undefined && projeto.previsaoFimData !== undefined) {
      this.preencher(projeto as ProjetoRecuperadoDto);
      return;
    }
    this.carregandoDados.set(true);
    this.projetoService
      .recuperar(projeto.id)
      .pipe(finalize(() => this.carregandoDados.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.preencher(resposta.dados);
        },
      });
  }

  private preencher(projeto: ProjetoRecuperadoDto): void {
    this.formulario.reset({
      nome:            projeto.nome,
      codigo:          projeto.codigo,
      cor:             projeto.cor,
      status:          projeto.status,
      inicioData:      projeto.inicioData ? lerDataIso(projeto.inicioData) : null,
      previsaoFimData: projeto.previsaoFimData ? lerDataIso(projeto.previsaoFimData) : null,
      volumeInicialHoras: null,
    });
    this.periodoAberto.set(!!(projeto.inicioData || projeto.previsaoFimData) || this.focarDatas());
    if (this.focarDatas()) setTimeout(() => document.getElementById('inicioData')?.focus(), 100);
  }

  alternarPeriodo(): void {
    this.periodoAberto.update((aberto) => !aberto);
  }

  salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    if (this.carregando() || this.carregandoDados()) return;
    const identificador = this.projetoIdEdicao();
    if (identificador !== null) this.salvarEdicao(identificador);
    else this.salvarCriacao();
  }

  private salvarCriacao(): void {
    this.carregando.set(true);

    const valor = this.formulario.value;
    const dto: ProjetoCriarDto = {
      nome:   valor.nome!,
      codigo: valor.codigo!.toUpperCase(),
      cor:    valor.cor!,
      status: valor.status!,
      inicioData:      valor.inicioData ? formatarDataIso(valor.inicioData) : undefined,
      previsaoFimData: valor.previsaoFimData ? formatarDataIso(valor.previsaoFimData) : undefined,
    };

    this.projetoService
      .criar(dto)
      .pipe(switchMap(resposta => {
        if (!resposta.dados || valor.volumeInicialHoras === null || valor.volumeInicialHoras === undefined) return of(resposta);
        const projeto = resposta.dados;
        return this.projetoService.criarVigencia({
          projetoId: projeto.id,
          vigenciaInicioData: formatarDataIso(valor.inicioData ?? hojeNoFuso(ambiente.fusoHorario)),
          volumeEsperadoHoras: valor.volumeInicialHoras,
        }).pipe(map(() => resposta), catchError(() => {
          // O projeto já existe: a nova tentativa usa a edição, sem criar um segundo cadastro.
          this.projetoIdEdicao.set(projeto.id);
          this.projetoCriadoPendente.set(projeto.id);
          this.preencher(projeto);
          this.formulario.controls.codigo.disable({ emitEvent: false });
          this.messageService.add({ severity: 'warn', summary: 'Volume pendente', detail: 'Projeto criado. Registre o volume inicial no bloco Volume esperado.' });
          return of(null);
        }));
      }), finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (!resposta) return;
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

  private salvarEdicao(identificador: number): void {
    this.carregando.set(true);
    const valor = this.formulario.getRawValue();
    // O código não entra: o ProjetoAlterarDto não o aceita.
    const dto: ProjetoAlterarDto = {
      nome:            valor.nome ?? undefined,
      cor:             valor.cor ?? undefined,
      status:          valor.status ?? undefined,
      inicioData:      valor.inicioData ? formatarDataIso(valor.inicioData) : undefined,
      previsaoFimData: valor.previsaoFimData ? formatarDataIso(valor.previsaoFimData) : undefined,
    };

    this.projetoService
      .alterar(identificador, dto)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Projeto alterado com sucesso' });
          this.mostrarDialog.set(false);
          if (this.projetoCriadoPendente() === identificador) {
            this.projetoCriadoPendente.set(null);
            this.aoCriar.emit(identificador);
          } else if (resposta.dados) this.aoAlterar.emit(resposta.dados);
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

  private validarPrevisaoFim(controle: AbstractControl): ValidationErrors | null {
    const inicioData = controle.get('inicioData')?.value as Date | null;
    const previsaoFimData = controle.get('previsaoFimData')?.value as Date | null;
    if (inicioData && previsaoFimData && previsaoFimData <= inicioData) {
      return { previsaoAnteriorAoInicio: true };
    }
    return null;
  }
}
