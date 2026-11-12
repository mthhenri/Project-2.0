import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AutorMensagemDiretaEnum } from '@project20/shared';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { autorDaPreviaDoGrupo, coresDosMembros, filtrarGruposPorNome, grupoIdDaConversa, montarItensDaLista } from '../../utils/grupo.util';
import {
    MensagemNaConversa,
    filtrarPessoasPorNome,
    outraPessoaDaConversa,
    previaDaMensagem,
    rotuloDaLista,
    trechosComRealce,
} from '../../utils/mensagem-direta.util';
import { AvatarGrupoComponent } from '../../../../shared/components/avatar-grupo/avatar-grupo.component';
import { AvatarUsuarioComponent } from '../../../../shared/components/avatar-usuario/avatar-usuario.component';
import { MensagemDiretaConfiguracoesBotaoComponent } from '../mensagem-direta-configuracoes-botao/mensagem-direta-configuracoes-botao.component';

const ATRASO_DA_BUSCA_MS = 300;

/** A lista do popup: conversas e grupos juntos, com a busca por pessoa, por grupo e por mensagem (mockups 2, 8 e 10; grupos, task 247). */
@Component({
    selector: 'app-mensagem-direta-lista',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule, TooltipModule, MarkdownVisualizadorComponent, AvatarGrupoComponent, AvatarUsuarioComponent, MensagemDiretaConfiguracoesBotaoComponent],
    templateUrl: './mensagem-direta-lista.component.html',
    styleUrl: './mensagem-direta-lista.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaListaComponent {
    protected readonly estado = inject(MensagemDiretaEstadoService);
    private readonly sessao = inject(UsuarioSessaoService);
    protected readonly meuId = this.sessao.id;

    readonly controleBusca = new FormControl('', { nonNullable: true });
    private readonly textoDigitado = toSignal(this.controleBusca.valueChanges, { initialValue: '' });
    /** O termo já aplicado (depois da pausa na digitação). */
    readonly termo = signal('');
    readonly buscaAtiva = computed(() => this.termo().trim().length > 0);

    readonly pessoasEncontradas = computed(() => filtrarPessoasPorNome(this.estado.pessoas() ?? [], this.termo()));
    readonly gruposEncontrados = computed(() => filtrarGruposPorNome(this.estado.grupoEstado.grupos(), this.termo()));
    /** Conversas e grupos juntos, o que teve mensagem mais recente primeiro. */
    protected readonly itens = computed(() => montarItensDaLista(this.estado.conversas(), this.estado.grupoEstado.grupos()));
    protected readonly coresDosMembros = coresDosMembros;
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

    protected novoGrupo(): void {
        this.estado.novoGrupo();
    }

    protected abrir(usuarioId: number, nome: string): void {
        void this.estado.abrirConversa(usuarioId, nome);
    }

    protected abrirGrupo(grupoId: number): void {
        void this.estado.abrirGrupo(grupoId);
    }

    /** Quem está digitando no grupo agora (o "digitando…" da linha). */
    protected digitandoNoGrupo(conversaId: string): boolean {
        return (this.estado.grupoEstado.digitando().get(conversaId)?.size ?? 0) > 0;
    }

    /** "Ana: " na prévia do grupo (só mensagem de pessoa; a do sistema não tem autor). */
    protected autorDaPrevia(ultima: { autor: AutorMensagemDiretaEnum; autorUsuarioId: number | null }, membros: Parameters<typeof autorDaPreviaDoGrupo>[1]): string | null {
        return autorDaPreviaDoGrupo(ultima, membros, this.sessao.id());
    }

    protected hora(data: Date): string {
        return rotuloDaLista(data, this.agora());
    }

    protected previa(texto: string, contemCodigo: boolean, autorUsuarioId: number | null, autor: AutorMensagemDiretaEnum): string {
        return previaDaMensagem(texto, contemCodigo, autorUsuarioId !== null && autorUsuarioId === this.sessao.id(), autor === AutorMensagemDiretaEnum.IA);
    }

    /** Para onde um achado da busca leva: o grupo (nome e aparência da lista) ou a outra pessoa (pela lista de conversas, depois pela lista de pessoas). */
    protected destinoDoAchado(mensagem: MensagemNaConversa) {
        const grupoId = grupoIdDaConversa(mensagem.conversaId);
        if (grupoId !== null) {
            const grupo = this.estado.grupoEstado.grupoDaLista(grupoId);
            return { grupoId, usuarioId: 0, nome: grupo?.nome ?? 'Grupo', cor: grupo?.corAvatar ?? null, emoji: grupo?.emojiAvatar ?? null, coresDosMembros: grupo ? coresDosMembros(grupo.membros) : [] };
        }
        const pessoa = this.nomeDaOutraPessoa(mensagem);
        return { grupoId: null, usuarioId: pessoa.usuarioId, nome: pessoa.nome, cor: this.estado.corDe(pessoa.usuarioId), emoji: null, coresDosMembros: [] as string[] };
    }

    protected abrirDestino(destino: { grupoId: number | null; usuarioId: number; nome: string }): void {
        if (destino.grupoId !== null) this.abrirGrupo(destino.grupoId);
        else this.abrir(destino.usuarioId, destino.nome);
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
