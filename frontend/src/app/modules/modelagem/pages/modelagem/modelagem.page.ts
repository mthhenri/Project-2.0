import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import type { ModelagemDiagramaDto, ModelagemGrupoDto, ModelagemTabelaAlteradaDto, ModelagemTabelaAlterarDto, ModelagemTabelaDto } from '@project20/shared';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { ModelagemDetalheComponent } from '../../components/modelagem-detalhe/modelagem-detalhe.component';
import { ModelagemDiagramaComponent } from '../../components/modelagem-diagrama/modelagem-diagrama.component';
import { GrupoSalvo, ModelagemGrupoDialogComponent } from '../../components/modelagem-grupo-dialog/modelagem-grupo-dialog.component';
import { ModelagemService } from '../../services/modelagem.service';
import { contarTabelasPorGrupo, grupoDaTabela, gruposDoDiagrama, ID_SEM_GRUPO, tabelaCasaBusca } from '../../utils/modelagem.util';

/**
 * Tela Modelagem: o diagrama do banco (sempre o schema atual, lido do catálogo do PostgreSQL), aberto a todos os usuários
 * autenticados. Análoga ao grafo de demandas (zoom e controles flutuantes) com o cabeçalho das telas de configuração. Gestor e
 * administrador também criam, renomeiam e excluem grupos e movem tabelas entre eles (o grupo e a posição ficam salvos no banco, para
 * todos). Os dados vêm do backend (`GET /modelagem`): não há nada a regerar.
 */
