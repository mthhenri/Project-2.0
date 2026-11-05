import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import {
    ConfiguracaoIaCadeiaItemDto,
    ConfiguracaoIaCriarDto,
    ConfiguracaoIaResumoDto,
    EsforcoIaEnum,
    EstadoIaEnum,
    IaModeloListadoDto,
    ModoContextoChatEnum,
    NivelIaEnum,
    PropostaIaNivelEnum,
    TipoProvedorIaEnum,
    cadeiaDoNivelIa,
    normalizarNiveisDaProposta,
    validarCadeiaDoNivelIa,
    validarCadeiasDaConfiguracaoIa,
} from '@project20/shared';

export interface OpcaoDoSelect<T> {
    valor: T;
    rotulo: string;
    desabilitada?: boolean;
}

/** Os três provedores têm implementação (task 203); a chave de cada um vem do `.env` do backend. */
export const OPCOES_PROVEDOR: OpcaoDoSelect<TipoProvedorIaEnum>[] = [
    { valor: TipoProvedorIaEnum.ANTHROPIC, rotulo: 'Anthropic' },
    { valor: TipoProvedorIaEnum.GOOGLE, rotulo: 'Google (Gemini)' },
    { valor: TipoProvedorIaEnum.OPENAI, rotulo: 'OpenAI' },
];

export const OPCOES_ESFORCO: OpcaoDoSelect<EsforcoIaEnum>[] = [
    { valor: EsforcoIaEnum.BAIXO, rotulo: 'Baixo' },
    { valor: EsforcoIaEnum.MEDIO, rotulo: 'Médio' },
    { valor: EsforcoIaEnum.ALTO, rotulo: 'Alto' },
];

export const OPCOES_MODO_CONTEXTO: OpcaoDoSelect<ModoContextoChatEnum>[] = [
    { valor: ModoContextoChatEnum.MISTURADO, rotulo: 'Misturado' },
    { valor: ModoContextoChatEnum.SEPARADO, rotulo: 'Separado' },
];

/** O que cada modo faz, mostrado abaixo da escolha. */
export const EXPLICACAO_MODO_CONTEXTO: Record<ModoContextoChatEnum, string> = {
    [ModoContextoChatEnum.MISTURADO]: 'A IA lê a conversa inteira, de código e de Project, e pode relacionar uma com a outra.',
    [ModoContextoChatEnum.SEPARADO]: 'Dúvidas de código e assuntos do Project não se enxergam: cada pergunta só vê as mensagens do próprio assunto.',
};

export const rotuloDoModoContexto = (modo: ModoContextoChatEnum): string =>
    OPCOES_MODO_CONTEXTO.find((opcao) => opcao.valor === modo)?.rotulo ?? modo;

/** Sugestões dos campos de modelo de cada provedor (o campo é texto livre: os nomes mudam com frequência). */
export const SUGESTOES_MODELOS: Record<TipoProvedorIaEnum, readonly string[]> = {
    [TipoProvedorIaEnum.ANTHROPIC]: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1'],
    [TipoProvedorIaEnum.GOOGLE]: ['gemini-2.5-flash', 'gemini-2.5-pro'],
    [TipoProvedorIaEnum.OPENAI]: ['gpt-5-mini', 'gpt-5', 'gpt-6.1-sol', 'o3'],
};

export const ROTULO_ESTADO_IA: Record<EstadoIaEnum, string> = {
    [EstadoIaEnum.NO_AR]: 'No ar',
    [EstadoIaEnum.FORA_DO_AR]: 'Fora do ar',
    [EstadoIaEnum.DESLIGADA]: 'Desligada',
};

export const SEVERIDADE_ESTADO_IA: Record<EstadoIaEnum, 'success' | 'danger' | 'secondary'> = {
    [EstadoIaEnum.NO_AR]: 'success',
    [EstadoIaEnum.FORA_DO_AR]: 'danger',
    [EstadoIaEnum.DESLIGADA]: 'secondary',
};

export const rotuloDoEsforco = (esforco: EsforcoIaEnum): string =>
    OPCOES_ESFORCO.find((opcao) => opcao.valor === esforco)?.rotulo ?? esforco;

export const rotuloDoProvedor = (provedor: TipoProvedorIaEnum): string =>
    OPCOES_PROVEDOR.find((opcao) => opcao.valor === provedor)?.rotulo ?? provedor;

/** O valor da última opção do select de modelos ("Outro modelo…"): nunca é gravado, só abre o campo de digitação. */
export const VALOR_OUTRO_MODELO = '__outro_modelo__';
export const ROTULO_OUTRO_MODELO = 'Outro modelo…';

