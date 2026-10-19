import { Component, ElementRef, OnInit, inject, input, output, signal, viewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of, finalize } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';
import {
  AtividadeCriarDto,
  DemandaAtribuidaDto,
  MENSAGEM_CARACTERES_PROIBIDOS,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  TagResumoDto,
  TipoAtividadePrioridadeEnum,
  TipoAtividadeStatusEnum,
  TipoUsuarioStatusEnum,
  UsuarioResumoDto,
} from '@project20/shared';
import { AtividadePrioridadeService } from '../../../../core/services/atividade-prioridade.service';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { PrioridadeSeloComponent } from '../../../../shared/components/prioridade-selo/prioridade-selo.component';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { AtividadeService } from '../../services/atividade.service';
import { ATIVIDADE_STATUS_OPCOES, severidadeStatusAtividade } from '../../models/atividade.model';

type DemandaAtribuidaOpcao = DemandaAtribuidaDto & { rotulo: string };

/**
 * Formulário de nova atividade, **o mesmo** no dialog da listagem/demanda e na rota `/atividade/nova`: mesmos campos, mesmos
 * defaults (status Desenvolvendo, responsável "Eu mesmo"). Quem hospeda cuida dos botões e chama `salvar()`.
 */
@Component({
  selector: 'app-atividade-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, Select, PrioridadeSeloComponent, BloquearCaracteresProibidosDirective],
  templateUrl: './atividade-formulario.component.html',
  styleUrl: './atividade-formulario.component.scss',
})
export class AtividadeFormularioComponent implements OnInit {
  private readonly atividadeService = inject(AtividadeService);
  private readonly tagService = inject(TagService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly demandaService = inject(DemandaService);
  private readonly messageService = inject(MessageService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);
  protected readonly prioridadeService = inject(AtividadePrioridadeService);

  /** Demanda já escolhida ao abrir (opcional); sem ela o seletor de demanda fica vazio e recebe o foco. */
  readonly demandaIdInicial = input<number | null>(null);
  /** Emite a cada atividade criada: o id, e se o chamador deve manter o formulário aberto (`criarOutra`). */
  readonly criada = output<{ id: number; criarOutra: boolean }>();

  private readonly campoNome = viewChild<ElementRef<HTMLInputElement>>('campoNome');
  private readonly seletorDemanda = viewChild<Select>('seletorDemanda');

  readonly salvando = signal<boolean>(false);
  readonly demandasAtribuidas = signal<DemandaAtribuidaOpcao[]>([]);
  readonly carregandoDemandasAtribuidas = signal<boolean>(false);
  readonly todasAsTags = signal<TagResumoDto[]>([]);
  readonly carregandoTags = signal<boolean>(false);
  readonly usuarios = signal<UsuarioResumoDto[]>([]);

  readonly statusOpcoes = ATIVIDADE_STATUS_OPCOES;
  readonly severidadeStatus = severidadeStatusAtividade;
  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

  readonly formulario = this.formBuilder.group({
    nome:      ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
    demandaId: [null as number | null, [Validators.required]],
    usuarioId: [null as number | null],
    status:    [TipoAtividadeStatusEnum.DESENVOLVENDO as TipoAtividadeStatusEnum, [Validators.required]],
    prioridade: [TipoAtividadePrioridadeEnum.INDEFINIDA as TipoAtividadePrioridadeEnum, [Validators.required]],
    tagIds:    [[] as number[]],
  });

  ngOnInit(): void {
    this.formulario.patchValue({ demandaId: this.demandaIdInicial() });
    this.prioridadeService.carregar();
    this.carregarDemandasAtribuidas();
    this.carregarTodasAsTags();
    if (this.sessao.eGestor()) this.carregarUsuarios();
    // Com a demanda definida o foco vai para o nome; sem ela, para o seletor de demanda (nunca um beco sem saída).
    setTimeout(() => (this.demandaIdInicial() ? this.campoNome()?.nativeElement.focus() : this.seletorDemanda()?.focus()));
  }

  /** `criarOutra`: mantém demanda, responsável, status e tags e limpa o nome, para cadastro em série. */
  salvar(criarOutra = false): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    const valor = this.formulario.value;
    const dto: AtividadeCriarDto = {
      demandaId: valor.demandaId!,
      nome:      valor.nome!,
      status:    valor.status!,
      prioridade: valor.prioridade!,
    };
    if (this.sessao.eGestor() && valor.usuarioId) dto.usuarioId = valor.usuarioId;
    if (valor.tagIds?.length) dto.tagIds = valor.tagIds;

    this.atividadeService
      .criar(dto)
      .pipe(finalize(() => this.salvando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (!resposta.sucesso || !resposta.dados) return;
          const atividadeId = resposta.dados.id;
          this.avisarCriacao(atividadeId);
          if (criarOutra) {
            this.formulario.controls.nome.reset('');
            this.campoNome()?.nativeElement.focus();
          }
          this.criada.emit({ id: atividadeId, criarOutra });
        },
      });
  }

  /** O aviso de criação traz o atalho "Ver atividade" (no lugar do "Desfazer" do toast de ofertas). */
  private avisarCriacao(atividadeId: number): void {
    this.desfazerService.oferecer({
      mensagem: 'Atividade criada com sucesso',
      rotulo: 'Ver atividade',
      desfazer: () => of(null),
      aposDesfazer: () => this.router.navigate(['/atividade', atividadeId]),
      mensagemAposDesfazer: '',
    });
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  alternarTagSelecao(controle: AbstractControl, tagId: number): void {
    const selecionadas = (controle.value as number[] | null) ?? [];
    controle.setValue(
      selecionadas.includes(tagId) ? selecionadas.filter((id) => id !== tagId) : [...selecionadas, tagId],
    );
    controle.markAsDirty();
  }

  tagEstaSelecionada(controle: AbstractControl, tagId: number): boolean {
    return ((controle.value as number[] | null) ?? []).includes(tagId);
  }

  private carregarDemandasAtribuidas(): void {
    this.carregandoDemandasAtribuidas.set(true);
    this.demandaService
      .listarAtribuidas()
      .pipe(finalize(() => this.carregandoDemandasAtribuidas.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.demandasAtribuidas.set(
              resposta.dados.map((demanda) => ({ ...demanda, rotulo: `${demanda.nomeProjeto} - ${demanda.nome}` })),
            );
          }
        },
      });
  }

  private carregarTodasAsTags(): void {
    this.carregandoTags.set(true);
    this.tagService
      .listar()
      .pipe(finalize(() => this.carregandoTags.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.todasAsTags.set(resposta.dados);
        },
      });
  }

  private carregarUsuarios(): void {
    this.usuarioService.listar({ status: TipoUsuarioStatusEnum.ATIVO, itensPorPagina: 100 }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.usuarios.set(resposta.dados.itens);
      },
    });
  }
}
