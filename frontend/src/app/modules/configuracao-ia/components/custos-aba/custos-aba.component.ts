import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { IaCustoConsultadoDto, IaCustoModeloDto, hojeNoFuso } from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import { GraficoBarrasComponent } from '../../../../shared/components/grafico-barras/grafico-barras.component';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { IaCustoService } from '../../services/ia-custo.service';
import { formatarDolar, formatarTokens, montarCategoriasDeCusto, rotuloDoRecorte } from '../../utils/custos.util';

type RecorteDeCusto = 'MENSAL' | 'ANUAL';
type FormularioDePreco = FormGroup<{ entrada: FormControl<number>; saida: FormControl<number>; cache: FormControl<number> }>;

/**
 * Aba "Custos" das Configurações da IA (task 201, exclusiva de administrador): quanto a IA gastou no mês ou no ano (mensagens do chat,
 * tokens e custo estimado em dólar, task 202), por modelo e ao longo do período, e o preço de cada modelo (dólar por milhão de tokens), que o administrador
 * mantém aqui. O custo é uma estimativa: tokens gravados nas mensagens do chat × o preço cadastrado. Análogo visual: o Volume dos projetos.
 */
@Component({
  selector: 'app-custos-aba',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    SelectButtonModule,
    TagModule,
    TooltipModule,
    BarraRecargaComponent,
    GraficoBarrasComponent,
    SkeletonListaComponent,
  ],
  templateUrl: './custos-aba.component.html',
  styleUrl: './custos-aba.component.scss',
})
export class CustosAbaComponent implements OnInit {
  private readonly iaCustoService = inject(IaCustoService);
  private readonly messageService = inject(MessageService);

  /** O mês e o ano atuais no fuso do sistema: o teto da navegação. */
  readonly hoje = hojeNoFuso(ambiente.fusoHorario);

  readonly opcoesRecorte = [
    { rotulo: 'Mensal', valor: 'MENSAL' as RecorteDeCusto },
    { rotulo: 'Anual', valor: 'ANUAL' as RecorteDeCusto },
  ];
  readonly recorteControl = new FormControl<RecorteDeCusto>('MENSAL', { nonNullable: true });
  readonly recorte = signal<RecorteDeCusto>('MENSAL');
  readonly ano = signal<number>(this.hoje.getFullYear());
  /** 1 a 12; só vale no recorte mensal. */
  readonly mes = signal<number>(this.hoje.getMonth() + 1);

  readonly consulta = signal<IaCustoConsultadoDto | null>(null);
  readonly carregando = signal<boolean>(false);
  readonly erro = signal<boolean>(false);
  readonly primeiraCarga = computed(() => this.carregando() && this.consulta() === null);
  readonly recarregando = computed(() => this.carregando() && this.consulta() !== null);
  /** O modelo cujo preço está sendo gravado. */
  readonly salvando = signal<string | null>(null);

  /** Um grupo de preços por modelo, na mesma ordem de `consulta().modelos`. */
  readonly precos = new FormArray<FormularioDePreco>([]);

  readonly rotuloDoRecorte = computed(() => rotuloDoRecorte(this.ano(), this.recorte() === 'MENSAL' ? this.mes() : null));
  readonly noPeriodoAtual = computed(() =>
    this.recorte() === 'MENSAL'
      ? this.ano() === this.hoje.getFullYear() && this.mes() === this.hoje.getMonth() + 1
      : this.ano() === this.hoje.getFullYear(),
  );
  readonly categorias = computed(() => montarCategoriasDeCusto(this.consulta()?.periodos ?? []));
  readonly temUso = computed(() => (this.consulta()?.totais.mensagens ?? 0) > 0);

  readonly formatarDolar = formatarDolar;
  readonly formatarTokens = formatarTokens;

  constructor() {
    this.recorteControl.valueChanges.subscribe((recorte) => {
      this.recorte.set(recorte);
      this.carregar();
    });
  }

  ngOnInit(): void {
    this.carregar();
  }

