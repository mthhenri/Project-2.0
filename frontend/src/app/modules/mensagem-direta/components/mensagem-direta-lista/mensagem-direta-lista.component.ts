import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import {
  MensagemNaConversa,
  filtrarPessoasPorNome,
  outraPessoaDaConversa,
  previaDaMensagem,
  rotuloDaLista,
  trechosComRealce,
} from '../../utils/mensagem-direta.util';
import { MensagemDiretaAvatarComponent } from '../mensagem-direta-avatar/mensagem-direta-avatar.component';

const ATRASO_DA_BUSCA_MS = 300;

/** A lista de conversas do popup, com a busca por pessoa e por mensagem (mockups 2, 8 e 10). */
@Component({
  selector: 'app-mensagem-direta-lista',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule, TooltipModule, MensagemDiretaAvatarComponent],
  templateUrl: './mensagem-direta-lista.component.html',
  styleUrl: './mensagem-direta-lista.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaListaComponent {
  protected readonly estado = inject(MensagemDiretaEstadoService);
  private readonly sessao = inject(UsuarioSessaoService);

  readonly controleBusca = new FormControl('', { nonNullable: true });
  private readonly textoDigitado = toSignal(this.controleBusca.valueChanges, { initialValue: '' });
  /** O termo já aplicado (depois da pausa na digitação). */
  readonly termo = signal('');
  readonly buscaAtiva = computed(() => this.termo().trim().length > 0);

  readonly pessoasEncontradas = computed(() => filtrarPessoasPorNome(this.estado.pessoas() ?? [], this.termo()));
  protected readonly agora = signal(new Date());

  constructor() {
    this.controleBusca.valueChanges.pipe(debounceTime(ATRASO_DA_BUSCA_MS), distinctUntilChanged(), takeUntilDestroyed()).subscribe((texto) => {
      this.termo.set(texto);
      this.agora.set(new Date());
      if (texto.trim()) {
        void this.estado.buscar(texto);
        if (this.estado.pessoas() === null) void this.estado.carregarPessoas();
      } else {
        void this.estado.buscar('');
      }
    });
  }

  protected readonly digitando = computed(() => this.textoDigitado().trim().length > 0 && this.textoDigitado() !== this.termo());

  protected limparBusca(): void {
    this.controleBusca.setValue('');
  }

  protected novaConversa(): void {
    this.estado.visao.set('NOVA');
    void this.estado.carregarPessoas();
  }

  protected abrir(usuarioId: number, nome: string): void {
    void this.estado.abrirConversa(usuarioId, nome);
  }

  protected hora(data: Date): string {
    return rotuloDaLista(data, this.agora());
  }

  protected previa(texto: string, contemCodigo: boolean, autorUsuarioId: number | null): string {
    return previaDaMensagem(texto, contemCodigo, autorUsuarioId !== null && autorUsuarioId === this.sessao.id());
  }

  /** O nome da outra pessoa de uma mensagem achada na busca: pela lista de conversas, depois pela lista de pessoas. */
  protected nomeDaOutraPessoa(mensagem: MensagemNaConversa): { usuarioId: number; nome: string } {
    const meuId = this.sessao.id();
    const usuarioId = meuId === undefined ? null : outraPessoaDaConversa(mensagem.conversaId, meuId);
    if (usuarioId === null) return { usuarioId: 0, nome: 'Conversa' };
    const naLista = this.estado.conversas().find((conversa) => conversa.usuarioId === usuarioId)?.usuarioNome;
    const naPessoas = this.estado.pessoas()?.find((pessoa) => pessoa.usuarioId === usuarioId)?.usuarioNome;
    return { usuarioId, nome: naLista ?? naPessoas ?? 'Usuário removido' };
  }

  protected trechos(texto: string) {
    return trechosComRealce(previaDaMensagem(texto, false, false) || texto, this.termo());
  }

  protected souEu(mensagem: MensagemNaConversa): boolean {
    return mensagem.autorUsuarioId === this.sessao.id();
  }
}
