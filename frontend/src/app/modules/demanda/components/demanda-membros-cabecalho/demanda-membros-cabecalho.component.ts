import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutoComplete, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { TooltipModule } from 'primeng/tooltip';
import { DemandaMembroDto, UsuarioResumoDto } from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { normalizarTexto } from '../../utils/demanda-filtro.util';

/**
 * Membros da demanda no cabeçalho do detalhe (task 108): pilha de avatares, `+` com autocomplete inline
 * (gestor), remover no hover com "Desfazer" e "Participar"/"Sair" para o desenvolvedor. Substitui a aba
 * "Membros" no detalhe (o dialog "Membros" do menu de contexto da árvore segue existindo).
 */
@Component({
  selector: 'app-demanda-membros-cabecalho',
  standalone: true,
  imports: [FormsModule, AutoComplete, TooltipModule],
  templateUrl: './demanda-membros-cabecalho.component.html',
  styleUrl: './demanda-membros-cabecalho.component.scss',
})
export class DemandaMembrosCabecalhoComponent {
  private readonly demandaService = inject(DemandaService);
  private readonly desfazerService = inject(DesfazerService);
  readonly sessao = inject(UsuarioSessaoService);

  readonly demandaId = input.required<number>();
  /** Usuários que o gestor pode adicionar (sem gestores); vazio para o desenvolvedor. */
  readonly usuariosDisponiveis = input<UsuarioResumoDto[]>([]);
  readonly membros = model<DemandaMembroDto[]>([]);
  /** Mostra o nome ao lado do avatar (a demanda aberta da Árvore); sem isso, só a pilha de avatares. */
  readonly comNome = input<boolean>(false);
  readonly membrosAlterados = output<void>();

  readonly adicionando = signal<boolean>(false);
  readonly sugestoes = signal<UsuarioResumoDto[]>([]);
  termoBusca: UsuarioResumoDto | string | null = null;

  readonly souMembro = computed(() => this.membros().some((membro) => membro.usuarioId === this.sessao.id()));

  iniciais(nomeCompleto: string): string {
    return (nomeCompleto ?? '').split(' ').slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  }

  abrirBusca(): void {
    this.termoBusca = null;
    this.adicionando.set(true);
  }

  fecharBusca(): void {
    this.adicionando.set(false);
    this.termoBusca = null;
  }

  buscar(evento: AutoCompleteCompleteEvent): void {
    const termo = normalizarTexto(evento.query.trim());
    const jaMembros = new Set(this.membros().map((membro) => membro.usuarioId));
    this.sugestoes.set(
      this.usuariosDisponiveis().filter(
        (usuario) =>
          !jaMembros.has(usuario.id) &&
          (normalizarTexto(usuario.nomeCompleto).includes(termo) || normalizarTexto(usuario.login).includes(termo)),
      ),
    );
  }

  /** Escolher na lista (clique ou Enter) já adiciona: POST individual, otimista. */
  aoEscolher(usuario: UsuarioResumoDto): void {
    const anteriores = this.membros();
    const novo: DemandaMembroDto = {
      usuarioId: usuario.id,
      nomeCompleto: usuario.nomeCompleto,
      login: usuario.login,
      tipo: usuario.tipo,
      cargoTitulo: usuario.cargoTitulo,
    };
    this.membros.set([...anteriores, novo]);
    this.fecharBusca();

    this.demandaService.atribuirMembro(this.demandaId(), { usuarioId: usuario.id }).subscribe({
      next: () => this.membrosAlterados.emit(),
      error: () => this.membros.set(anteriores),
    });
  }

  /** Remoção imediata com "Desfazer" no toast (re-POST). */
  remover(membro: DemandaMembroDto): void {
    const anteriores = this.membros();
    this.membros.set(anteriores.filter((item) => item.usuarioId !== membro.usuarioId));

    this.demandaService.removerMembro(this.demandaId(), membro.usuarioId).subscribe({
      next: () => {
        this.membrosAlterados.emit();
        this.desfazerService.oferecer({
          mensagem: `${membro.nomeCompleto} removido da demanda`,
          desfazer: () => this.demandaService.atribuirMembro(this.demandaId(), { usuarioId: membro.usuarioId }),
          aposDesfazer: () => {
            this.membros.update((lista) => (lista.some((item) => item.usuarioId === membro.usuarioId) ? lista : [...lista, membro]));
            this.membrosAlterados.emit();
          },
        });
      },
      error: () => this.membros.set(anteriores),
    });
  }

  /** Desenvolvedor entra na demanda (sem confirmação). */
  participar(): void {
    const usuarioId = this.sessao.id();
    if (usuarioId === undefined) return;
    this.demandaService.atribuirMembro(this.demandaId(), { usuarioId }).subscribe({
      next: () =>
        this.demandaService.listarMembros(this.demandaId()).subscribe((resposta) => {
          if (resposta.sucesso && resposta.dados) this.membros.set(resposta.dados);
          this.membrosAlterados.emit();
        }),
    });
  }

  /** Desenvolvedor sai da demanda: imediato, com "Desfazer". */
  sair(): void {
    const membro = this.membros().find((item) => item.usuarioId === this.sessao.id());
    if (membro) this.remover(membro);
  }
}