  anterior(): void {
    if (this.recorte() === 'ANUAL') this.ano.update((ano) => ano - 1);
    else if (this.mes() === 1) {
      this.ano.update((ano) => ano - 1);
      this.mes.set(12);
    } else this.mes.update((mes) => mes - 1);
    this.carregar();
  }

  proximo(): void {
    if (this.noPeriodoAtual()) return;
    if (this.recorte() === 'ANUAL') this.ano.update((ano) => ano + 1);
    else if (this.mes() === 12) {
      this.ano.update((ano) => ano + 1);
      this.mes.set(1);
    } else this.mes.update((mes) => mes + 1);
    this.carregar();
  }

  irParaAtual(): void {
    this.ano.set(this.hoje.getFullYear());
    this.mes.set(this.hoje.getMonth() + 1);
    this.carregar();
  }

  carregar(): void {
    const recorte = this.recorte();
    const ano = this.ano();
    const mes = this.mes();
    this.carregando.set(true);
    this.erro.set(false);
    this.iaCustoService
      .consultar({ ano, mes: recorte === 'MENSAL' ? mes : undefined })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          // Uma resposta atrasada de outro período não pode sobrescrever o que está na tela.
          if (!resposta.sucesso || !resposta.dados || recorte !== this.recorte() || ano !== this.ano() || (recorte === 'MENSAL' && mes !== this.mes())) return;
          this.aplicar(resposta.dados);
        },
        error: () => this.erro.set(true),
      });
  }

  mudou(indice: number, modelo: IaCustoModeloDto): boolean {
    const grupo = this.precos.at(indice).getRawValue();
    return (
      grupo.entrada !== (modelo.preco?.precoEntradaMilhao ?? 0) ||
      grupo.saida !== (modelo.preco?.precoSaidaMilhao ?? 0) ||
      grupo.cache !== (modelo.preco?.precoCacheMilhao ?? 0) ||
      modelo.preco === null
    );
  }

  salvar(indice: number, modelo: IaCustoModeloDto): void {
    const grupo = this.precos.at(indice);
    if (grupo.invalid || this.salvando()) return;
    const valores = grupo.getRawValue();
    this.salvando.set(modelo.modelo);
    this.iaCustoService
      .alterarPreco({ modelo: modelo.modelo, precoEntradaMilhao: valores.entrada, precoSaidaMilhao: valores.saida, precoCacheMilhao: valores.cache })
      .pipe(finalize(() => this.salvando.set(null)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: `Preço de "${modelo.modelo}" salvo` });
          this.carregar();
        },
      });
  }

  descartar(indice: number, modelo: IaCustoModeloDto): void {
    this.precos.at(indice).setValue({
      entrada: modelo.preco?.precoEntradaMilhao ?? 0,
      saida: modelo.preco?.precoSaidaMilhao ?? 0,
      cache: modelo.preco?.precoCacheMilhao ?? 0,
    });
  }

  private aplicar(dados: IaCustoConsultadoDto): void {
    // Uma edição ainda não salva de outro modelo sobrevive à recarga (salvar um preço recarrega a consulta).
    const pendentes = new Map<string, FormularioDePreco>();
    this.precos.controls.forEach((grupo, indice) => {
      const nome = this.consulta()?.modelos[indice]?.modelo;
      if (nome && grupo.dirty) pendentes.set(nome, grupo);
    });
    this.consulta.set(dados);
    this.precos.clear();
    for (const modelo of dados.modelos) this.precos.push(pendentes.get(modelo.modelo) ?? this.novoGrupo(modelo));
  }

  private novoGrupo(modelo: IaCustoModeloDto): FormularioDePreco {
    const preco = (valor: number | undefined) => new FormControl(valor ?? 0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(100000)] });
    return new FormGroup({
      entrada: preco(modelo.preco?.precoEntradaMilhao),
      saida: preco(modelo.preco?.precoSaidaMilhao),
      cache: preco(modelo.preco?.precoCacheMilhao),
    });
  }
}
