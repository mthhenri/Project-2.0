import { Component, computed, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfiguracaoIaCadeiaItemDto, NivelIaEnum, TipoProvedorIaEnum, cadeiaDoNivelIa } from '@project20/shared';
import {
    AVISO_SEM_CHAVE,
    FormularioConfiguracaoIa,
    GrupoDoItemDaCadeia,
    MAXIMO_DE_ITENS_DA_CADEIA,
    NIVEIS_DA_TELA,
    NivelDaTela,
    OPCOES_ESFORCO,
    OPCOES_PROVEDOR,
    SUGESTOES_MODELOS,
    ValorFormularioConfiguracaoIa,
    cadeiaSemItemUtilizavel,
    grupoDoItemDaCadeia,
    moverItemDaCadeia,
    novoItemDaCadeia,
    resumoDoItem,
} from '../../utils/configuracao-ia.util';

/**
 * Aba "Provedor e modelos" das Configurações da IA (spec 261): **uma cadeia por nível** (rápido, padrão e analítico), cada uma uma lista
 * ordenada de itens provedor, modelo e esforço. O primeiro item é o principal do nível e os seguintes são a contingência, tentados em ordem
 * quando o anterior falha. O item cujo provedor não tem chave de API no ambiente mostra o aviso, mas não impede salvar. Quem tem o
 * formulário é a página; esta aba só o edita. Análogo visual: as seções com borda da tela de Configurações da IA.
 */
@Component({
    selector: 'app-provedor-aba',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, TagModule, TooltipModule],
    templateUrl: './provedor-aba.component.html',
    styleUrl: './provedor-aba.component.scss',
})
export class ProvedorAbaComponent {
    private readonly formBuilder = inject(FormBuilder);

    readonly formulario = input.required<FormularioConfiguracaoIa>();
    readonly valor = input.required<ValorFormularioConfiguracaoIa>();
    /** Provedores com chave de API no ambiente; `null` quando o estado não pôde ser lido (o item não afirma nada). */
    readonly provedoresComChave = input<TipoProvedorIaEnum[] | null>(null);
    /** Erros de cada cadeia, já filtrados pela página (só aparecem depois de uma tentativa de salvar): marcam o nível com problema. */
    readonly errosPorNivel = input<Partial<Record<NivelIaEnum, string[]>>>({});

    readonly niveis = NIVEIS_DA_TELA;
    readonly opcoesEsforco = OPCOES_ESFORCO;
    readonly opcoesProvedor = OPCOES_PROVEDOR;
    readonly avisoSemChave = AVISO_SEM_CHAVE;
    readonly maximoDeItens = MAXIMO_DE_ITENS_DA_CADEIA;
    readonly resumoDoItem = resumoDoItem;

    /** O item principal de cada nível, como está agora no formulário: o trio que a IA vai usar. */
    readonly principais = computed(() =>
        this.niveis.map((nivel) => ({ nivel, item: cadeiaDoNivelIa(this.valor(), nivel.nivel)[0] as ConfiguracaoIaCadeiaItemDto | undefined })),
    );

    /** Os itens do nível: os grupos do formulário (a lista nunca fica vazia). */
    itens(nivel: NivelDaTela): GrupoDoItemDaCadeia[] {
        return this.formulario().controls[nivel.campo].controls;
    }

    /** O item como está no valor do formulário (os grupos refletem o mesmo valor, em outro formato). */
    cadeiaDe(nivel: NivelDaTela): ConfiguracaoIaCadeiaItemDto[] {
        return this.valor()[nivel.campo];
    }

    papelDoItem(indice: number): string {
        return indice === 0 ? 'Principal' : `Contingência ${indice}`;
    }

    /** As opções de provedor de um item: os já usados em outro item da mesma cadeia ficam desabilitados. */
    opcoesDoProvedor(nivel: NivelDaTela, indice: number) {
        const cadeia = this.cadeiaDe(nivel);
        return OPCOES_PROVEDOR.map((opcao) => ({ ...opcao, desabilitada: cadeia.some((item, posicao) => item.provedor === opcao.valor && posicao !== indice) }));
    }

    /** `true` quando o provedor do item não tem chave no ambiente; `false` se tem ou se não se sabe. */
    semChave(provedor: TipoProvedorIaEnum): boolean {
        const comChave = this.provedoresComChave();
        return comChave !== null && !comChave.includes(provedor);
    }

    /** Nenhum item do nível tem chave: as funcionalidades daquele nível falham até alguém configurar uma. */
    nivelSemItemUtilizavel(nivel: NivelDaTela): boolean {
        return cadeiaSemItemUtilizavel(this.cadeiaDe(nivel), this.provedoresComChave());
    }

    temErro(nivel: NivelDaTela): boolean {
        return !!this.errosPorNivel()[nivel.nivel];
    }

    podeAdicionar(nivel: NivelDaTela): boolean {
        return this.cadeiaDe(nivel).length < this.maximoDeItens;
    }

    adicionar(nivel: NivelDaTela): void {
        const item = novoItemDaCadeia(this.cadeiaDe(nivel));
        if (!item) return;
        const lista = this.formulario().controls[nivel.campo];
        lista.push(grupoDoItemDaCadeia(this.formBuilder, item));
        lista.markAsDirty();
    }

    /** Tira o item da cadeia; o último nunca sai (a cadeia tem ao menos um item). */
    remover(nivel: NivelDaTela, indice: number): void {
        const lista = this.formulario().controls[nivel.campo];
        if (lista.length <= 1) return;
        lista.removeAt(indice);
        lista.markAsDirty();
    }

    /** Troca o item de lugar com o vizinho (`-1` sobe, `1` desce) mudando só os valores: os campos não são recriados. */
    mover(nivel: NivelDaTela, indice: number, deslocamento: -1 | 1): void {
        const lista = this.formulario().controls[nivel.campo];
        const nova = moverItemDaCadeia(this.cadeiaDe(nivel), indice, deslocamento);
        lista.setValue(nova);
        lista.markAsDirty();
    }

    sugestoesDe(provedor: TipoProvedorIaEnum): readonly string[] {
        return SUGESTOES_MODELOS[provedor];
    }
}