/**
 * As opções do select do modelo de um item: os modelos que o provedor oferece, o valor já salvo se ele não estiver na lista (um modelo retirado,
 * filtrado ou digitado à mão continua visível, sem apagar nem marcar erro) e, no fim, "Outro modelo…".
 */
export function opcoesDoSelectDeModelo(lista: readonly IaModeloListadoDto[], valorSalvo: string): IaModeloListadoDto[] {
    const salvo = valorSalvo.trim();
    const alemDaLista = salvo !== '' && !lista.some((modelo) => modelo.id === salvo) ? [{ id: valorSalvo, nome: valorSalvo }] : [];
    return [...alemDaLista, ...lista, { id: VALOR_OUTRO_MODELO, nome: ROTULO_OUTRO_MODELO }];
}

/** O primeiro modelo para um provedor que acabou de entrar no item: o da lista (mais novo) ou, sem lista, a primeira sugestão fixa. */
export function modeloInicialDoProvedor(provedor: TipoProvedorIaEnum, lista: readonly IaModeloListadoDto[] | null): string {
    return lista?.[0]?.id ?? SUGESTOES_MODELOS[provedor][0] ?? '';
}

/** O aviso do item cujo provedor não tem chave de API no ambiente. Não impede salvar: em execução o item é pulado. */
export const AVISO_SEM_CHAVE = 'Chave de Provedor não configurada';

/** O campo do formulário (e do DTO) que guarda a cadeia de cada nível. */
export type CampoDaCadeia = 'cadeiaRapido' | 'cadeiaPadrao' | 'cadeiaAnalitico';

export interface NivelDaTela {
    nivel: NivelIaEnum;
    campo: CampoDaCadeia;
    titulo: string;
    /** Para que serve o nível, mostrado sob o título. */
    uso: string;
}

/** Os três níveis, na ordem em que a tela os mostra. */
export const NIVEIS_DA_TELA: readonly NivelDaTela[] = [
    { nivel: NivelIaEnum.RAPIDO, campo: 'cadeiaRapido', titulo: 'Rápido', uso: 'Conversa, listar, iniciar e pausar.' },
    { nivel: NivelIaEnum.PADRAO, campo: 'cadeiaPadrao', titulo: 'Padrão', uso: 'Descrições, rigor, pad e prioridade.' },
    { nivel: NivelIaEnum.ANALITICO, campo: 'cadeiaAnalitico', titulo: 'Analítico', uso: 'Analisar demanda, quebrar em atividades, sugerir conexões.' },
];

/** Valor do formulário (campos numéricos podem estar vazios enquanto se digita). */
export interface ValorFormularioConfiguracaoIa {
    cadeiaRapido: ConfiguracaoIaCadeiaItemDto[];
    cadeiaPadrao: ConfiguracaoIaCadeiaItemDto[];
    cadeiaAnalitico: ConfiguracaoIaCadeiaItemDto[];
    checkinMinimoMinutos: number | null;
    checkinMaximoMinutos: number | null;
    duracaoRecomendadaMinutos: number | null;
    checkinInteligente: boolean;
    rigorProporcional: boolean;
    deteccaoAutomatica: boolean;
    duvidasCodigo: boolean;
    modoContextoChat: ModoContextoChatEnum;
    iaDesligada: boolean;
    /** O nível de autonomia da IA por regra de proposta (task 228), sempre completo. */
    niveisProposta: Record<string, PropostaIaNivelEnum>;
}

/** A cadeia sem espaço nas pontas dos nomes de modelo (é assim que a service a grava). */
function aparar(cadeia: ConfiguracaoIaCadeiaItemDto[]): ConfiguracaoIaCadeiaItemDto[] {
    return cadeia.map((item) => ({ provedor: item.provedor, modelo: item.modelo.trim(), esforco: item.esforco }));
}

/** Os erros de cada cadeia, pela mesma regra do `shared` (a da service), para marcar o nível com problema. Só entram níveis com erro. */
export function errosPorNivel(valor: ValorFormularioConfiguracaoIa): Partial<Record<NivelIaEnum, string[]>> {
    const porNivel: Partial<Record<NivelIaEnum, string[]>> = {};
    for (const { nivel } of NIVEIS_DA_TELA) {
        const erros = validarCadeiaDoNivelIa(nivel, aparar(cadeiaDoNivelIa(valor, nivel)));
        if (erros.length > 0) porNivel[nivel] = erros;
    }
    return porNivel;
}

/** Os erros de cadeia da regra do `shared` (a mesma da service), para mostrar antes de salvar. */
export function errosDeCadeias(valor: ValorFormularioConfiguracaoIa): string[] {
    return validarCadeiasDaConfiguracaoIa({
        cadeiaRapido: aparar(valor.cadeiaRapido),
        cadeiaPadrao: aparar(valor.cadeiaPadrao),
        cadeiaAnalitico: aparar(valor.cadeiaAnalitico),
    });
}

