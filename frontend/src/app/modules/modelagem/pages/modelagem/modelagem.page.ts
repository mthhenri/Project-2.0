import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import type { ModelagemDiagramaDto } from '@project20/shared';
import { ModelagemService } from '../../services/modelagem.service';
import { ModelagemDetalheComponent } from '../../components/modelagem-detalhe/modelagem-detalhe.component';
import { ModelagemDiagramaComponent } from '../../components/modelagem-diagrama/modelagem-diagrama.component';
import { tabelaCasaBusca } from '../../utils/modelagem.util';

const QUANTIDADE_DE_CORES = 8;

/**
 * Tela Modelagem: o diagrama do banco (sempre o schema atual, lido do catálogo do PostgreSQL), aberto a todos os
 * usuários autenticados. Análoga ao grafo de demandas (zoom e controles flutuantes) com o cabeçalho das telas de
 * configuração. Os dados vêm do backend (`GET /modelagem`), montados do catálogo do banco: não há nada a regerar.
 */
@Component({
  selector: 'app-modelagem-page',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, ModelagemDiagramaComponent, ModelagemDetalheComponent],
  templateUrl: './modelagem.page.html',
  styleUrl: './modelagem.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelagemPage implements OnInit {
  private readonly modelagemService = inject(ModelagemService);
  private readonly diagramaComponente = viewChild(ModelagemDiagramaComponent);

  readonly diagrama = signal<ModelagemDiagramaDto | null>(null);
  readonly erro = signal(false);
  readonly selecionada = signal<string | null>(null);
  readonly gruposVisiveis = signal<ReadonlySet<string>>(new Set());

  readonly campoBusca = new FormControl('', { nonNullable: true });
  readonly busca = toSignal(this.campoBusca.valueChanges, { initialValue: '' });

  readonly resumo = computed(() => {
    const diagrama = this.diagrama();
    return diagrama ? `${diagrama.tabelas.length} tabelas` : '';
  });

  readonly gruposDoFiltro = computed(() =>
    (this.diagrama()?.grupos ?? []).map((grupo, indice) => ({ ...grupo, cor: indice % QUANTIDADE_DE_CORES, visivel: this.gruposVisiveis().has(grupo.id) })),
  );

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
        this.gruposVisiveis.set(new Set(resposta.dados.grupos.map((grupo) => grupo.id)));
      },
      error: () => this.erro.set(true),
    });
  }

  alternarGrupo(id: string): void {
    const visiveis = new Set(this.gruposVisiveis());
    if (!visiveis.delete(id)) visiveis.add(id);
    this.gruposVisiveis.set(visiveis);
    const escolhida = this.diagrama()?.tabelas.find((tabela) => tabela.nome === this.selecionada());
    if (escolhida && !visiveis.has(escolhida.grupo)) this.selecionada.set(null);
  }

  /** Escolhe a tabela (vinda do painel ou da busca) e leva a vista até ela. */
  escolherTabela(nome: string): void {
    this.selecionada.set(nome);
    this.diagramaComponente()?.centralizarEm(nome);
  }

  aoEnterNaBusca(): void {
    const diagrama = this.diagrama();
    if (!diagrama) return;
    const primeira = diagrama.tabelas.find((tabela) => this.gruposVisiveis().has(tabela.grupo) && tabelaCasaBusca(tabela, this.busca()));
    if (primeira && this.busca().trim()) this.escolherTabela(primeira.nome);
  }

  aoEscNaBusca(): void {
    this.campoBusca.setValue('');
  }
}
