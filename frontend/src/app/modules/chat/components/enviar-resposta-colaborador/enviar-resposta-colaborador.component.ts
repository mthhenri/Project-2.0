import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { LIMITE_TEXTO_MENSAGEM_DIRETA, MensagemDiretaRespostaIaEnviarDto } from '@project20/shared';
import { rotuloTipoUsuario } from '../../../../core/utils/tipo-usuario';
import { AvatarGrupoComponent } from '../../../../shared/components/avatar-grupo/avatar-grupo.component';
import { AvatarUsuarioComponent } from '../../../../shared/components/avatar-usuario/avatar-usuario.component';
import { MensagemDiretaService } from '../../../mensagem-direta/services/mensagem-direta.service';
import { MensagemDiretaEstadoService } from '../../../mensagem-direta/services/mensagem-direta-estado.service';
import { coresDosMembros, filtrarGruposPorNome, rotuloDosMembros } from '../../../mensagem-direta/utils/grupo.util';
import { filtrarPessoasPorNome } from '../../../mensagem-direta/utils/mensagem-direta.util';

/** Para quem a resposta vai: uma pessoa ou um grupo/canal (nunca os dois). */
export interface DestinoDaResposta {
    tipo: 'PESSOA' | 'GRUPO';
    id: number;
    nome: string;
}

/** A resposta da IA a enviar: o id e a conversa do Chat IA onde ela está. */
export interface RespostaDaIaParaEnviar {
    id: string;
    conversaId: string;
}

/** Monta o corpo do pedido: o destino é exclusivo e a nota só vai (com o próprio identificador) quando tem texto. */
export function montarEnvioDaRespostaIa(
    mensagem: RespostaDaIaParaEnviar,
    destino: DestinoDaResposta,
    nota: string,
    gerarId: () => string,
): MensagemDiretaRespostaIaEnviarDto {
    const notaAparada = nota.trim();
    return {
        conversaId: mensagem.conversaId,
        chatMensagemId: mensagem.id,
        ...(destino.tipo === 'PESSOA' ? { destinatarioId: destino.id } : { grupoId: destino.id }),
        mensagemId: gerarId(),
        ...(notaAparada ? { nota: notaAparada, notaMensagemId: gerarId() } : {}),
    };
}

/**
 * "Enviar para colaborador" (task 329): escolhe uma pessoa ou um grupo/canal, escreve uma nota opcional e manda a resposta da IA do Chat IA ao chat
 * entre colaboradores. O texto não vai do navegador: o servidor lê a resposta pelo id. Análogo visual: o seletor "Nova conversa" do popup do chat.
 */
@Component({
    selector: 'app-enviar-resposta-colaborador',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, SkeletonModule, TextareaModule, AvatarGrupoComponent, AvatarUsuarioComponent],
    templateUrl: './enviar-resposta-colaborador.component.html',
    styleUrl: './enviar-resposta-colaborador.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnviarRespostaColaboradorComponent {
    readonly mensagem = input.required<RespostaDaIaParaEnviar>();
    readonly visivel = model(false);

    protected readonly estado = inject(MensagemDiretaEstadoService);
    private readonly api = inject(MensagemDiretaService);
    private readonly messageService = inject(MessageService);

    protected readonly controleBusca = new FormControl('', { nonNullable: true });
    protected readonly controleNota = new FormControl('', { nonNullable: true });
    private readonly texto = toSignal(this.controleBusca.valueChanges, { initialValue: '' });
    protected readonly notaDigitada = toSignal(this.controleNota.valueChanges, { initialValue: '' });

    protected readonly limiteDaNota = LIMITE_TEXTO_MENSAGEM_DIRETA;
    protected readonly rotuloTipo = rotuloTipoUsuario;
    protected readonly coresDosMembros = coresDosMembros;
    protected readonly rotuloDosMembros = rotuloDosMembros;
    protected readonly pessoas = computed(() => filtrarPessoasPorNome(this.estado.pessoas() ?? [], this.texto()));
    protected readonly grupos = computed(() => filtrarGruposPorNome(this.estado.grupoEstado.grupos(), this.texto()));

    protected readonly destino = signal<DestinoDaResposta | null>(null);
    protected readonly enviando = signal(false);
    protected readonly erro = signal<string | null>(null);
    protected readonly podeEnviar = computed(() => this.destino() !== null && !this.enviando() && this.notaDigitada().length <= this.limiteDaNota);

    constructor() {
        // Ao abrir: começa limpo e garante a lista de pessoas.
        effect(() => {
            if (!this.visivel()) return;
            untracked(() => {
                this.destino.set(null);
                this.erro.set(null);
                this.controleBusca.setValue('');
                this.controleNota.setValue('');
                if (this.estado.pessoas() === null) void this.estado.carregarPessoas();
            });
        });
    }

    protected escolherPessoa(usuarioId: number, nome: string): void {
        this.destino.set({ tipo: 'PESSOA', id: usuarioId, nome });
    }

    protected escolherGrupo(grupoId: number, nome: string): void {
        this.destino.set({ tipo: 'GRUPO', id: grupoId, nome });
    }

    protected ehDestino(tipo: DestinoDaResposta['tipo'], id: number): boolean {
        const atual = this.destino();
        return atual?.tipo === tipo && atual.id === id;
    }

    protected carregarPessoas(): void {
        void this.estado.carregarPessoas();
    }

    protected enviar(): void {
        const destino = this.destino();
        if (!destino || !this.podeEnviar()) return;
        this.enviando.set(true);
        this.erro.set(null);
        const dto = montarEnvioDaRespostaIa(this.mensagem(), destino, this.controleNota.value, () => crypto.randomUUID());
        this.api.enviarRespostaDaIa(dto).subscribe({
            next: () => {
                this.enviando.set(false);
                this.visivel.set(false);
                this.messageService.add({ severity: 'success', summary: 'Enviado', detail: `Resposta enviada para ${destino.nome}`, life: 3000 });
            },
            error: (erro: { error?: { mensagem?: string } }) => {
                this.enviando.set(false);
                this.erro.set(erro?.error?.mensagem ?? 'Não foi possível enviar a resposta.');
            },
        });
    }
}
