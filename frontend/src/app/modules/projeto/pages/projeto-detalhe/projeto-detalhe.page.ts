import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  ProjetoRecuperadoDto,
  ProjetoAlterarDto,
  ProjetoStatusEnum,
  DemandaResumoDto,
  DemandaStatusEnum,
  StandardResponse,
  PaginatedResult,
} from '@project20/shared';
import { ProjetoService } from '../../services/projeto.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { ambiente } from '../../../../../environments/environment';

@Component({
  selector: 'app-projeto-detalhe',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    Select,
    ColorPickerModule,
    DatePickerModule,
    DialogModule,
    TabsModule,
    Tag,
    TooltipModule,
    DataBrasileiraPipe,
  ],
  templateUrl: './projeto-detalhe.page.html',
  styleUrl: './projeto-detalhe.page.scss',
})
export class ProjetoDetalhePage implements OnInit {
  private readonly projetoService = inject(ProjetoService);
  private readonly httpClient = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly projeto = signal<ProjetoRecuperadoDto | null>(null);
  readonly demandas = signal<DemandaResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly carregandoDemandas = signal<boolean>(false);
  readonly mostrarDialogEditar = signal<boolean>(false);
  readonly carregandoSalvar = signal<boolean>(false);

  readonly formularioEditar = this.formBuilder.group(
    {
      nome:            ['', [Validators.required, Validators.maxLength(255)]],
      cor:             ['#3b82f6', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
      status:          [ProjetoStatusEnum.ATIVO as ProjetoStatusEnum, [Validators.required]],
      inicioData:      [null as Date | null],
      previsaoFimData: [null as Date | null],
    },
    { validators: this.validarPrevisaoFim },
  );

  readonly statusOpcoes = [
    { label: 'Ativo',     value: ProjetoStatusEnum.ATIVO },
    { label: 'Pausado',   value: ProjetoStatusEnum.PAUSADO },
    { label: 'Concluído', value: ProjetoStatusEnum.CONCLUIDO },
    { label: 'Cancelado', value: ProjetoStatusEnum.CANCELADO },
  ];

  ngOnInit(): void {
    const identificador = Number(this.route.snapshot.paramMap.get('id'));
    this.carregarProjeto(identificador);
    this.carregarDemandas(identificador);
  }

  abrirDialogEditar(): void {
    const projetoDados = this.projeto();
    if (!projetoDados) return;

    this.formularioEditar.patchValue({
      nome:   projetoDados.nome,
      cor:    projetoDados.cor,
      status: projetoDados.status,
      inicioData:      projetoDados.inicioData ? new Date(projetoDados.inicioData + 'T12:00:00') : null,
      previsaoFimData: projetoDados.previsaoFimData ? new Date(projetoDados.previsaoFimData + 'T12:00:00') : null,
    });
    this.mostrarDialogEditar.set(true);
  }

  salvarEdicao(): void {
    if (this.formularioEditar.invalid) {
      this.formularioEditar.markAllAsTouched();
      return;
    }

    const projetoDados = this.projeto();
    if (!projetoDados) return;

    const valor = this.formularioEditar.value;
    const dto: ProjetoAlterarDto = {
      nome:   valor.nome ?? undefined,
      cor:    valor.cor ?? undefined,
      status: valor.status ?? undefined,
      inicioData:      valor.inicioData ? this.formatarData(valor.inicioData) : undefined,
      previsaoFimData: valor.previsaoFimData ? this.formatarData(valor.previsaoFimData) : undefined,
    };

    this.carregandoSalvar.set(true);
    this.projetoService
      .alterar(projetoDados.id, dto)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Projeto alterado com sucesso',
          });
          this.mostrarDialogEditar.set(false);
          this.carregarProjeto(projetoDados.id);
        },
      });
  }

  navegarParaNovaDemanda(): void {
    const projetoDados = this.projeto();
    if (!projetoDados) return;
    this.router.navigate(['/demanda/nova'], { queryParams: { projetoId: projetoDados.id } });
  }

  navegarParaDemanda(demanda: DemandaResumoDto): void {
    this.router.navigate(['/demanda', demanda.id]);
  }

  voltarParaListagem(): void {
    this.router.navigate(['/projeto']);
  }

  severidadeStatus(status: ProjetoStatusEnum): 'success' | 'warn' | 'info' | 'danger' {
    const mapa: Record<ProjetoStatusEnum, 'success' | 'warn' | 'info' | 'danger'> = {
      [ProjetoStatusEnum.ATIVO]:     'success',
      [ProjetoStatusEnum.PAUSADO]:   'warn',
      [ProjetoStatusEnum.CONCLUIDO]: 'info',
      [ProjetoStatusEnum.CANCELADO]: 'danger',
    };
    return mapa[status];
  }

  rotuloStatus(status: ProjetoStatusEnum): string {
    const mapa: Record<ProjetoStatusEnum, string> = {
      [ProjetoStatusEnum.ATIVO]:     'Ativo',
      [ProjetoStatusEnum.PAUSADO]:   'Pausado',
      [ProjetoStatusEnum.CONCLUIDO]: 'Concluído',
      [ProjetoStatusEnum.CANCELADO]: 'Cancelado',
    };
    return mapa[status];
  }

  severidadeDemanda(status: DemandaStatusEnum): 'secondary' | 'warn' | 'success' {
    const mapa: Record<DemandaStatusEnum, 'secondary' | 'warn' | 'success'> = {
      [DemandaStatusEnum.PLANEJADA]:          'secondary',
      [DemandaStatusEnum.EM_DESENVOLVIMENTO]: 'warn',
      [DemandaStatusEnum.CONCLUIDA]:          'success',
    };
    return mapa[status];
  }

  rotuloStatusDemanda(status: DemandaStatusEnum): string {
    const mapa: Record<DemandaStatusEnum, string> = {
      [DemandaStatusEnum.PLANEJADA]:          'Planejada',
      [DemandaStatusEnum.EM_DESENVOLVIMENTO]: 'Em desenvolvimento',
      [DemandaStatusEnum.CONCLUIDA]:          'Concluída',
    };
    return mapa[status];
  }

  campoEditarInvalido(nomeCampo: string): boolean {
    const controle = this.formularioEditar.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  get previsaoAnteriorAoInicio(): boolean {
    return !!(
      this.formularioEditar.hasError('previsaoAnteriorAoInicio') &&
      this.formularioEditar.get('previsaoFimData')?.touched
    );
  }

  private carregarProjeto(identificador: number): void {
    this.carregando.set(true);
    this.projetoService
      .recuperar(identificador)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.projeto.set(resposta.dados);
          }
        },
      });
  }

  private carregarDemandas(projetoId: number): void {
    this.carregandoDemandas.set(true);
    this.httpClient
      .get<StandardResponse<PaginatedResult<DemandaResumoDto>>>(
        `${ambiente.apiUrl}/demanda`,
        { params: { projetoId: String(projetoId), itensPorPagina: '100' } },
      )
      .pipe(finalize(() => this.carregandoDemandas.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.demandas.set(resposta.dados.itens);
          }
        },
      });
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