/** O mínimo do check-in precisa ser menor que o máximo (mesma regra da service). */
export function intervaloDoCheckinValido(controle: AbstractControl): ValidationErrors | null {
    const minimo = controle.get('checkinMinimoMinutos')?.value as number | null;
    const maximo = controle.get('checkinMaximoMinutos')?.value as number | null;
    if (minimo === null || maximo === null || minimo === undefined || maximo === undefined) return null;
    return minimo < maximo ? null : { intervaloInvalido: true };
}

export function valoresDaVersao(versao: ConfiguracaoIaResumoDto): ValorFormularioConfiguracaoIa {
    return {
        cadeiaRapido: versao.cadeiaRapido.map((item) => ({ ...item })),
        cadeiaPadrao: versao.cadeiaPadrao.map((item) => ({ ...item })),
        cadeiaAnalitico: versao.cadeiaAnalitico.map((item) => ({ ...item })),
        checkinMinimoMinutos: versao.checkinMinimoMinutos,
        checkinMaximoMinutos: versao.checkinMaximoMinutos,
        duracaoRecomendadaMinutos: versao.duracaoRecomendadaMinutos,
        checkinInteligente: versao.checkinInteligente,
        rigorProporcional: versao.rigorProporcional,
        deteccaoAutomatica: versao.deteccaoAutomatica,
        duvidasCodigo: versao.duvidasCodigo,
        modoContextoChat: versao.modoContextoChat,
        iaDesligada: versao.iaDesligada,
        niveisProposta: normalizarNiveisDaProposta(versao.niveisProposta),
    };
}

/** O formulário já é igual à versão (nada a salvar): compara o que seria gravado, que tem ordem de chaves estável. */
export function formularioIgualAVersao(valor: ValorFormularioConfiguracaoIa, versao: ConfiguracaoIaResumoDto): boolean {
    return JSON.stringify(paraDtoDeCriacao(valor)) === JSON.stringify(paraDtoDeCriacao(valoresDaVersao(versao)));
}

export function paraDtoDeCriacao(valor: ValorFormularioConfiguracaoIa): ConfiguracaoIaCriarDto {
    return {
        cadeiaRapido: aparar(valor.cadeiaRapido),
        cadeiaPadrao: aparar(valor.cadeiaPadrao),
        cadeiaAnalitico: aparar(valor.cadeiaAnalitico),
        checkinMinimoMinutos: valor.checkinMinimoMinutos as number,
        checkinMaximoMinutos: valor.checkinMaximoMinutos as number,
        duracaoRecomendadaMinutos: valor.duracaoRecomendadaMinutos as number,
        checkinInteligente: valor.checkinInteligente,
        rigorProporcional: valor.rigorProporcional,
        deteccaoAutomatica: valor.deteccaoAutomatica,
        duvidasCodigo: valor.duvidasCodigo,
        modoContextoChat: valor.modoContextoChat,
        iaDesligada: valor.iaDesligada,
        niveisProposta: normalizarNiveisDaProposta(valor.niveisProposta),
    };
}

/** Quantos itens cabem numa cadeia: um por provedor, porque o mesmo provedor não repete na mesma cadeia. */
export const MAXIMO_DE_ITENS_DA_CADEIA = Object.values(TipoProvedorIaEnum).length;

/** O primeiro provedor ainda fora da cadeia (na ordem da tela), ou `null` quando todos já estão nela. */
export function proximoProvedorLivre(cadeia: readonly ConfiguracaoIaCadeiaItemDto[]): TipoProvedorIaEnum | null {
    return OPCOES_PROVEDOR.map((opcao) => opcao.valor).find((provedor) => !cadeia.some((item) => item.provedor === provedor)) ?? null;
}

/** O item novo de uma cadeia: o próximo provedor livre, com o primeiro modelo sugerido dele e esforço médio. `null` se a cadeia já está cheia. */
export function novoItemDaCadeia(cadeia: readonly ConfiguracaoIaCadeiaItemDto[]): ConfiguracaoIaCadeiaItemDto | null {
    const provedor = proximoProvedorLivre(cadeia);
    return provedor === null ? null : { provedor, modelo: SUGESTOES_MODELOS[provedor][0] ?? '', esforco: EsforcoIaEnum.MEDIO };
}

