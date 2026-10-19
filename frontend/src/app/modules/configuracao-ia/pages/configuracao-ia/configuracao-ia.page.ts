import { Component, DestroyRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfiguracaoIaResumoDto, EsforcoIaEnum, EstadoIaEnum, ModoContextoChatEnum, TipoProvedorIaEnum } from '@project20/shared';
import { PromptsAbaComponent } from '../../components/prompts-aba/prompts-aba.component';
import { PrioridadesAbaComponent } from '../../components/prioridades-aba/prioridades-aba.component';
import { ConfiguracaoIaService } from '../../services/configuracao-ia.service';
import {
  EXPLICACAO_MODO_CONTEXTO,
  OPCOES_ESFORCO,
  OPCOES_MODO_CONTEXTO,
  OPCOES_PROVEDOR,
  ROTULO_ESTADO_IA,
  SEVERIDADE_ESTADO_IA,
  SUGESTOES_MODELOS,
  ValorFormularioConfiguracaoIa,
  formularioIgualAVersao,
  intervaloDoCheckinValido,
  paraDtoDeCriacao,
  rotuloDoEsforco,
  rotuloDoModoContexto,
  rotuloDoProvedor,
  valoresDaVersao,
} from '../../utils/configuracao-ia.util';

/**
 * Configurações da IA (task 132, exclusiva de administrador). Cada gravação cria uma versão nova (a antiga nunca muda); o histórico
 * mostra as versões e "Usar como base" só preenche o formulário. Análogo visual: a tela de Tags (página com título e conteúdo em cartões).
 */
@Component({
  selector: 'app-configuracao-ia-page',
  standalone: true,
  imports: [
    DatePipe,
    LowerCasePipe,
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TabsModule,
    TagModule,
    ToggleSwitchModule,
    PromptsAbaComponent,
    PrioridadesAbaComponent,
  ],
  templateUrl: './configuracao-ia.page.html',
  styleUrl: './configuracao-ia.page.scss',
})
export class ConfiguracaoIaPage implements OnInit {
  private readonly configuracaoIaService = inject(ConfiguracaoIaService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly opcoesProvedor = OPCOES_PROVEDOR;
  readonly opcoesEsforco = OPCOES_ESFORCO;
  readonly opcoesModoContexto = OPCOES_MODO_CONTEXTO;
  readonly explicacaoModoContexto = EXPLICACAO_MODO_CONTEXTO;
  readonly sugestoesModelos = SUGESTOES_MODELOS;
  readonly rotuloDoEsforco = rotuloDoEsforco;
  readonly rotuloDoModoContexto = rotuloDoModoContexto;
  readonly rotuloDoProvedor = rotuloDoProvedor;
  readonly rotuloEstado = ROTULO_ESTADO_IA;
  readonly severidadeEstado = SEVERIDADE_ESTADO_IA;

  private readonly abaPrompts = viewChild(PromptsAbaComponent);

  readonly carregando = signal(true);
  readonly jaCarregou = signal(false);
  readonly erro = signal(false);
  readonly salvando = signal(false);
  readonly ativa = signal<ConfiguracaoIaResumoDto | null>(null);
  readonly versoes = signal<ConfiguracaoIaResumoDto[]>([]);
  readonly estado = signal<EstadoIaEnum | null>(null);
  /** Versão do histórico aberta em leitura. */
  readonly selecionada = signal<ConfiguracaoIaResumoDto | null>(null);
  readonly tentouSalvar = signal(false);

  readonly formulario = this.formBuilder.nonNullable.group(
    {
      provedor: [TipoProvedorIaEnum.ANTHROPIC, Validators.required],
      modeloRapido: ['', [Validators.required, Validators.maxLength(100)]],
      modeloPadrao: ['', [Validators.required, Validators.maxLength(100)]],
      modeloAnalitico: ['', [Validators.required, Validators.maxLength(100)]],
      esforcoAnalitico: [EsforcoIaEnum.MEDIO, Validators.required],
      checkinMinimoMinutos: [null as number | null, [Validators.required, Validators.min(1)]],
      checkinMaximoMinutos: [null as number | null, [Validators.required, Validators.min(1)]],
      duracaoRecomendadaMinutos: [null as number | null, [Validators.required, Validators.min(1)]],
      checkinInteligente: [true],
      rigorProporcional: [true],
      deteccaoAutomatica: [true],
      duvidasCodigo: [false],
      modoContextoChat: [ModoContextoChatEnum.MISTURADO, Validators.required],
      iaDesligada: [true],
    },
    { validators: intervaloDoCheckinValido },
  );

  private readonly valorAtual = signal<ValorFormularioConfiguracaoIa>(this.formulario.getRawValue());

  /** Nada a salvar: o formulário é igual à versão ativa. */
  readonly semAlteracoes = computed(() => {
    const ativa = this.ativa();
    return !ativa || formularioIgualAVersao(this.valorAtual(), ativa);
  });

  readonly proximaVersao = computed(() => (this.ativa()?.versao ?? 0) + 1);

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
    if (this.formulario.invalid || this.semAlteracoes() || this.salvando()) return;

    this.salvando.set(true);
    this.configuracaoIaService.criar(paraDtoDeCriacao(this.formulario.getRawValue())).subscribe({
      next: (resposta) => {
        this.salvando.set(false);
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: resposta.mensagem });
        this.selecionada.set(null);
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

  selecionarVersao(versao: ConfiguracaoIaResumoDto): void {
    this.selecionada.set(this.selecionada()?.id === versao.id ? null : versao);
  }

  /** Preenche o formulário com os valores da versão; nada é gravado até salvar. */
  usarComoBase(versao: ConfiguracaoIaResumoDto): void {
    this.formulario.reset(valoresDaVersao(versao));
    this.valorAtual.set(this.formulario.getRawValue());
    this.formulario.markAsDirty();
    this.selecionada.set(null);
    this.messageService.add({
      severity: 'info',
      summary: 'Valores carregados',
      detail: `Valores da versão ${versao.versao} no formulário. Salvar cria a versão ${this.proximaVersao()}.`,
    });
  }

  /** O texto que explica o modo de contexto escolhido no formulário. */
  readonly explicacaoDoModoEscolhido = computed(() => this.explicacaoModoContexto[this.valorAtual().modoContextoChat]);

  campoInvalido(nome: keyof ValorFormularioConfiguracaoIa): boolean {
    const controle = this.formulario.controls[nome];
    return controle.invalid && (controle.touched || this.tentouSalvar());
  }

  intervaloInvalido(): boolean {
    return this.formulario.hasError('intervaloInvalido') && (this.tentouSalvar() || this.formulario.controls.checkinMaximoMinutos.touched);
  }
}
