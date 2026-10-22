import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { MensagemDiretaReferenciaRecuperadaDto, ReferenciaMensagemDiretaEnum } from '@project20/shared';
import { MensagemDiretaReferenciaService } from '../../services/mensagem-direta-referencia.service';
import { ROTULO_DO_TIPO_DE_REFERENCIA, destinoDaReferencia, rotuloDaSituacao } from '../../utils/compositor.util';

type EstadoDoCartao = 'carregando' | 'pronto' | 'erro';

/**
 * O cartão de uma demanda ou atividade citada numa mensagem (task 211). É resolvido **para quem está olhando**: quem não tem acesso vê o cartão
 * bloqueado e nenhum título (o servidor nem o devolve). O clique leva à atividade ou ao projeto da demanda.
 */
@Component({
  selector: 'app-mensagem-direta-referencia-cartao',
  standalone: true,
  imports: [RouterLink, SkeletonModule],
  templateUrl: './mensagem-direta-referencia-cartao.component.html',
  styleUrl: './mensagem-direta-referencia-cartao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaReferenciaCartaoComponent {
  private readonly servico = inject(MensagemDiretaReferenciaService);

  readonly tipo = input.required<ReferenciaMensagemDiretaEnum>();
  readonly id = input.required<number>();

  protected readonly estado = signal<EstadoDoCartao>('carregando');
  protected readonly dados = signal<MensagemDiretaReferenciaRecuperadaDto | null>(null);

  protected readonly rotuloDoTipo = computed(() => ROTULO_DO_TIPO_DE_REFERENCIA[this.tipo()]);
  protected readonly icone = computed(() => (this.tipo() === ReferenciaMensagemDiretaEnum.DEMANDA ? 'pi-sitemap' : 'pi-check-square'));
  protected readonly detalhe = computed(() => {
    const dados = this.dados();
    if (!dados?.acessivel) return '';
    const situacao = rotuloDaSituacao(dados.situacao);
    return dados.tipo === ReferenciaMensagemDiretaEnum.ATIVIDADE && dados.demandaNome
      ? `${this.rotuloDoTipo()} · ${dados.demandaNome} · ${situacao}`
      : `${this.rotuloDoTipo()} · ${situacao}`;
  });
  protected readonly destino = computed(() => {
    const dados = this.dados();
    return dados?.acessivel ? destinoDaReferencia(dados.tipo, dados.id, dados.projetoId) : null;
  });

  constructor() {
    effect(() => {
      const tipo = this.tipo();
      const id = this.id();
      void this.carregar(tipo, id);
    });
  }

  protected async carregar(tipo = this.tipo(), id = this.id()): Promise<void> {
    this.estado.set('carregando');
    const dados = await this.servico.recuperar(tipo, id);
    // O cartão pode ter sido reaproveitado para outra referência enquanto a resposta vinha.
    if (tipo !== this.tipo() || id !== this.id()) return;
    this.dados.set(dados);
    this.estado.set(dados ? 'pronto' : 'erro');
  }
}
