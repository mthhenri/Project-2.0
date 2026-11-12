import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ConversaAVista, ProjectDesktopService } from '../../../../core/services/project-desktop.service';
import { MensagemDiretaPopupComponent } from '../../components/mensagem-direta-popup/mensagem-direta-popup.component';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';

/**
 * A janela de chat do Project Desktop (task 213), aberta pelo atalho global ou pelo clique numa notificação: a rota `/chat-popup`, sem menu nem barra
 * superior, com o mesmo chat do popup do Project preenchendo a janela. Abre numa conversa (`?usuarioId=&nome=`) ou num grupo (`?grupoId=`), do clique na notificação, no código
 * que o usuário copiou antes do atalho (entregue uma vez pelo Desktop) ou na lista. Links de demanda e atividade abrem no Project, nunca nesta janela.
 * No navegador comum a rota também funciona, só que sem o Desktop por trás.
 */
@Component({
    selector: 'app-chat-popup-page',
    standalone: true,
    imports: [MensagemDiretaPopupComponent],
    templateUrl: './chat-popup.page.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './chat-popup.page.scss',
})
export class ChatPopupPage implements OnInit {
    private readonly estado = inject(MensagemDiretaEstadoService);
    private readonly avisos = inject(MensagemDiretaAvisosService);
    private readonly desktop = inject(ProjectDesktopService);
    private readonly rota = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
    // O Desktop só notifica o que o usuário não está lendo aqui.
        effect(() => this.desktop.informarConversa(this.conversaAVista()));
    }

    /** A pessoa ou o grupo que a janela mostra agora (o grupo só com a tela do grupo à vista), ou `null`. */
    private conversaAVista(): ConversaAVista {
        if (!this.estado.aberto()) return null;
        const grupoId = this.estado.visao() === 'GRUPO' ? (this.estado.grupoEstado.grupoAberto()?.grupoId ?? null) : null;
        if (grupoId !== null) return { grupoId };
        return this.estado.conversaAberta()?.usuarioId ?? null;
    }

    ngOnInit(): void {
    // Esta janela é o chat: ela não avisa de mensagem nova (o aviso é do Project ou do Desktop).
        this.avisos.suprimido.set(true);
        this.destroyRef.onDestroy(() => this.avisos.suprimido.set(false));

        const parametros = this.rota.snapshot.queryParamMap;
        const usuarioId = Number(parametros.get('usuarioId'));
        const grupoId = Number(parametros.get('grupoId'));
        const nome = parametros.get('nome');
        this.estado.abrir();
        if (Number.isInteger(grupoId) && grupoId > 0) {
            void this.estado.abrirGrupo(grupoId);
        } else if (Number.isInteger(usuarioId) && usuarioId > 0 && nome) {
            void this.estado.abrirConversa(usuarioId, nome);
        } else {
            void this.desktop.pegarRascunho().then((texto) => this.estado.abrirPeloDesktop(texto));
        }

        const soltarConversa = this.desktop.aoPedirConversa((pedido) => {
            this.estado.rascunhoDoDesktop.set(null);
            if (pedido.grupoId !== undefined) void this.estado.abrirGrupo(pedido.grupoId);
            else void this.estado.abrirConversa(pedido.usuarioId, pedido.usuarioNome);
        });
        document.addEventListener('click', this.enviarLinkAoProject, true);
        this.destroyRef.onDestroy(() => {
            soltarConversa();
            document.removeEventListener('click', this.enviarLinkAoProject, true);
        });
    }

    /** Um link interno (cartão de demanda ou atividade) abre no Project: a navegação da janelinha ficaria sem menu e sem voltar. */
    private readonly enviarLinkAoProject = (evento: MouseEvent): void => {
        const link = (evento.target as Element | null)?.closest?.('a[href]');
        const destino = link?.getAttribute('href') ?? '';
        if (!destino.startsWith('/') || destino.startsWith('//')) return;
        evento.preventDefault();
        evento.stopPropagation();
        this.desktop.abrirNoProject(destino);
    };
}
