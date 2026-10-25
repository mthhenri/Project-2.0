import { Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { ConfiguracaoIaResumoDto, EstadoIaEnum, TipoProvedorIaEnum } from '@project20/shared';
import { PromptsAbaComponent } from '../../components/prompts-aba/prompts-aba.component';
import { CustosAbaComponent } from '../../components/custos-aba/custos-aba.component';
import { AutonomiaAbaComponent } from '../../components/autonomia-aba/autonomia-aba.component';
import { ComportamentoAbaComponent } from '../../components/comportamento-aba/comportamento-aba.component';
import { HistoricoVersoesComponent } from '../../components/historico-versoes/historico-versoes.component';
import { ProvedorAbaComponent } from '../../components/provedor-aba/provedor-aba.component';
import { ConfiguracaoIaService } from '../../services/configuracao-ia.service';
import {
  ROTULO_ESTADO_IA,
  SEVERIDADE_ESTADO_IA,
  ValorFormularioConfiguracaoIa,
  criarFormularioConfiguracaoIa,
  errosDeProvedores,
  errosPorProvedor,
  formularioIgualAVersao,
  paraDtoDeCriacao,
  valoresDaVersao,
} from '../../utils/configuracao-ia.util';

/**
 * Configurações da IA (task 132, exclusiva de administrador; redesenhada na task 204). Cada gravação cria uma versão nova (a antiga nunca
 * muda). Fora das abas ficam o liga/desliga da IA, o histórico (coluna fixa) e a barra de salvar; as abas são Provedor e modelos,
 * Comportamento (check-in e chat), Autonomia (o que a IA faz sozinha, task 228), Prompts e Custos. "Usar como base" só preenche o formulário. Análogo visual: a tela de Tags.
 */
@Component({
  selector: 'app-configuracao-ia-page',
  standalone: true,
  imports: [
    LowerCasePipe,
    ReactiveFormsModule,
    ButtonModule,
    SkeletonModule,
    TabsModule,
    TagModule,
    ToggleSwitchModule,
    TooltipModule,
    ProvedorAbaComponent,
    ComportamentoAbaComponent,
    AutonomiaAbaComponent,
    HistoricoVersoesComponent,
    PromptsAbaComponent,
    CustosAbaComponent,
  ],
  templateUrl: './configuracao-ia.page.html',
  styleUrl: './configuracao-ia.page.scss',
})
export class ConfiguracaoIaPage implements OnInit {
  private readonly configuracaoIaService = inject(ConfiguracaoIaService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rotuloEstado = ROTULO_ESTADO_IA;
  readonly severidadeEstado = SEVERIDADE_ESTADO_IA;

  /** A aba aberta; a de custos só é montada enquanto está aberta, para recarregar a cada entrada. */
  readonly abaAtiva = signal<string>('provedor');
  private readonly abaPrompts = viewChild(PromptsAbaComponent);

  readonly carregando = signal(true);
  readonly jaCarregou = signal(false);
  readonly erro = signal(false);
  readonly salvando = signal(false);
  readonly ativa = signal<ConfiguracaoIaResumoDto | null>(null);
  readonly versoes = signal<ConfiguracaoIaResumoDto[]>([]);
  readonly estado = signal<EstadoIaEnum | null>(null);
  /** Provedores com chave de API no ambiente; `null` quando o estado não pôde ser lido. */
  readonly provedoresComChave = signal<TipoProvedorIaEnum[] | null>(null);
  readonly tentouSalvar = signal(false);

  readonly formulario = criarFormularioConfiguracaoIa(this.formBuilder);

  readonly valorAtual = signal<ValorFormularioConfiguracaoIa>(this.formulario.getRawValue());

  /** Nada a salvar: o formulário é igual à versão ativa. */
  readonly semAlteracoes = computed(() => {
    const ativa = this.ativa();
    return !ativa || formularioIgualAVersao(this.valorAtual(), ativa);
  });

  /** Erros de provedor e modelo (a regra do shared, a mesma da service): aparecem depois da primeira tentativa de salvar. */
  readonly errosDeProvedor = computed(() => errosDeProvedores(this.valorAtual()));
  readonly errosDeProvedorVisiveis = computed(() => (this.tentouSalvar() ? this.errosDeProvedor() : []));
  readonly errosPorProvedorVisiveis = computed(() => (this.tentouSalvar() ? errosPorProvedor(this.valorAtual()) : {}));

  /** Algum campo da aba Comportamento inválido (minutos ou intervalo do check-in). */
  readonly comportamentoInvalido = computed(() => {
    this.valorAtual();
    const { checkinMinimoMinutos, checkinMaximoMinutos, duracaoRecomendadaMinutos } = this.formulario.controls;
    return checkinMinimoMinutos.invalid || checkinMaximoMinutos.invalid || duracaoRecomendadaMinutos.invalid || this.formulario.hasError('intervaloInvalido');
  });

  /** As abas com erro depois de uma tentativa de salvar ganham um indicador. */
  readonly provedorComErro = computed(() => this.tentouSalvar() && this.errosDeProvedor().length > 0);
  readonly comportamentoComErro = computed(() => this.tentouSalvar() && this.comportamentoInvalido());

  /** A barra de salvar é da configuração versionada: fica nas abas dela e, nas outras, só enquanto há algo pendente (o liga/desliga mexe nela de qualquer aba). */
  readonly barraDeSalvarVisivel = computed(() => ['provedor', 'comportamento', 'autonomia'].includes(this.abaAtiva()) || !this.semAlteracoes());

  readonly proximaVersao = computed(() => (this.ativa()?.versao ?? 0) + 1);

  /** O que o interruptor "Ligar a IA" mostra agora (o inverso do `iaDesligada` do formulário): o texto ao lado dele acompanha. */
  readonly iaLigada = computed(() => !this.valorAtual().iaDesligada);

  constructor() {
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.valorAtual.set(this.formulario.getRawValue()));
  }

  ngOnInit(): void {
    this.carregar();
  }

  /** Usado pela rota: sair da tela com rascunho de prompt pendente pergunta antes. */
  podeSair(): Promise<boolean> {
    return this.abaPrompts()?.podeSair() ?? Promise.resolve(true);
  }

  carregar(): void {
    this.carregando.set(true);
    this.erro.set(false);
    forkJoin({
      ativa: this.configuracaoIaService.recuperarAtiva(),
      versoes: this.configuracaoIaService.listarVersoes(),
      estado: this.configuracaoIaService.recuperarEstado().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ ativa, versoes, estado }) => {
        if (!ativa.dados || !versoes.dados) {
          this.erro.set(true);
          this.carregando.set(false);
          return;
        }
        this.ativa.set(ativa.dados);
        this.versoes.set(versoes.dados.itens);
        this.estado.set(estado?.dados?.estado ?? null);
        this.provedoresComChave.set(estado?.dados?.provedoresComChave ?? null);
        this.formulario.reset(valoresDaVersao(ativa.dados));
        this.valorAtual.set(this.formulario.getRawValue());
        this.tentouSalvar.set(false);
        this.carregando.set(false);
        this.jaCarregou.set(true);
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  salvar(): void {
    this.tentouSalvar.set(true);
    if (this.formulario.invalid || this.errosDeProvedor().length > 0) {
      // O erro pode estar numa aba que não é a aberta: leva à primeira com problema.
      if (this.errosDeProvedor().length > 0) this.abaAtiva.set('provedor');
      else if (this.comportamentoInvalido()) this.abaAtiva.set('comportamento');
      return;
    }
    if (this.semAlteracoes() || this.salvando()) return;

    this.salvando.set(true);
    this.configuracaoIaService.criar(paraDtoDeCriacao(this.formulario.getRawValue())).subscribe({
      next: (resposta) => {
        this.salvando.set(false);
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: resposta.mensagem });
        this.carregar();
      },
      error: () => this.salvando.set(false),
    });
  }

  /** Volta o formulário ao que está ativo. */
  descartarAlteracoes(): void {
    const ativa = this.ativa();
    if (!ativa) return;
    this.formulario.reset(valoresDaVersao(ativa));
    this.valorAtual.set(this.formulario.getRawValue());
    this.tentouSalvar.set(false);
  }

  /** Preenche o formulário com os valores da versão; nada é gravado até salvar. */
  usarComoBase(versao: ConfiguracaoIaResumoDto): void {
    this.formulario.reset(valoresDaVersao(versao));
    this.valorAtual.set(this.formulario.getRawValue());
    this.formulario.markAsDirty();
    this.messageService.add({
      severity: 'info',
      summary: 'Valores carregados',
      detail: `Valores da versão ${versao.versao} no formulário. Salvar cria a versão ${this.proximaVersao()}.`,
    });
  }
}
