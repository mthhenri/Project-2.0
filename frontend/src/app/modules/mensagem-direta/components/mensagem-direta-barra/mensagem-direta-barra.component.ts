import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { ladoDoTooltipDaBarra } from '../../utils/posicao-barra.util';
import { MensagemDiretaAvatarComponent } from '../mensagem-direta-avatar/mensagem-direta-avatar.component';
import { MensagemDiretaNotificacoesComponent } from '../mensagem-direta-notificacoes/mensagem-direta-notificacoes.component';

/** Uma bolinha da barra: a pessoa da conversa, com o que a barra mostra dela (presença e não lidas). */
interface BolinhaDaBarra {
    usuarioId: number;
    nome: string;
    online: boolean;
    naoLidas: number;
    silenciada: boolean;
    ativa: boolean;
}

/**
 * A lista de conversas reduzida a uma coluna de bolinhas, ao lado da conversa aberta: trocar de conversa sem passar pela lista. A mesma ordem da
 * lista; a posição (esquerda, direita, acima, abaixo) é a preferência da conta (task 318) e a engrenagem no fim abre as configurações do chat; a conversa aberta fica marcada (e entra na barra mesmo que ainda não tenha mensagem, que é quando a lista não a traz).
 */
@Component({
    selector: 'app-mensagem-direta-barra',
    standalone: true,
    imports: [TooltipModule, MensagemDiretaAvatarComponent, MensagemDiretaNotificacoesComponent],
    templateUrl: './mensagem-direta-barra.component.html',
    styleUrl: './mensagem-direta-barra.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaBarraComponent {
    protected readonly estado = inject(MensagemDiretaEstadoService);
    private readonly avisos = inject(MensagemDiretaAvisosService);

    protected readonly posicao = computed(() => this.avisos.preferencia().posicaoBarra);
    protected readonly ladoDoTooltip = computed(() => ladoDoTooltipDaBarra(this.posicao()));

    protected readonly bolinhas = computed<BolinhaDaBarra[]>(() => {
        const aberta = this.estado.conversaAberta();
        const online = this.estado.online();
        const bolinhas = this.estado.conversas().map((conversa) => ({
            usuarioId: conversa.usuarioId,
            nome: conversa.usuarioNome,
            online: online.has(conversa.usuarioId),
            naoLidas: conversa.naoLidas,
            silenciada: conversa.silenciada,
            ativa: conversa.usuarioId === aberta?.usuarioId,
        }));
        if (aberta && !bolinhas.some((bolinha) => bolinha.ativa)) {
            bolinhas.unshift({ usuarioId: aberta.usuarioId, nome: aberta.usuarioNome, online: online.has(aberta.usuarioId), naoLidas: 0, silenciada: false, ativa: true });
        }
        return bolinhas;
    });

    protected abrir(bolinha: BolinhaDaBarra): void {
        if (bolinha.ativa) return;
        void this.estado.abrirConversa(bolinha.usuarioId, bolinha.nome);
    }

    protected rotulo(bolinha: BolinhaDaBarra): string {
        if (bolinha.naoLidas === 0) return bolinha.nome;
        return `${bolinha.nome}, ${bolinha.naoLidas} ${bolinha.naoLidas === 1 ? 'não lida' : 'não lidas'}`;
    }
}
