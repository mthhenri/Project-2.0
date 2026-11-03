import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import {
    DESCRICAO_TIPO_USUARIO,
    LIMITE_AJUDA_TIPO_TEXTO,
    MARCA_AJUDA_NAO_PODE,
    MARCA_AJUDA_PODE,
    TIPOS_USUARIO_NA_ORDEM_DA_AJUDA,
    TipoUsuarioEnum,
} from '@project20/shared';
import { rotuloTipoUsuario, severidadeTipoUsuario } from '../../../../core/utils/tipo-usuario';
import { TipoUsuarioAjudaService } from '../../services/tipo-usuario-ajuda.service';
import { inserirMarcaNaLinha } from '../../utils/ajuda-do-tipo.util';

interface LinhaDoTipo {
    tipo: TipoUsuarioEnum;
    rotulo: string;
    severidade: ReturnType<typeof severidadeTipoUsuario>;
    controle: FormControl<string>;
}

/**
 * Edição dos textos que explicam cada tipo de usuário (task 308, só administrador), no molde de `app-prioridades-cores`: uma linha por tipo, com
 * Salvar e Descartar. O texto é Markdown; as linhas que começam com `✓` ou `✕` ganham o ícone verde ou vermelho na ajuda, e os botões do campo
 * inserem a marca na linha do cursor. "Restaurar padrão" põe de volta, no campo, o texto do `shared` (ainda é preciso salvar).
 */
@Component({
    selector: 'app-usuario-tipos-textos',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, Tag, TextareaModule],
    templateUrl: './usuario-tipos-textos.component.html',
    styleUrl: './usuario-tipos-textos.component.scss',
})
export class UsuarioTiposTextosComponent {
    private readonly ajuda = inject(TipoUsuarioAjudaService);
    private readonly messageService = inject(MessageService);

    readonly marcaPode = MARCA_AJUDA_PODE;
    readonly marcaNaoPode = MARCA_AJUDA_NAO_PODE;
    readonly limite = LIMITE_AJUDA_TIPO_TEXTO;

    readonly salvando = signal<TipoUsuarioEnum | null>(null);
    /** Muda a cada digitação ou gravação: os `mudou`/`ehPadrao` dos botões são funções dos controles, que o Angular não observa sozinho. */
    private readonly versao = signal(0);

    readonly linhas: LinhaDoTipo[] = TIPOS_USUARIO_NA_ORDEM_DA_AJUDA.map((tipo) => {
        const controle = new FormControl(this.ajuda.textos()[tipo], {
            nonNullable: true,
            validators: [Validators.required, Validators.maxLength(LIMITE_AJUDA_TIPO_TEXTO), (campo) => (campo.value.trim() ? null : { required: true })],
        });
        controle.valueChanges.subscribe(() => this.versao.update((valor) => valor + 1));
        return { tipo, rotulo: rotuloTipoUsuario(tipo), severidade: severidadeTipoUsuario(tipo), controle };
    });

    readonly algoSalvando = computed(() => this.salvando() !== null);

    mudou(linha: LinhaDoTipo): boolean {
        this.versao();
        return linha.controle.value !== this.ajuda.textos()[linha.tipo];
    }

    ehPadrao(linha: LinhaDoTipo): boolean {
        this.versao();
        return linha.controle.value === DESCRICAO_TIPO_USUARIO[linha.tipo];
    }

    descartar(linha: LinhaDoTipo): void {
        linha.controle.setValue(this.ajuda.textos()[linha.tipo]);
    }

    restaurarPadrao(linha: LinhaDoTipo): void {
        linha.controle.setValue(DESCRICAO_TIPO_USUARIO[linha.tipo]);
        linha.controle.markAsDirty();
    }

    /** Põe `✓` ou `✕` no começo da linha do cursor e devolve o foco ao campo. */
    inserirMarca(linha: LinhaDoTipo, marca: string, campo: HTMLTextAreaElement): void {
        const cursor = campo.selectionStart ?? linha.controle.value.length;
        const resultado = inserirMarcaNaLinha(linha.controle.value, cursor, marca);
        linha.controle.setValue(resultado.texto);
        queueMicrotask(() => {
            campo.focus();
            campo.setSelectionRange(resultado.cursor, resultado.cursor);
        });
    }

    salvar(linha: LinhaDoTipo): void {
        if (linha.controle.invalid || !this.mudou(linha) || this.salvando()) return;
        this.salvando.set(linha.tipo);
        this.ajuda.alterar(linha.tipo, { texto: linha.controle.value }).subscribe({
            next: (resposta) => {
                this.salvando.set(null);
                if (resposta.dados) linha.controle.setValue(resposta.dados.texto);
                this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: `Texto de "${linha.rotulo}" alterado` });
            },
            error: () => this.salvando.set(null),
        });
    }
}