@Component({
  selector: 'app-modelagem-page',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, TooltipModule, ModelagemDiagramaComponent, ModelagemDetalheComponent, ModelagemGrupoDialogComponent],
  templateUrl: './modelagem.page.html',
  styleUrl: './modelagem.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelagemPage implements OnInit {
  private readonly modelagemService = inject(ModelagemService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly diagramaComponente = viewChild(ModelagemDiagramaComponent);
  private readonly detalheComponente = viewChild(ModelagemDetalheComponent);
  private readonly grupoDialog = viewChild.required(ModelagemGrupoDialogComponent);

  readonly diagrama = signal<ModelagemDiagramaDto | null>(null);
  readonly erro = signal(false);
  readonly selecionada = signal<string | null>(null);
  readonly gruposVisiveis = signal<ReadonlySet<number>>(new Set());

  readonly podeEditar = computed(() => this.sessao.eGestor());

  readonly campoBusca = new FormControl('', { nonNullable: true });
  readonly busca = toSignal(this.campoBusca.valueChanges, { initialValue: '' });

  readonly resumo = computed(() => {
    const diagrama = this.diagrama();
    return diagrama ? `${diagrama.tabelas.length} tabelas` : '';
  });

  /** Os botões de filtro: os grupos (e o "Sem grupo", quando há tabelas nele) com a cor, a contagem e se estão ligados. */
  readonly gruposDoFiltro = computed(() => {
    const diagrama = this.diagrama();
    if (!diagrama) return [];
    const contagem = contarTabelasPorGrupo(diagrama.tabelas);
    return gruposDoDiagrama(diagrama).map((grupo) => ({
      ...grupo,
      tabelas: contagem.get(grupo.id) ?? 0,
      visivel: this.gruposVisiveis().has(grupo.id),
      editavel: grupo.id !== ID_SEM_GRUPO,
    }));
  });

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.erro.set(false);
    this.modelagemService.obterDiagrama().subscribe({
      next: (resposta) => {
        if (!resposta.dados) {
          this.erro.set(true);
          return;
        }
        this.diagrama.set(resposta.dados);
        this.gruposVisiveis.set(new Set([ID_SEM_GRUPO, ...resposta.dados.grupos.map((grupo) => grupo.id)]));
      },
      error: () => this.erro.set(true),
    });
  }

  alternarGrupo(id: number): void {
    const visiveis = new Set(this.gruposVisiveis());
    if (!visiveis.delete(id)) visiveis.add(id);
    this.gruposVisiveis.set(visiveis);
    const escolhida = this.diagrama()?.tabelas.find((tabela) => tabela.nome === this.selecionada());
    if (escolhida && !visiveis.has(grupoDaTabela(escolhida))) this.selecionada.set(null);
  }

  /** Escolhe a tabela (vinda do painel ou da busca) e leva a vista até ela. */
  escolherTabela(nome: string): void {
    this.selecionada.set(nome);
    this.diagramaComponente()?.centralizarEm(nome);
  }

  aoEnterNaBusca(): void {
    const diagrama = this.diagrama();
    if (!diagrama) return;
    const primeira = diagrama.tabelas.find((tabela) => this.gruposVisiveis().has(grupoDaTabela(tabela)) && tabelaCasaBusca(tabela, this.busca()));
    if (primeira && this.busca().trim()) this.escolherTabela(primeira.nome);
  }

  aoEscNaBusca(): void {
    this.campoBusca.setValue('');
  }

  // --- Grupos (gestor e administrador) ---

  novoGrupo(): void {
    this.grupoDialog().abrirParaCriar();
  }

  editarGrupo(grupo: ModelagemGrupoDto): void {
    const diagrama = this.diagrama();
    if (!diagrama) return;
    this.grupoDialog().abrirParaEditar(grupo, contarTabelasPorGrupo(diagrama.tabelas).get(grupo.id) ?? 0);
  }

  aoSalvarGrupo(resultado: GrupoSalvo): void {
    const { grupo, criado } = resultado;
    this.diagrama.update((diagrama) =>
      diagrama && { ...diagrama, grupos: criado ? [...diagrama.grupos, grupo] : diagrama.grupos.map((existente) => (existente.id === grupo.id ? grupo : existente)) },
    );
    if (criado) this.gruposVisiveis.update((visiveis) => new Set([...visiveis, grupo.id]));
  }

  aoExcluirGrupo(id: number): void {
    this.diagrama.update((diagrama) => diagrama && { ...diagrama, grupos: diagrama.grupos.filter((grupo) => grupo.id !== id) });
    this.gruposVisiveis.update((visiveis) => new Set([...visiveis].filter((visivel) => visivel !== id)));
  }

  // --- Tabelas (gestor e administrador) ---

  /** Chamado ao soltar uma tabela arrastada: grava só a posição (o grupo que está no servidor não é tocado). */
  salvarPosicao(posicao: { nome: string; x: number; y: number }): void {
    this.gravarTabela(
      posicao.nome,
      { x: posicao.x, y: posicao.y },
      (tabela, gravada) => ({ ...tabela, x: gravada.x, y: gravada.y }),
      () => this.diagramaComponente()?.descartarPosicao(posicao.nome),
    );
  }

  /**
   * Chamado ao trocar o grupo no painel: grava só o grupo (a posição que está no servidor não é tocada), mostra o grupo se estava
   * desligado e relê o diagrama, porque as tabelas `tipo_*` sem linha própria acompanham o grupo de quem as referencia.
   */
  moverParaGrupo(pedido: { nome: string; grupoId: number | null }): void {
    this.gravarTabela(
      pedido.nome,
      { grupoId: pedido.grupoId },
      (tabela, gravada) => ({ ...tabela, grupoId: gravada.grupoId }),
      () => this.detalheComponente()?.redefinirGrupo(),
      true,
    );
  }

  /** Cada gravação aplica na tela só os campos que pediu: a resposta de uma não desfaz o que outra acabou de mudar. */
  private gravarTabela(
    nome: string,
    corpo: ModelagemTabelaAlterarDto,
    aplicar: (tabela: ModelagemTabelaDto, gravada: ModelagemTabelaAlteradaDto) => ModelagemTabelaDto,
    aoFalhar: () => void,
    relerDiagrama = false,
  ): void {
    this.modelagemService.alterarTabela(nome, corpo).subscribe({
      next: (resposta) => {
        const gravada = resposta.dados;
        if (!gravada) return aoFalhar();
        this.diagrama.update((diagrama) => diagrama && { ...diagrama, tabelas: diagrama.tabelas.map((tabela) => (tabela.nome === gravada.nome ? aplicar(tabela, gravada) : tabela)) });
        if (corpo.grupoId !== undefined) this.gruposVisiveis.update((visiveis) => new Set([...visiveis, gravada.grupoId ?? ID_SEM_GRUPO]));
        if (relerDiagrama) this.relerDiagrama();
      },
      error: aoFalhar,
    });
  }

  /** Troca o diagrama pelo do servidor sem mexer nos filtros nem na tabela escolhida. */
  private relerDiagrama(): void {
    this.modelagemService.obterDiagrama().subscribe({
      next: (resposta) => {
        if (resposta.dados) this.diagrama.set(resposta.dados);
      },
    });
  }
}
