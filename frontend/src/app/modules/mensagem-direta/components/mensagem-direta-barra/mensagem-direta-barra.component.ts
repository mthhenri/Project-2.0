import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TipoGrupoEnum } from '@project20/shared';
import { TooltipModule } from 'primeng/tooltip';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { coresDosMembros, montarItensDaLista } from '../../utils/grupo.util';
import { ladoDoTooltipDaBarra } from '../../utils/posicao-barra.util';
import { AvatarGrupoComponent } from '../../../../shared/components/avatar-grupo/avatar-grupo.component';
import { AvatarUsuarioComponent } from '../../../../shared/components/avatar-usuario/avatar-usuario.component';
import { MensagemDiretaConfiguracoesBotaoComponent } from '../mensagem-direta-configuracoes-botao/mensagem-direta-configuracoes-botao.component';

/** Uma bolinha da barra: a pessoa da conversa ou o grupo, com o que a barra mostra dela (presença e não lidas). */
interface BolinhaDaBarra {
    chave: string;
    /** `null` na bolinha de grupo. */
    usuarioId: number | null;
    /** `null` na bolinha de pessoa. */
    grupoId: number | null;
    nome: string;
    cor: string | null;
    emoji: string | null;
    /** O tipo do grupo (o canal tem ícone); `LIVRE` na bolinha de pessoa, que não o usa. */
    tipoDoGrupo: TipoGrupoEnum;
    coresDosMembros: string[];
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
    imports: [TooltipModule, AvatarGrupoComponent, AvatarUsuarioComponent, MensagemDiretaConfiguracoesBotaoComponent],
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
        const grupoAberto = this.estado.grupoEstado.grupoAberto();
        const online = this.estado.online();
        // A mesma ordem da lista: conversas e grupos juntos, o que teve mensagem mais recente primeiro.
        const bolinhas = montarItensDaLista(this.estado.conversas(), this.estado.grupoEstado.grupos()).map((item): BolinhaDaBarra =>
            item.tipo === 'PESSOA'
                ? {
                    chave: item.chave,
                    usuarioId: item.conversa.usuarioId,
                    grupoId: null,
                    nome: item.conversa.usuarioNome,
                    cor: item.conversa.corAvatar,
                    emoji: null,
                    tipoDoGrupo: TipoGrupoEnum.LIVRE,
                    coresDosMembros: [],
                    online: online.has(item.conversa.usuarioId),
                    naoLidas: item.conversa.naoLidas,
                    silenciada: item.conversa.silenciada,
                    ativa: item.conversa.usuarioId === aberta?.usuarioId,
                }
                : {
                    chave: item.chave,
                    usuarioId: null,
                    grupoId: item.grupo.grupoId,
                    nome: item.grupo.nome,
                    cor: item.grupo.corAvatar,
                    emoji: item.grupo.emojiAvatar,
                    tipoDoGrupo: item.grupo.tipo,
                    coresDosMembros: coresDosMembros(item.grupo.membros),
                    online: false,
                    naoLidas: item.grupo.naoLidas,
                    silenciada: item.grupo.silenciada,
                    ativa: item.grupo.grupoId === grupoAberto?.grupoId,
                },
        );
        if (aberta && !bolinhas.some((bolinha) => bolinha.ativa)) {
            bolinhas.unshift({ chave: aberta.conversaId, usuarioId: aberta.usuarioId, grupoId: null, nome: aberta.usuarioNome, cor: this.estado.corDe(aberta.usuarioId), emoji: null, tipoDoGrupo: TipoGrupoEnum.LIVRE, coresDosMembros: [], online: online.has(aberta.usuarioId), naoLidas: 0, silenciada: false, ativa: true });
        }
        return bolinhas;
    });

    protected abrir(bolinha: BolinhaDaBarra): void {
        if (bolinha.ativa) return;
        if (bolinha.grupoId !== null) void this.estado.abrirGrupo(bolinha.grupoId);
        else if (bolinha.usuarioId !== null) void this.estado.abrirConversa(bolinha.usuarioId, bolinha.nome);
    }

    protected rotulo(bolinha: BolinhaDaBarra): string {
        if (bolinha.naoLidas === 0) return bolinha.nome;
        return `${bolinha.nome}, ${bolinha.naoLidas} ${bolinha.naoLidas === 1 ? 'não lida' : 'não lidas'}`;
    }
}
