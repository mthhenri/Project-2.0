import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfiguracaoIaCadeiaItemDto, IaModeloListadoDto, IaModelosProvedorListadoDto, NivelIaEnum, TipoProvedorIaEnum, cadeiaDoNivelIa, modeloPertenceAoProvedor } from '@project20/shared';
import { ConfiguracaoIaService } from '../../services/configuracao-ia.service';
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
    VALOR_OUTRO_MODELO,
    ValorFormularioConfiguracaoIa,
    cadeiaSemItemUtilizavel,
    grupoDoItemDaCadeia,
    modeloInicialDoProvedor,
    moverItemDaCadeia,
    novoItemDaCadeia,
    opcoesDoSelectDeModelo,
    resumoDoItem,
    rotuloDoEsforco,
    rotuloDoProvedor,
} from '../../utils/configuracao-ia.util';
import { tomMedioDoProvedor } from '../../../../shared/utils/tons-de-provedor';

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
export class ProvedorAbaComponent implements OnInit {
    private readonly formBuilder = inject(FormBuilder);
    private readonly configuracaoIaService = inject(ConfiguracaoIaService);
    private readonly destroyRef = inject(DestroyRef);

    /** A lista de modelos de cada provedor (spec 309), carregada **uma vez** ao abrir a aba; `null` até chegar e quando a consulta falha. */
    readonly listasDeModelos = signal<Partial<Record<TipoProvedorIaEnum, IaModelosProvedorListadoDto>> | null>(null);
    readonly carregandoModelos = signal(true);
    /** Os itens em que o administrador escolheu "Outro modelo…": o campo vira digitação à mão enquanto a aba está aberta. */
    private readonly itensDigitando = signal<readonly GrupoDoItemDaCadeia[]>([]);

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
    readonly rotuloDoProvedor = rotuloDoProvedor;
    readonly rotuloDoEsforco = rotuloDoEsforco;
    readonly tomMedioDoProvedor = tomMedioDoProvedor;

    ngOnInit(): void {
        this.configuracaoIaService
            .listarModelos()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (resposta) => {
                    // Sem a lista a tela segue com o campo de digitação à mão, como antes da 309: a consulta é só um conforto.
                    this.listasDeModelos.set(Object.fromEntries((resposta.dados ?? []).map((lista) => [lista.provedor, lista])));
                    this.carregandoModelos.set(false);
                },
                error: () => this.carregandoModelos.set(false),
            });
    }

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

    /** Os modelos que o provedor oferece, ou `null` quando não há lista (sem chave, consulta falhou ou ainda não chegou): o campo é de digitação. */
    modelosDoProvedor(provedor: TipoProvedorIaEnum): readonly IaModeloListadoDto[] | null {
        const lista = this.listasDeModelos()?.[provedor];
        return lista?.disponivel ? lista.modelos : null;
    }

    /** O campo do modelo é um select (com busca) quando o provedor tem lista e o administrador não pediu para digitar. */
    usaSelectDeModelo(nivel: NivelDaTela, indice: number): boolean {
        const item = this.cadeiaDe(nivel)[indice];
        const grupo = this.itens(nivel)[indice];
        return !!item && !!grupo && this.modelosDoProvedor(item.provedor) !== null && !this.itensDigitando().includes(grupo);
    }

    /** O item está em digitação por escolha ("Outro modelo…") e o provedor tem lista para onde voltar. */
    podeVoltarALista(nivel: NivelDaTela, indice: number): boolean {
        const item = this.cadeiaDe(nivel)[indice];
        const grupo = this.itens(nivel)[indice];
        return !!item && !!grupo && this.modelosDoProvedor(item.provedor) !== null && this.itensDigitando().includes(grupo);
    }

    /** As opções do select do item: a lista do provedor, o valor salvo se estiver fora dela e "Outro modelo…". */
    opcoesDoModelo(nivel: NivelDaTela, indice: number): IaModeloListadoDto[] {
        const item = this.cadeiaDe(nivel)[indice];
        return opcoesDoSelectDeModelo(this.modelosDoProvedor(item.provedor) ?? [], item.modelo);
    }

    /**
     * "Outro modelo…" não é um modelo: devolve o campo ao valor de antes (o `valor` da aba só muda na próxima detecção de mudanças, então ainda
     * guarda o anterior) e abre a digitação à mão.
     */
    aoEscolherModelo(nivel: NivelDaTela, indice: number, escolhido: string): void {
        if (escolhido !== VALOR_OUTRO_MODELO) return;
        const grupo = this.itens(nivel)[indice];
        grupo.controls.modelo.setValue(this.cadeiaDe(nivel)[indice].modelo);
        this.itensDigitando.update((grupos) => [...grupos, grupo]);
    }

    voltarALista(nivel: NivelDaTela, indice: number): void {
        const grupo = this.itens(nivel)[indice];
        this.itensDigitando.update((grupos) => grupos.filter((candidato) => candidato !== grupo));
    }

    /** Trocou o provedor do item: o modelo do provedor anterior não vale no novo, então entra o primeiro da lista dele (ou a primeira sugestão). */
    aoTrocarProvedor(nivel: NivelDaTela, indice: number, provedor: TipoProvedorIaEnum): void {
        const grupo = this.itens(nivel)[indice];
        if (modeloPertenceAoProvedor(provedor, grupo.controls.modelo.value)) return;
        grupo.controls.modelo.setValue(modeloInicialDoProvedor(provedor, this.modelosDoProvedor(provedor)));
    }

    sugestoesDe(provedor: TipoProvedorIaEnum): readonly string[] {
        return SUGESTOES_MODELOS[provedor];
    }
}
