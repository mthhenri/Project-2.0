import { Component, HostListener, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { ProjetoVolumeVigenciaResumoDto, LIMITE_VOLUME_ESPERADO_HORAS_MES, hojeNoFuso } from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';
import { ProjetoService } from '../../services/projeto.service';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { formatarTempoExibicao } from '../../../../core/models/visualizacao-tempo.model';
import { formatarDataIso } from '../../../demanda/utils/demanda-datas.util';

@Component({
  selector: 'app-projeto-volume-vigencias',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DatePickerModule, InputNumberModule, Select],
  templateUrl: './projeto-volume-vigencias.component.html',
  styleUrl: './projeto-volume-vigencias.component.scss',
})
export class ProjetoVolumeVigenciasComponent {
  private readonly servico = inject(ProjetoService);
  private readonly unidadeTempo = inject(VisualizacaoTempoService);
  private readonly formBuilder = inject(FormBuilder);
  readonly projetoId = input.required<number>();
  readonly hoje = hojeNoFuso(ambiente.fusoHorario);
  readonly vigencias = signal<ProjetoVolumeVigenciaResumoDto[]>([]);
  readonly carregando = signal(false);
  readonly salvando = signal(false);
  readonly erro = signal('');
  readonly limite = LIMITE_VOLUME_ESPERADO_HORAS_MES;
  readonly opcoes = [{ rotulo: 'Definir horas', valor: false }, { rotulo: 'Sem volume', valor: true }];
  readonly formulario = this.formBuilder.group({
    mes: [this.hoje as Date | null, Validators.required],
    horas: [null as number | null, [Validators.min(0), Validators.max(this.limite), Validators.pattern(/^\d+$/)]],
    semVolume: [false],
  });
  readonly vigente = computed(() => {
    const mesHoje = formatarDataIso(this.hoje).slice(0, 7);
    return this.vigencias().find(vigencia => vigencia.vigenciaInicioData.slice(0, 7) <= mesHoje)?.volumeEsperadoHoras ?? null;
  });

  constructor() { effect(() => this.carregar(this.projetoId())); }

  /** O Enter no bloco pertence ao volume, sem confirmar e fechar o cadastro do projeto. */
  @HostListener('keydown.enter', ['$event'])
  aoConfirmar(evento: Event): void {
    evento.stopPropagation();
    const teclado = evento as KeyboardEvent;
    if (teclado.isComposing || teclado.shiftKey || teclado.altKey) return;
    const alvo = evento.target as HTMLElement | null;
    if (alvo?.getAttribute('role') === 'spinbutton') {
      evento.preventDefault();
      this.salvar();
    }
  }

  carregar(projetoId = this.projetoId()): void {
    this.vigencias.set([]);
    this.erro.set('');
    this.carregando.set(true);
    this.servico.listarVigencias({ projetoId }).pipe(finalize(() => {
      if (this.projetoId() === projetoId) this.carregando.set(false);
    })).subscribe({
      next: resposta => { if (this.projetoId() === projetoId) this.vigencias.set(resposta.dados ?? []); },
      error: () => { if (this.projetoId() === projetoId) this.erro.set('Não foi possível carregar as vigências.'); },
    });
  }

  salvar(): void {
    if (this.carregando() || this.salvando()) return;
    const valor = this.formulario.getRawValue();
    if (this.formulario.controls.mes.invalid || (!valor.semVolume && (valor.horas === null || this.formulario.controls.horas.invalid))) {
      this.formulario.markAllAsTouched();
      this.erro.set('Informe o mês e horas inteiras, ou escolha Sem volume.');
      return;
    }
    const projetoId = this.projetoId();
    this.salvando.set(true);
    this.erro.set('');
    this.servico.criarVigencia({ projetoId, vigenciaInicioData: formatarDataIso(valor.mes!), volumeEsperadoHoras: valor.semVolume ? null : valor.horas })
      .pipe(finalize(() => this.salvando.set(false))).subscribe({
        next: resposta => {
          if (this.projetoId() !== projetoId || !resposta.dados) return;
          const gravada = resposta.dados;
          this.vigencias.update(atuais => [...atuais.filter(vigencia => vigencia.vigenciaInicioData !== gravada.vigenciaInicioData), gravada]
            .sort((primeira, segunda) => segunda.vigenciaInicioData.localeCompare(primeira.vigenciaInicioData)));
        },
        error: () => { if (this.projetoId() === projetoId) this.erro.set('Não foi possível salvar o volume. Tente novamente.'); },
      });
  }

  excluir(vigencia: ProjetoVolumeVigenciaResumoDto): void {
    if (this.carregando() || this.salvando()) return;
    const projetoId = this.projetoId();
    this.salvando.set(true);
    this.erro.set('');
    this.servico.excluirVigencia({ projetoId, vigenciaId: vigencia.id }).pipe(finalize(() => this.salvando.set(false))).subscribe({
      next: () => { if (this.projetoId() === projetoId) this.vigencias.update(atuais => atuais.filter(atual => atual.id !== vigencia.id)); },
      error: () => { if (this.projetoId() === projetoId) this.erro.set('Não foi possível excluir a vigência. Tente novamente.'); },
    });
  }

  formatarVolume(horas: number | null): string { return horas === null ? 'sem volume definido' : formatarTempoExibicao(horas, this.unidadeTempo.emDias(), 'horas'); }
  formatarMes(data: string): string { return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${data}T12:00:00Z`)); }
}