/** A cadeia com o item da posição trocado de lugar com o vizinho (`-1` sobe, `1` desce); fora do limite, a cadeia como veio. */
export function moverItemDaCadeia(cadeia: readonly ConfiguracaoIaCadeiaItemDto[], indice: number, deslocamento: -1 | 1): ConfiguracaoIaCadeiaItemDto[] {
    const destino = indice + deslocamento;
    if (indice < 0 || indice >= cadeia.length || destino < 0 || destino >= cadeia.length) return [...cadeia];
    const nova = [...cadeia];
    [nova[indice], nova[destino]] = [nova[destino], nova[indice]];
    return nova;
}

/** Nenhum item da cadeia tem provedor com chave no ambiente. `false` quando não se sabe quais têm chave (`comChave` nulo). */
export function cadeiaSemItemUtilizavel(cadeia: readonly ConfiguracaoIaCadeiaItemDto[], comChave: readonly TipoProvedorIaEnum[] | null): boolean {
    return comChave !== null && !cadeia.some((item) => comChave.includes(item.provedor));
}

/** O item como uma linha de texto ("Anthropic · claude-haiku-5-5 · Médio"), para o resumo e o histórico. */
export const resumoDoItem = (item: ConfiguracaoIaCadeiaItemDto): string => `${rotuloDoProvedor(item.provedor)} · ${item.modelo} · ${rotuloDoEsforco(item.esforco)}`;

/** O grupo de um item da cadeia no formulário: provedor, modelo (texto livre de até 100 caracteres) e esforço. */
export function grupoDoItemDaCadeia(formBuilder: FormBuilder, item: ConfiguracaoIaCadeiaItemDto) {
    return formBuilder.nonNullable.group({
        provedor: [item.provedor, Validators.required],
        modelo: [item.modelo, Validators.maxLength(100)],
        esforco: [item.esforco, Validators.required],
    });
}

export type GrupoDoItemDaCadeia = ReturnType<typeof grupoDoItemDaCadeia>;

const ITEM_INICIAL = (provedor: TipoProvedorIaEnum, modelo: string): ConfiguracaoIaCadeiaItemDto => ({ provedor, modelo, esforco: EsforcoIaEnum.MEDIO });

/** O formulário da configuração da IA (compartilhado pela página e pelas abas dela). Uma lista de itens por nível, sempre com ao menos um. */
export function criarFormularioConfiguracaoIa(formBuilder: FormBuilder) {
    return formBuilder.nonNullable.group(
        {
            cadeiaRapido: formBuilder.nonNullable.array([grupoDoItemDaCadeia(formBuilder, ITEM_INICIAL(TipoProvedorIaEnum.ANTHROPIC, 'claude-haiku-5-5'))]),
            cadeiaPadrao: formBuilder.nonNullable.array([grupoDoItemDaCadeia(formBuilder, ITEM_INICIAL(TipoProvedorIaEnum.ANTHROPIC, 'claude-sonnet-5-5'))]),
            cadeiaAnalitico: formBuilder.nonNullable.array([grupoDoItemDaCadeia(formBuilder, ITEM_INICIAL(TipoProvedorIaEnum.ANTHROPIC, 'claude-opus-5-5'))]),
            checkinMinimoMinutos: [null as number | null, [Validators.required, Validators.min(1)]],
            checkinMaximoMinutos: [null as number | null, [Validators.required, Validators.min(1)]],
            duracaoRecomendadaMinutos: [null as number | null, [Validators.required, Validators.min(1)]],
            checkinInteligente: [true],
            rigorProporcional: [true],
            deteccaoAutomatica: [true],
            duvidasCodigo: [false],
            modoContextoChat: [ModoContextoChatEnum.MISTURADO, Validators.required],
            iaDesligada: [true],
            niveisProposta: formBuilder.nonNullable.group(
                Object.fromEntries(
                    Object.entries(normalizarNiveisDaProposta(null)).map(([chave, nivel]) => [chave, formBuilder.nonNullable.control(nivel)]),
                ),
            ),
        },
        { validators: intervaloDoCheckinValido },
    );
}

export type FormularioConfiguracaoIa = ReturnType<typeof criarFormularioConfiguracaoIa>;

/**
 * Preenche o formulário com os valores de uma versão. O `reset` do Angular não muda o tamanho de uma lista, então cada cadeia é refeita com
 * os itens da versão antes de o resto ser preenchido.
 */
export function preencherFormulario(formulario: FormularioConfiguracaoIa, formBuilder: FormBuilder, valores: ValorFormularioConfiguracaoIa): void {
    for (const { campo } of NIVEIS_DA_TELA) {
        const lista = formulario.controls[campo];
        lista.clear({ emitEvent: false });
        for (const item of valores[campo]) lista.push(grupoDoItemDaCadeia(formBuilder, item), { emitEvent: false });
    }
    formulario.reset(valores);
}
