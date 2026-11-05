import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect } from 'vitest';
import {
    ConfiguracaoIaCadeiaItemDto,
    ConfiguracaoIaResumoDto,
    EsforcoIaEnum,
    EstadoIaEnum,
    IaModelosProvedorListadoDto,
    ModoContextoChatEnum,
    NIVEIS_PADRAO_DA_PROPOSTA,
    PropostaIaNivelEnum,
    TipoProvedorIaEnum,
    TipoPropostaIaEnum,
    TipoUsuarioEnum,
} from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { PromptsAbaComponent } from '../../components/prompts-aba/prompts-aba.component';
import { ProvedorAbaComponent } from '../../components/provedor-aba/provedor-aba.component';
import { configuracaoIaRotas } from '../../configuracao-ia.routes';
import { ConfiguracaoIaPage } from './configuracao-ia.page';

// Task 132: tela exclusiva de administrador. Cada gravação cria uma versão nova (a antiga nunca muda); o histórico mostra as
// versões e "Usar como base" só preenche o formulário. O acesso é da rota (administradorGuard).

type Montado = ComponenteMontado<ConfiguracaoIaPage>;

const A = TipoProvedorIaEnum.ANTHROPIC;
const G = TipoProvedorIaEnum.GOOGLE;
const O = TipoProvedorIaEnum.OPENAI;

const item = (provedor: TipoProvedorIaEnum, modelo: string, esforco: EsforcoIaEnum = EsforcoIaEnum.MEDIO): ConfiguracaoIaCadeiaItemDto => ({ provedor, modelo, esforco });

function versao(numero: number, sobrescrita: Partial<ConfiguracaoIaResumoDto> = {}): ConfiguracaoIaResumoDto {
    return {
        id: numero, versao: numero,
        cadeiaRapido: [item(A, 'claude-haiku-5-5')], cadeiaPadrao: [item(A, 'claude-sonnet-5-5')], cadeiaAnalitico: [item(A, 'claude-opus-5-5')],
        checkinMinimoMinutos: 20, checkinMaximoMinutos: 40, duracaoRecomendadaMinutos: 90,
        checkinInteligente: true, rigorProporcional: true, deteccaoAutomatica: true,
        duvidasCodigo: false, modoContextoChat: ModoContextoChatEnum.MISTURADO, iaDesligada: false, niveisProposta: {},
        usuarioId: 1, usuarioNome: 'Ana Admin', createdDate: new Date('2026-10-01T12:00:00Z'),
        ...sobrescrita,
    };
}

const ATIVA = versao(3);
const HISTORICO = [versao(3), versao(2, { cadeiaRapido: [item(A, 'claude-haiku-4')], iaDesligada: true, checkinMaximoMinutos: 50 }), versao(1)];

function responderCarga(
    montado: Montado,
    opcoes: { ativa?: ConfiguracaoIaResumoDto; historico?: ConfiguracaoIaResumoDto[]; estado?: EstadoIaEnum | 'ERRO'; provedoresComChave?: TipoProvedorIaEnum[] } = {},
): void {
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/configuracao-ia'), opcoes.ativa ?? ATIVA);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/configuracao-ia/versoes'), { itens: opcoes.historico ?? HISTORICO });
    const estado = esperarRequisicao(montado.http, 'GET', '/ia/estado');
    if (opcoes.estado === 'ERRO') responderErro(estado, 500, 'Falhou');
    else responderSucesso(estado, { estado: opcoes.estado ?? EstadoIaEnum.NO_AR, provedoresComChave: opcoes.provedoresComChave ?? [TipoProvedorIaEnum.ANTHROPIC] });
}

async function abrir(opcoes: Parameters<typeof responderCarga>[1] = {}): Promise<Montado> {
    const montado = await montarComponente(ConfiguracaoIaPage, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
    responderCarga(montado, opcoes);
    await montado.atualizar();
    return montado;
}

const textoDaTela = () => document.body.textContent ?? '';
const botaoPorRotulo = (rotulo: string) => document.body.querySelector(`button[aria-label="${rotulo}"]`) as HTMLButtonElement;
/** O campo de modelo do item da cadeia de um nível (`RAPIDO`, `PADRAO`, `ANALITICO`). */
const campoDoModelo = (nivel: string, indice = 0) => document.body.querySelector(`#ia-modelo-${nivel}-${indice}`) as HTMLInputElement | null;
const abaDeProvedor = (montado: Montado) => montado.fixture.debugElement.query(By.directive(ProvedorAbaComponent)).componentInstance as ProvedorAbaComponent;
const botao = (rotulo: string) =>
    Array.from(document.body.querySelectorAll('button')).find((candidato) => candidato.textContent?.includes(rotulo)) as HTMLButtonElement;
const avisosDe = (montado: Montado) => {
    const avisos: { severity?: string; summary?: string; detail?: string }[] = [];
    montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(...[mensagem].flat()));
    return avisos;
};

describe('ConfiguracaoIaPage — carregar', () => {
    it('mostra o esqueleto enquanto carrega e depois título, versão ativa, estado da IA e histórico', async () => {
        const montado = await montarComponente(ConfiguracaoIaPage, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
        expect(document.body.querySelector('[aria-busy="true"]')).not.toBeNull();
        expect(montado.componente.jaCarregou()).toBe(false);

        responderCarga(montado);
        await montado.atualizar();

        expect(montado.componente.jaCarregou()).toBe(true);
        expect(textoDaTela()).toContain('Configurações da IA');
        expect(textoDaTela()).toContain('versão 3 ativa');
        expect(textoDaTela()).toContain('IA no ar');
        const historico = document.body.querySelector('aside[aria-label="Histórico de versões"]') as HTMLElement;
        expect(historico.textContent).toContain('Versão 3');
        expect(historico.textContent).toContain('Versão 1');
        expect(historico.textContent).toContain('Ana Admin');
        expect(historico.textContent?.match(/Ativa/g)).toHaveLength(1);
    });

    it('o estado "fora do ar" e "desligada" aparecem como o rótulo do estado', async () => {
        await abrir({ estado: EstadoIaEnum.FORA_DO_AR });
        expect(textoDaTela()).toContain('IA fora do ar');
    });

    it('se só o estado da IA falhar, a tela carrega normalmente sem a marca de estado', async () => {
        const montado = await abrir({ estado: 'ERRO' });
        expect(montado.componente.erro()).toBe(false);
        expect(montado.componente.estado()).toBeNull();
        expect(textoDaTela()).toContain('versão 3 ativa');
        expect(textoDaTela()).not.toContain('IA no ar');
    });

    it('o formulário nasce com os valores da versão ativa e sem nada a salvar', async () => {
        const montado = await abrir();
        expect(montado.componente.formulario.getRawValue()).toMatchObject({
            cadeiaRapido: [item(A, 'claude-haiku-5-5')], cadeiaPadrao: [item(A, 'claude-sonnet-5-5')], cadeiaAnalitico: [item(A, 'claude-opus-5-5')],
            checkinMinimoMinutos: 20, iaDesligada: false,
        });
        expect(campoDoModelo('RAPIDO')?.value).toBe('claude-haiku-5-5');
        expect(campoDoModelo('PADRAO')?.value).toBe('claude-sonnet-5-5');
        expect(campoDoModelo('ANALITICO')?.value).toBe('claude-opus-5-5');
        expect(campoDoModelo('RAPIDO', 1), 'cadeia de um item só não mostra contingência').toBeNull();
        expect(textoDaTela()).toContain('Nada a salvar: o formulário é igual à versão 3.');
        expect(botao('Salvar nova versão').disabled).toBe(true);
        expect(botao('Descartar alterações').disabled).toBe(true);
    });

    it('falha ao carregar mostra o erro e "Tentar de novo" refaz as consultas', async () => {
        const montado = await montarComponente(ConfiguracaoIaPage, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
        responderErro(esperarRequisicao(montado.http, 'GET', '/configuracao-ia'), 500, 'Falhou');
        await montado.atualizar();
        expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar a configuração da IA.');
        expect(document.body.querySelector('p-tabs')).toBeNull();

        // O forkJoin cancelou as outras duas consultas da primeira tentativa; elas ainda constam como abertas no controlador.
        montado.http.match((requisicao) => requisicao.url.endsWith('/configuracao-ia/versoes') || requisicao.url.endsWith('/ia/estado'));
        botao('Tentar de novo').click();
        responderCarga(montado);
        await montado.atualizar();
        expect(document.body.querySelector('[role="alert"]')).toBeNull();
        expect(textoDaTela()).toContain('versão 3 ativa');
    });
});

describe('ConfiguracaoIaPage — editar e salvar', () => {
    it('digitar no campo de modelo habilita salvar e avisa que cria a versão seguinte (a ativa continua no histórico)', async () => {
        const montado = await abrir();
        const campo = campoDoModelo('RAPIDO')!;
        campo.value = 'claude-haiku-5-6';
        campo.dispatchEvent(new Event('input'));
        await montado.atualizar();

        expect(textoDaTela()).toContain('Salvar cria a versão 4; a versão 3 continua no histórico.');
        expect(botao('Salvar nova versão').disabled).toBe(false);
        expect(botao('Descartar alterações').disabled).toBe(false);
    });

    it('"Descartar alterações" devolve o formulário à versão ativa', async () => {
        const montado = await abrir();
        montado.componente.formulario.controls.iaDesligada.setValue(true);
        await montado.atualizar();
        botao('Descartar alterações').click();
        await montado.atualizar();

        expect(montado.componente.formulario.controls.iaDesligada.value).toBe(false);
        expect(textoDaTela()).toContain('Nada a salvar');
    });

    it('modelo em branco mostra o erro do nível ao tentar salvar e não envia nada', async () => {
        const montado = await abrir();
        montado.componente.formulario.controls.cadeiaPadrao.at(0).patchValue({ modelo: '   ' });
        await montado.atualizar();
        montado.componente.salvar();
        await montado.atualizar();

        expect(document.body.querySelectorAll('.provedor-aba__erro').length).toBeGreaterThan(0);
        expect(textoDaTela()).toContain('O modelo do item 1 (Anthropic) da cadeia do nível padrão não foi informado');
        montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    });

    it('modelo de outro provedor mostra o erro e não envia', async () => {
        const montado = await abrir();
        montado.componente.formulario.controls.cadeiaRapido.at(0).patchValue({ modelo: 'gemini-2.5-flash' });
        await montado.atualizar();
        montado.componente.salvar();
        await montado.atualizar();

        expect(textoDaTela()).toContain('O modelo "gemini-2.5-flash" não é de Anthropic (cadeia do nível rápido)');
        montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    });

    it('adicionar contingência põe o próximo provedor livre no fim da cadeia, e o POST leva as três cadeias', async () => {
        const montado = await abrir();
        (document.body.querySelector('[aria-label="Adicionar contingência ao nível Rápido"]') as HTMLButtonElement).click();
        await montado.atualizar();

        expect(montado.componente.formulario.getRawValue().cadeiaRapido).toEqual([item(A, 'claude-haiku-5-5'), item(G, 'gemini-2.5-flash')]);
        expect(campoDoModelo('RAPIDO', 1)?.value).toBe('gemini-2.5-flash');
        expect(textoDaTela()).toContain('Contingência 1');

        botao('Salvar nova versão').click();
        const requisicao = esperarRequisicao(montado.http, 'POST', '/configuracao-ia');
        expect(requisicao.request.body).toMatchObject({
            cadeiaRapido: [item(A, 'claude-haiku-5-5'), item(G, 'gemini-2.5-flash')],
            cadeiaPadrao: [item(A, 'claude-sonnet-5-5')],
            cadeiaAnalitico: [item(A, 'claude-opus-5-5')],
        });
    });

    it('os provedores já usados em outro item da mesma cadeia ficam desabilitados nas opções do item', async () => {
        const ativa = versao(3, { cadeiaRapido: [item(A, 'claude-haiku-5-5'), item(G, 'gemini-2.5-flash')] });
        const montado = await abrir({ ativa, historico: [ativa] });

        const desabilitadas = (opcoes: { valor: unknown; desabilitada?: boolean }[]) => opcoes.filter((opcao) => opcao.desabilitada).map((opcao) => opcao.valor);
        const aba = abaDeProvedor(montado);
        const rapido = aba.niveis[0];
        expect(desabilitadas(aba.opcoesDoProvedor(rapido, 0))).toEqual([G]);
        expect(desabilitadas(aba.opcoesDoProvedor(rapido, 1))).toEqual([A]);
        expect(desabilitadas(aba.opcoesDoProvedor(aba.niveis[1], 0)), 'o padrão tem a sua cadeia: só o item dele conta').toEqual([]);
    });

    it('o mesmo provedor pode estar em cadeias de níveis diferentes (híbrido por nível)', async () => {
        const montado = await abrir();
        montado.componente.formulario.controls.cadeiaPadrao.at(0).patchValue({ provedor: O, modelo: 'gpt-6.1-sol' });
        await montado.atualizar();
        expect(montado.componente.errosDeCadeia()).toEqual([]);

        botao('Salvar nova versão').click();
        const requisicao = esperarRequisicao(montado.http, 'POST', '/configuracao-ia');
        expect(requisicao.request.body).toMatchObject({
            cadeiaRapido: [item(A, 'claude-haiku-5-5')],
            cadeiaPadrao: [item(O, 'gpt-6.1-sol')],
            cadeiaAnalitico: [item(A, 'claude-opus-5-5')],
        });
    });

    it('alterar só o esforço do item do analítico para Alto habilita salvar e o POST muda só esse item', async () => {
        const montado = await abrir();
        expect(montado.componente.semAlteracoes()).toBe(true);
        montado.componente.formulario.controls.cadeiaAnalitico.at(0).patchValue({ esforco: EsforcoIaEnum.ALTO });
        await montado.atualizar();
        expect(botao('Salvar nova versão').disabled).toBe(false);

        botao('Salvar nova versão').click();
        const requisicao = esperarRequisicao(montado.http, 'POST', '/configuracao-ia');
        expect(requisicao.request.body).toMatchObject({
            cadeiaRapido: [item(A, 'claude-haiku-5-5')],
            cadeiaPadrao: [item(A, 'claude-sonnet-5-5')],
            cadeiaAnalitico: [item(A, 'claude-opus-5-5', EsforcoIaEnum.ALTO)],
        });
    });

    it('provedor sem chave não impede salvar: a configuração é gravada mesmo assim', async () => {
        const montado = await abrir({ provedoresComChave: [A] });
        montado.componente.formulario.controls.cadeiaRapido.at(0).patchValue({ provedor: G, modelo: 'gemini-2.5-flash' });
        await montado.atualizar();
        expect(textoDaTela()).toContain('Chave de Provedor não configurada');

        montado.componente.salvar();
        await montado.atualizar();
        const requisicao = esperarRequisicao(montado.http, 'POST', '/configuracao-ia');
        expect(requisicao.request.body).toMatchObject({ cadeiaRapido: [item(G, 'gemini-2.5-flash')] });
    });

    it('check-in com mínimo maior ou igual ao máximo mostra o erro do intervalo e não envia', async () => {
        const montado = await abrir();
        montado.componente.formulario.patchValue({ checkinMinimoMinutos: 40, checkinMaximoMinutos: 40 });
        await montado.atualizar();
        montado.componente.salvar();
        await montado.atualizar();

        expect(textoDaTela()).toContain('O mínimo do check-in deve ser menor que o máximo');
        expect(montado.componente.abaAtiva(), 'o erro está na aba Comportamento: a tela vai para ela').toBe('comportamento');
        expect(document.body.querySelector('[aria-label="Há erros nesta aba"]')).not.toBeNull();
        montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    });

    it('check-in abaixo de 1 minuto ou vazio é inválido', async () => {
        const montado = await abrir();
        montado.componente.formulario.patchValue({ duracaoRecomendadaMinutos: 0, checkinMinimoMinutos: null });
        await montado.atualizar();
        montado.componente.salvar();
        await montado.atualizar();

        expect(textoDaTela()).toContain('Informe um valor de 1 minuto ou mais');
        montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    });

    it('salvar faz POST em /configuracao-ia com os nomes aparados, avisa o sucesso e recarrega mostrando a versão nova', async () => {
        const montado = await abrir();
        const avisos = avisosDe(montado);
        montado.componente.formulario.controls.cadeiaPadrao.at(0).patchValue({ modelo: '  claude-sonnet-5-6 ' });
        montado.componente.formulario.patchValue({ iaDesligada: true });
        await montado.atualizar();

        botao('Salvar nova versão').click();
        const requisicao = esperarRequisicao(montado.http, 'POST', '/configuracao-ia');
        expect(requisicao.request.body).toMatchObject({
            iaDesligada: true, checkinMinimoMinutos: 20, checkinMaximoMinutos: 40,
            cadeiaPadrao: [item(A, 'claude-sonnet-5-6')],
        });
        responderSucesso(requisicao, { id: 4, versao: 4 });
        await montado.atualizar();
        expect(avisos.some((aviso) => aviso.severity === 'success')).toBe(true);

        const nova = versao(4, { cadeiaPadrao: [item(A, 'claude-sonnet-5-6')], iaDesligada: true });
        responderCarga(montado, { ativa: nova, historico: [nova, ...HISTORICO] });
        await montado.atualizar();

        expect(textoDaTela()).toContain('versão 4 ativa');
        expect(textoDaTela()).toContain('Nada a salvar: o formulário é igual à versão 4.');
        expect(montado.componente.salvando()).toBe(false);
    });

    it('erro ao salvar libera o botão e mantém o que foi digitado', async () => {
        const montado = await abrir();
        montado.componente.formulario.controls.iaDesligada.setValue(true);
        await montado.atualizar();
        botao('Salvar nova versão').click();
        responderErro(esperarRequisicao(montado.http, 'POST', '/configuracao-ia'), 400, 'Intervalo inválido');
        await montado.atualizar();

        expect(montado.componente.salvando()).toBe(false);
        expect(montado.componente.formulario.controls.iaDesligada.value).toBe(true);
        expect(botao('Salvar nova versão').disabled).toBe(false);
    });
});

describe('ConfiguracaoIaPage — liga/desliga da IA (fora das abas)', () => {
    const interruptorDaIa = () => document.body.querySelector('.configuracao-ia__liga input[role="switch"]') as HTMLInputElement | null;

    it('o interruptor fica no cabeçalho e aceso significa IA ligada (o dado segue sendo iaDesligada)', async () => {
        const montado = await abrir();
        expect(document.body.querySelector('.configuracao-ia__liga')?.textContent).toContain('IA ligada');
        expect(montado.componente.formulario.controls.iaDesligada.value).toBe(false);
        expect(interruptorDaIa()?.checked).toBe(true);
    });

    it('com a IA desligada na versão ativa o interruptor aparece apagado', async () => {
        const ativa = versao(3, { iaDesligada: true });
        const montado = await montarComponente(ConfiguracaoIaPage, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
        responderCarga(montado, { ativa, historico: [ativa] });
        await montado.atualizar();
        expect(interruptorDaIa()?.checked).toBe(false);
    });

    it('apagar o interruptor grava iaDesligada = true, e acender volta a false', async () => {
        const montado = await abrir();
        interruptorDaIa()!.click();
        await montado.atualizar();
        expect(montado.componente.formulario.controls.iaDesligada.value).toBe(true);
        expect(botao('Salvar nova versão').disabled).toBe(false);

        interruptorDaIa()!.click();
        await montado.atualizar();
        expect(montado.componente.formulario.controls.iaDesligada.value).toBe(false);
        expect(textoDaTela()).toContain('Nada a salvar');
    });

    it('o texto acompanha o interruptor e a explicação aparece no tooltip do PrimeNG', async () => {
        const montado = await abrir();
        const info = document.body.querySelector('.configuracao-ia__info') as HTMLElement;
        expect(montado.componente.iaLigada()).toBe(true);
        expect(document.body.querySelector('.configuracao-ia__estado-ia--ligada')).not.toBeNull();
        info.dispatchEvent(new MouseEvent('mouseenter'));
        await montado.atualizar();
        expect(document.body.querySelector('.p-tooltip')?.textContent).toContain('O chat responde às mensagens');
        info.dispatchEvent(new MouseEvent('mouseleave'));

        interruptorDaIa()!.click();
        await montado.atualizar();
        expect(montado.componente.iaLigada()).toBe(false);
        expect(document.body.querySelector('.configuracao-ia__liga')?.textContent).toContain('IA desligada');
        expect(document.body.querySelector('.configuracao-ia__estado-ia--ligada')).toBeNull();
        info.dispatchEvent(new MouseEvent('mouseenter'));
        await montado.atualizar();
        expect(document.body.querySelector('.p-tooltip')?.textContent).toContain('o chat não responde');
        info.dispatchEvent(new MouseEvent('mouseleave'));
    });

    it('o liga/desliga continua visível em qualquer aba', async () => {
        const montado = await abrir();
        montado.componente.abaAtiva.set('prompts');
        await montado.atualizar();
        expect(interruptorDaIa()).not.toBeNull();
    });
});

describe('ConfiguracaoIaPage — abas, barra de salvar e cadeias por nível (task 204, spec 261)', () => {
    it('as abas são Provedor e modelos, Comportamento, Autonomia, Prompts e Custos (sem Prioridades)', async () => {
        await abrir();
        const abas = Array.from(document.body.querySelectorAll('p-tab')).map((aba) => aba.textContent?.trim());
        expect(abas).toEqual(['Provedor e modelos', 'Comportamento', 'Autonomia', 'Prompts', 'Custos']);
    });

    it('check-in e chat ficam na aba Comportamento, não na de provedor', async () => {
        await abrir();
        const painel = (valor: string) => document.body.querySelector(`p-tabpanel[value="${valor}"]`) as HTMLElement;
        expect(painel('comportamento').textContent).toContain('Check-in e rigor');
        expect(painel('comportamento').textContent).toContain('Dúvidas de programação no chat');
        expect(painel('provedor').textContent).not.toContain('Check-in');
        expect(painel('provedor').textContent).not.toContain('Dúvidas de programação');
    });

    it('a barra de salvar aparece nas abas da configuração; em Prompts some, e volta se há algo pendente (o liga/desliga)', async () => {
        const montado = await abrir();
        expect(botao('Salvar nova versão')).toBeTruthy();

        montado.componente.abaAtiva.set('prompts');
        await montado.atualizar();
        expect(botao('Salvar nova versão')).toBeUndefined();

        montado.componente.formulario.controls.iaDesligada.setValue(true);
        await montado.atualizar();
        expect(botao('Salvar nova versão').disabled).toBe(false);
    });

    it('a aba mostra uma cadeia por nível e o item principal de cada um (provedor, modelo e esforço)', async () => {
        const ativa = versao(3, {
            cadeiaRapido: [item(A, 'claude-haiku-5-5')],
            cadeiaPadrao: [item(O, 'gpt-6.1-sol')],
            cadeiaAnalitico: [item(A, 'claude-opus-5-5', EsforcoIaEnum.ALTO), item(G, 'gemini-2.5-pro')],
        });
        await abrir({ ativa, historico: [ativa], provedoresComChave: [A, O, G] });
        const painel = document.body.querySelector('p-tabpanel[value="provedor"]') as HTMLElement;
        expect(painel.querySelectorAll('section[aria-label^="Cadeia do nível"]')).toHaveLength(3);
        const resumo = painel.querySelector('.provedor-aba__resumo')!.textContent!.replace(/\s+/g, ' ');
        expect(resumo).toContain('Rápido Anthropic · claude-haiku-5-5 · Médio');
        expect(resumo).toContain('Padrão OpenAI · gpt-6.1-sol · Médio');
        expect(resumo).toContain('Analítico Anthropic · claude-opus-5-5 · Alto');
        expect(painel.textContent).toContain('Principal');
        expect(painel.textContent).toContain('Contingência 1');
    });

    it('cada item mostra o aviso quando o provedor dele não tem chave no ambiente, sem impedir nada', async () => {
        const ativa = versao(3, { cadeiaRapido: [item(A, 'claude-haiku-5-5'), item(G, 'gemini-2.5-flash')] });
        const montado = await abrir({ ativa, historico: [ativa], provedoresComChave: [A] });
        const aba = abaDeProvedor(montado);
        expect(aba.semChave(A)).toBe(false);
        expect(aba.semChave(G)).toBe(true);
        expect(document.body.querySelectorAll('.provedor-aba__chave')).toHaveLength(1);
        expect(textoDaTela()).toContain('Chave de Provedor não configurada');
        expect(textoDaTela(), 'o aviso é do item, não do nível: o nível tem o principal com chave').not.toContain('Nenhum provedor deste nível tem chave');
    });

    it('sem o estado da IA os itens não afirmam nada sobre a chave', async () => {
        const montado = await abrir({ estado: 'ERRO' });
        expect(abaDeProvedor(montado).semChave(A)).toBe(false);
        expect(textoDaTela()).not.toContain('Chave de Provedor não configurada');
        expect(textoDaTela()).not.toContain('Nenhum provedor deste nível tem chave');
    });

    it('nível sem nenhum item com chave mostra o alerta do nível, e os outros níveis seguem normais', async () => {
        const ativa = versao(3, { cadeiaPadrao: [item(G, 'gemini-2.5-pro')] });
        const montado = await abrir({ ativa, historico: [ativa], provedoresComChave: [A] });
        const aba = abaDeProvedor(montado);
        expect(aba.nivelSemItemUtilizavel(aba.niveis[0])).toBe(false);
        expect(aba.nivelSemItemUtilizavel(aba.niveis[1])).toBe(true);
        expect(textoDaTela()).toContain('Nenhum provedor deste nível tem chave configurada');
        expect(document.body.querySelectorAll('[role="status"].provedor-aba__alerta')).toHaveLength(1);
    });

    it('remover a contingência tira o item; o principal da cadeia de um item só não pode ser removido', async () => {
        const ativa = versao(3, { cadeiaRapido: [item(A, 'claude-haiku-5-5'), item(G, 'gemini-2.5-flash'), item(O, 'gpt-5-mini')] });
        const montado = await abrir({ ativa, historico: [ativa] });
        expect(botaoPorRotulo('Remover o item Principal do nível Padrão').disabled, 'cadeia de um item só: não remove').toBe(true);

        botaoPorRotulo('Remover o item Contingência 1 do nível Rápido').click();
        await montado.atualizar();
        expect(montado.componente.formulario.getRawValue().cadeiaRapido).toEqual([item(A, 'claude-haiku-5-5'), item(O, 'gpt-5-mini')]);

        botaoPorRotulo('Remover o item Contingência 1 do nível Rápido').click();
        await montado.atualizar();
        expect(montado.componente.formulario.getRawValue().cadeiaRapido).toEqual([item(A, 'claude-haiku-5-5')]);
        expect(botaoPorRotulo('Remover o item Principal do nível Rápido').disabled, 'a cadeia nunca fica vazia').toBe(true);
    });

    it('subir e descer trocam os itens de lugar: o primeiro vira o principal', async () => {
        const ativa = versao(3, { cadeiaAnalitico: [item(A, 'claude-opus-5-5'), item(G, 'gemini-2.5-pro')] });
        const montado = await abrir({ ativa, historico: [ativa] });
        expect(botaoPorRotulo('Subir o item Principal do nível Analítico').disabled).toBe(true);
        expect(botaoPorRotulo('Descer o item Contingência 1 do nível Analítico').disabled).toBe(true);

        botaoPorRotulo('Subir o item Contingência 1 do nível Analítico').click();
        await montado.atualizar();
        expect(montado.componente.formulario.getRawValue().cadeiaAnalitico).toEqual([item(G, 'gemini-2.5-pro'), item(A, 'claude-opus-5-5')]);
        expect(botao('Salvar nova versão').disabled, 'a ordem é parte da configuração').toBe(false);

        botaoPorRotulo('Descer o item Principal do nível Analítico').click();
        await montado.atualizar();
        expect(montado.componente.formulario.getRawValue().cadeiaAnalitico).toEqual([item(A, 'claude-opus-5-5'), item(G, 'gemini-2.5-pro')]);
        expect(montado.componente.semAlteracoes()).toBe(true);
    });

    it('cadeia com um item por provedor não aceita mais contingência', async () => {
        const ativa = versao(3, { cadeiaRapido: [item(A, 'claude-haiku-5-5'), item(G, 'gemini-2.5-flash'), item(O, 'gpt-5-mini')] });
        const montado = await abrir({ ativa, historico: [ativa] });
        const adicionar = (nivel: string) => document.body.querySelector(`[aria-label="Adicionar contingência ao nível ${nivel}"]`) as HTMLButtonElement;
        expect(adicionar('Rápido').disabled).toBe(true);
        expect(adicionar('Padrão').disabled).toBe(false);
        expect(abaDeProvedor(montado).podeAdicionar(abaDeProvedor(montado).niveis[0])).toBe(false);
    });

    it('o erro de uma cadeia marca o nível com problema e a aba, só depois de tentar salvar', async () => {
        const montado = await abrir();
        montado.componente.formulario.controls.cadeiaPadrao.at(0).patchValue({ modelo: 'gemini-2.5-pro' });
        await montado.atualizar();
        expect(document.body.querySelector('.provedor-aba__secao--erro'), 'antes de tentar salvar não acusa').toBeNull();

        montado.componente.salvar();
        await montado.atualizar();
        const comErro = Array.from(document.body.querySelectorAll('.provedor-aba__secao--erro'));
        expect(comErro).toHaveLength(1);
        expect(comErro[0].textContent).toContain('O modelo "gemini-2.5-pro" não é de Anthropic (cadeia do nível padrão)');
        expect(document.body.querySelector('[aria-label="Há erros nesta aba"]')).not.toBeNull();
        expect(montado.componente.abaAtiva()).toBe('provedor');
    });

    it('enquanto salva a tela o liga/desliga não aceita troca', async () => {
        const montado = await abrir();
        const liga = document.body.querySelector('.configuracao-ia__liga') as HTMLElement;
        expect(liga.hasAttribute('inert')).toBe(false);
        montado.componente.salvando.set(true);
        await montado.atualizar();
        expect(liga.hasAttribute('inert')).toBe(true);
    });
});

describe('ConfiguracaoIaPage — dúvidas de programação no chat (task 190)', () => {
    it('mostra o interruptor e a escolha do contexto, com o que cada modo faz, carregados da versão ativa', async () => {
        const ativa = versao(3, { duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO });
        const montado = await montarComponente(ConfiguracaoIaPage, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
        responderCarga(montado, { ativa, historico: [ativa] });
        await montado.atualizar();

        expect(textoDaTela()).toContain('Dúvidas de programação no chat');
        expect(document.body.querySelector('#ia-modo-contexto')).not.toBeNull();
        expect(montado.componente.formulario.controls.duvidasCodigo.value).toBe(true);
        expect(montado.componente.formulario.controls.modoContextoChat.value).toBe(ModoContextoChatEnum.SEPARADO);
        expect(textoDaTela()).toContain('cada pergunta só vê as mensagens do próprio assunto');
        expect(textoDaTela()).toContain('Nada a salvar');
    });

    it('trocar o modo muda a explicação e habilita salvar; os dois campos entram no POST da versão nova', async () => {
        const montado = await abrir();
        expect(montado.componente.formulario.controls.duvidasCodigo.value).toBe(false);
        expect(textoDaTela()).toContain('pode relacionar uma com a outra');

        montado.componente.formulario.patchValue({ duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO });
        await montado.atualizar();
        expect(textoDaTela()).toContain('cada pergunta só vê as mensagens do próprio assunto');
        expect(botao('Salvar nova versão').disabled).toBe(false);

        botao('Salvar nova versão').click();
        const requisicao = esperarRequisicao(montado.http, 'POST', '/configuracao-ia');
        expect(requisicao.request.body).toMatchObject({ duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO });
    });

    it('o histórico mostra as flags de cada versão', async () => {
        const montado = await abrir();
        botao('Versão 2').click();
        await montado.atualizar();
        expect(document.body.querySelector('aside dl')?.textContent).toContain('Dúvidas de código');
        expect(document.body.querySelector('aside dl')?.textContent).toContain('Não · contexto misturado');
    });
});

describe('ConfiguracaoIaPage — histórico', () => {
    it('clicar numa versão abre os valores dela em leitura e clicar de novo fecha', async () => {
        const montado = await abrir();
        botao('Versão 2').click();
        await montado.atualizar();

        const historico = document.body.querySelector('aside[aria-label="Histórico de versões"]') as HTMLElement;
        expect(historico.textContent).toContain('claude-haiku-4');
        expect(historico.textContent).toContain('20 a 50 min');
        expect(historico.textContent).toContain('Desligada');
        expect(botao('Versão 2').getAttribute('aria-expanded')).toBe('true');

        botao('Versão 2').click();
        await montado.atualizar();
        expect(historico.textContent).not.toContain('claude-haiku-4');
        expect(botao('Versão 2').getAttribute('aria-expanded')).toBe('false');
    });

    it('"Usar como base" preenche o formulário com a versão escolhida, avisa e não grava nada', async () => {
        const montado = await abrir();
        const avisos = avisosDe(montado);
        botao('Versão 2').click();
        await montado.atualizar();
        botao('Usar como base').click();
        await montado.atualizar();

        expect(montado.componente.formulario.controls.cadeiaRapido.at(0).controls.modelo.value).toBe('claude-haiku-4');
        expect(montado.componente.formulario.controls.iaDesligada.value).toBe(true);
        expect(avisos.some((aviso) => aviso.severity === 'info' && aviso.detail === 'Valores da versão 2 no formulário. Salvar cria a versão 4.')).toBe(true);
        expect(textoDaTela()).toContain('Salvar cria a versão 4; a versão 3 continua no histórico.');
        expect(document.body.querySelector('aside dl')).toBeNull();
        montado.http.expectNone((requisicao) => requisicao.method !== 'GET');
    });
});

describe('ConfiguracaoIaPage — histórico com cadeias de tamanhos diferentes (spec 261)', () => {
    const maior = versao(2, {
        cadeiaRapido: [item(O, 'gpt-5-mini', EsforcoIaEnum.ALTO), item(A, 'claude-haiku-5-5', EsforcoIaEnum.BAIXO)],
        cadeiaAnalitico: [item(A, 'claude-opus-5-5', EsforcoIaEnum.ALTO), item(G, 'gemini-2.5-pro'), item(O, 'o3')],
    });

    it('o histórico mostra as três cadeias da versão, com principal, contingência e esforço', async () => {
        const montado = await abrir({ historico: [versao(3), maior, versao(1)] });
        botao('Versão 2').click();
        await montado.atualizar();
        const detalhe = document.body.querySelector('aside dl')!.textContent!.replace(/\s+/g, ' ');
        expect(detalhe).toContain('Principal: OpenAI · gpt-5-mini · Alto');
        expect(detalhe).toContain('Contingência 1: Anthropic · claude-haiku-5-5 · Baixo');
        expect(detalhe).toContain('Principal: Anthropic · claude-sonnet-5-5 · Médio');
        expect(detalhe).toContain('Contingência 2: OpenAI · o3 · Médio');
    });

    it('"Usar como base" refaz as listas do formulário com o tamanho da versão e "Descartar" volta ao da ativa', async () => {
        const montado = await abrir({ historico: [versao(3), maior, versao(1)] });
        botao('Versão 2').click();
        await montado.atualizar();
        botao('Usar como base').click();
        await montado.atualizar();

        const formulario = montado.componente.formulario;
        expect([formulario.controls.cadeiaRapido.length, formulario.controls.cadeiaPadrao.length, formulario.controls.cadeiaAnalitico.length]).toEqual([2, 1, 3]);
        expect(campoDoModelo('ANALITICO', 2)?.value).toBe('o3');
        expect(textoDaTela()).toContain('Salvar cria a versão 4');

        botao('Descartar alterações').click();
        await montado.atualizar();
        expect([formulario.controls.cadeiaRapido.length, formulario.controls.cadeiaPadrao.length, formulario.controls.cadeiaAnalitico.length]).toEqual([1, 1, 1]);
        expect(campoDoModelo('ANALITICO', 2)).toBeNull();
        expect(montado.componente.semAlteracoes()).toBe(true);
    });
});

describe('ConfiguracaoIaPage — sair com rascunho de prompt pendente', () => {
    it('sem a aba de prompts alterada, pode sair', async () => {
        const montado = await abrir();
        expect(await montado.componente.podeSair()).toBe(true);
    });

    it('com rascunho de prompt pendente na aba Prompts, a saída pergunta antes (a página repassa para a aba)', async () => {
        const montado = await abrir();
        const aba = montado.fixture.debugElement.query(By.directive(PromptsAbaComponent)).componentInstance as PromptsAbaComponent;
        aba.controleRascunho.setValue('Edição pendente');
        const saida = montado.componente.podeSair();
        await montado.atualizar();

        expect(textoDaTela()).toContain('Alterações não salvas');
        const descartar = Array.from(document.body.querySelectorAll('button')).find((candidato) => candidato.textContent?.trim() === 'Continuar editando') as HTMLButtonElement;
        descartar.click();
        expect(await saida).toBe(false);
    });
});

describe('Rota de configuração da IA — acesso', () => {
    @Component({ standalone: true, templateUrl: './configuracao-ia.page.spec.html', styleUrl: './configuracao-ia.page.spec.scss' })
    class InicioFalsoComponent {}

    const ROTAS = [{ path: 'configuracao-ia', children: configuracaoIaRotas }, { path: '', component: InicioFalsoComponent }];

    async function navegarComo(tipo: TipoUsuarioEnum): Promise<string> {
        const montado = await montarComponente(InicioFalsoComponent, { usuario: tipo, rotas: ROTAS });
        const roteador = TestBed.inject(Router);
        await roteador.navigateByUrl('/configuracao-ia');
        await montado.atualizar();
        return roteador.url;
    }

    it('o administrador entra', async () => {
        expect(await navegarComo(TipoUsuarioEnum.ADMINISTRADOR)).toBe('/configuracao-ia');
    });

    it('o gestor é mandado para a raiz', async () => {
        expect(await navegarComo(TipoUsuarioEnum.GESTOR)).toBe('/');
    });

    it('o desenvolvedor é mandado para a raiz', async () => {
        expect(await navegarComo(TipoUsuarioEnum.DESENVOLVEDOR)).toBe('/');
    });
});

describe('ConfiguracaoIaPage — aba Autonomia (task 228)', () => {
    const painel = () => document.body.querySelector('p-tabpanel[value="autonomia"]') as HTMLElement;
    const linhaDa = (rotulo: string) =>
        Array.from(painel().querySelectorAll('.autonomia-aba__regra')).find((linha) => linha.textContent?.includes(rotulo)) as HTMLElement;
    /** O botão do nível dentro da linha da regra. */
    const nivelDa = (rotulo: string, nivel: string) =>
        Array.from(linhaDa(rotulo).querySelectorAll<HTMLElement>('[role="radio"], button, .p-togglebutton')).find((botaoDoNivel) => botaoDoNivel.textContent?.trim() === nivel) as HTMLElement;
    const totalDeRegras = Object.keys(NIVEIS_PADRAO_DA_PROPOSTA).length;

    it('lista as regras configuráveis com o nível da versão ativa e as fixas com o escudo, fora da escolha', async () => {
        await abrir();
        expect(painel().textContent).toContain('O que a IA faz sozinha');
        expect(painel().querySelectorAll('.autonomia-aba__regra:not(.autonomia-aba__regra--fixa)')).toHaveLength(totalDeRegras);
        expect(linhaDa('Anotar no pad').textContent).toContain('Faz e avisa');
        expect(linhaDa('Alterar atividade').querySelector('.p-togglebutton-checked')?.textContent?.trim()).toBe('Pergunta');
        const fixas = Array.from(painel().querySelectorAll('.autonomia-aba__regra--fixa'));
        expect(fixas.map((linha) => linha.querySelector('strong')?.textContent?.trim())).toEqual([
            'Registrar execução', 'Corrigir execução', 'Criar projeto', 'Justificar ponto', 'Alterar trecho do plano', 'Qualquer ação em nome de outra pessoa', 'Anotar na seção Pessoal do pad',
        ]);
        for (const fixa of fixas) {
            expect(fixa.querySelector('.pi-shield'), 'escudo, não cadeado').not.toBeNull();
            expect(fixa.querySelector('.pi-lock')).toBeNull();
            expect(fixa.querySelector('button, input')).toBeNull();
        }
    });

    it('versão que não guardou o mapa (nulo) abre com o padrão do shared e nada a salvar', async () => {
        const antiga = versao(3, { niveisProposta: null as never });
        const montado = await montarComponente(ConfiguracaoIaPage, { usuario: TipoUsuarioEnum.ADMINISTRADOR });
        responderCarga(montado, { ativa: antiga, historico: [antiga] });
        await montado.atualizar();
        expect(montado.componente.formulario.getRawValue().niveisProposta).toEqual(NIVEIS_PADRAO_DA_PROPOSTA);
        expect(textoDaTela()).toContain('Nada a salvar');
    });

    it('trocar o nível de uma regra habilita salvar e o POST leva o mapa completo com a escolha', async () => {
        const montado = await abrir();
        expect(montado.componente.semAlteracoes()).toBe(true);
        nivelDa('Anotar no pad', 'Pergunta').click();
        await montado.atualizar();
        expect(montado.componente.formulario.controls.niveisProposta.getRawValue()[TipoPropostaIaEnum.ANOTAR_PAD]).toBe(PropostaIaNivelEnum.PERGUNTA);
        expect(botao('Salvar nova versão').disabled).toBe(false);
        expect(painel().textContent).toContain(`de ${totalDeRegras} fazem e avisam`);

        botao('Salvar nova versão').click();
        const requisicao = esperarRequisicao(montado.http, 'POST', '/configuracao-ia');
        expect(requisicao.request.body.niveisProposta).toEqual({ ...NIVEIS_PADRAO_DA_PROPOSTA, [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.PERGUNTA });
    });

    it('"Descartar alterações" devolve os níveis da versão ativa', async () => {
        const montado = await abrir();
        nivelDa('Criar atividade', 'Pergunta').click();
        await montado.atualizar();
        expect(montado.componente.semAlteracoes()).toBe(false);
        botao('Descartar alterações').click();
        await montado.atualizar();
        expect(montado.componente.formulario.controls.niveisProposta.getRawValue()[TipoPropostaIaEnum.CRIAR_ATIVIDADE]).toBe(PropostaIaNivelEnum.FAZ_E_AVISA);
        expect(montado.componente.semAlteracoes()).toBe(true);
    });

    it('"Usar como base" de uma versão antiga traz os níveis dela', async () => {
        const comNivel = versao(2, { niveisProposta: { [TipoPropostaIaEnum.ANOTAR_PAD]: PropostaIaNivelEnum.PERGUNTA } });
        const montado = await abrir({ historico: [versao(3), comNivel, versao(1)] });
        botao('Versão 2').click();
        await montado.atualizar();
        botao('Usar como base').click();
        await montado.atualizar();
        expect(montado.componente.formulario.controls.niveisProposta.getRawValue()[TipoPropostaIaEnum.ANOTAR_PAD]).toBe(PropostaIaNivelEnum.PERGUNTA);
    });
});

describe('ConfiguracaoIaPage — lista de modelos dos provedores no campo de modelo (spec 309)', () => {
    const LISTA_ANTHROPIC: IaModelosProvedorListadoDto = {
        provedor: A, disponivel: true,
        modelos: [{ id: 'claude-opus-5-5', nome: 'Claude Opus 5.5' }, { id: 'claude-haiku-5-5', nome: 'Claude Haiku 5.5' }],
    };
    const LISTA_OPENAI: IaModelosProvedorListadoDto = { provedor: O, disponivel: true, modelos: [{ id: 'gpt-6.1-sol', nome: 'gpt-6.1-sol' }, { id: 'gpt-5', nome: 'gpt-5' }] };
    const SEM_LISTA = (provedor: TipoProvedorIaEnum): IaModelosProvedorListadoDto => ({ provedor, disponivel: false, modelos: [] });

    /** Abre a tela e responde a consulta de modelos que a aba faz ao abrir (`ERRO` simula a falha da consulta). */
    async function abrirComModelos(listas: IaModelosProvedorListadoDto[] | 'ERRO', opcoes: Parameters<typeof responderCarga>[1] = {}): Promise<Montado> {
        const montado = await abrir(opcoes);
        const pedidoDeModelos = esperarRequisicao(montado.http, 'GET', '/ia/modelos');
        if (listas === 'ERRO') responderErro(pedidoDeModelos, 500, 'Falhou');
        else responderSucesso(pedidoDeModelos, listas);
        await montado.atualizar();
        return montado;
    }

    const selectDeModelo = (nivel: string, indice = 0) => document.body.querySelector(`p-select.provedor-aba__modelo:has(#ia-modelo-${nivel}-${indice})`);

    it('a aba consulta a lista uma vez ao abrir, com o carregamento discreto até ela chegar', async () => {
        const montado = await abrir();
        expect(textoDaTela()).toContain('Carregando a lista de modelos dos provedores');
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/modelos'), [LISTA_ANTHROPIC, SEM_LISTA(G), SEM_LISTA(O)]);
        await montado.atualizar();
        expect(textoDaTela()).not.toContain('Carregando a lista de modelos dos provedores');
        montado.http.expectNone((requisicao) => requisicao.url.endsWith('/ia/modelos'));
    });

    it('provedor com lista: o campo é um select que mostra o nome amigável e grava o id', async () => {
        const montado = await abrirComModelos([LISTA_ANTHROPIC, SEM_LISTA(G), SEM_LISTA(O)]);
        const select = selectDeModelo('RAPIDO');
        expect(select, 'o modelo do item principal é um select').not.toBeNull();
        expect(select!.textContent).toContain('Claude Haiku 5.5');
        expect(campoDoModelo('RAPIDO')?.tagName, 'não há mais o campo de digitação').not.toBe('INPUT');

        const aba = abaDeProvedor(montado);
        const opcoes = aba.opcoesDoModelo(aba.niveis[0], 0);
        expect(opcoes.map((opcao) => [opcao.id, opcao.nome])).toEqual([
            ['claude-opus-5-5', 'Claude Opus 5.5'], ['claude-haiku-5-5', 'Claude Haiku 5.5'], ['__outro_modelo__', 'Outro modelo…'],
        ]);

        montado.componente.formulario.controls.cadeiaRapido.at(0).controls.modelo.setValue('claude-opus-5-5');
        await montado.atualizar();
        expect(montado.componente.formulario.getRawValue().cadeiaRapido[0].modelo, 'o id é o que se grava').toBe('claude-opus-5-5');
        expect(selectDeModelo('RAPIDO')!.textContent).toContain('Claude Opus 5.5');
    });

    it('sem chave (ou consulta que falhou) o campo é de digitação à mão, com as sugestões fixas', async () => {
        await abrirComModelos([LISTA_ANTHROPIC, SEM_LISTA(G), SEM_LISTA(O)], {
            ativa: versao(3, { cadeiaRapido: [item(G, 'gemini-2.5-flash')] }), historico: [versao(3, { cadeiaRapido: [item(G, 'gemini-2.5-flash')] })],
        });
        const campo = campoDoModelo('RAPIDO');
        expect(campo?.tagName).toBe('INPUT');
        expect(campo?.value).toBe('gemini-2.5-flash');
        expect(document.body.querySelector('#ia-sugestoes-GOOGLE')).not.toBeNull();
        expect(selectDeModelo('RAPIDO')).toBeNull();
    });

    it('a consulta com erro deixa todos os campos de digitação, como antes da lista, sem acusar nada na tela', async () => {
        const montado = await abrirComModelos('ERRO');
        expect(campoDoModelo('RAPIDO')?.tagName).toBe('INPUT');
        expect(campoDoModelo('PADRAO')?.tagName).toBe('INPUT');
        expect(textoDaTela()).not.toContain('Carregando a lista de modelos dos provedores');
        expect(montado.componente.erro()).toBe(false);
    });

    it('o valor salvo fora da lista continua visível no select, sem apagar nem marcar erro', async () => {
        const ativa = versao(3, { cadeiaRapido: [item(A, 'claude-experimental')] });
        const montado = await abrirComModelos([LISTA_ANTHROPIC, SEM_LISTA(G), SEM_LISTA(O)], { ativa, historico: [ativa] });
        expect(selectDeModelo('RAPIDO')!.textContent).toContain('claude-experimental');
        expect(montado.componente.formulario.getRawValue().cadeiaRapido[0].modelo).toBe('claude-experimental');
        expect(montado.componente.semAlteracoes()).toBe(true);
        expect(montado.componente.errosDeCadeia()).toEqual([]);
    });

    it('"Outro modelo…" devolve o valor de antes e abre a digitação à mão; o botão ao lado volta para a lista', async () => {
        const montado = await abrirComModelos([LISTA_ANTHROPIC, SEM_LISTA(G), SEM_LISTA(O)]);
        const aba = abaDeProvedor(montado);
        aba.aoEscolherModelo(aba.niveis[0], 0, '__outro_modelo__');
        await montado.atualizar();

        const campo = campoDoModelo('RAPIDO');
        expect(campo?.tagName).toBe('INPUT');
        expect(campo?.value, 'o modelo que já estava continua no campo').toBe('claude-haiku-5-5');
        expect(montado.componente.formulario.getRawValue().cadeiaRapido[0].modelo).toBe('claude-haiku-5-5');
        expect(montado.componente.semAlteracoes()).toBe(true);
        expect(selectDeModelo('PADRAO'), 'os outros itens seguem como select').not.toBeNull();

        campo!.value = 'claude-recem-lancado';
        campo!.dispatchEvent(new Event('input'));
        await montado.atualizar();
        expect(montado.componente.formulario.getRawValue().cadeiaRapido[0].modelo).toBe('claude-recem-lancado');

        botaoPorRotulo('Voltar à lista de modelos do item Principal do nível Rápido').click();
        await montado.atualizar();
        expect(selectDeModelo('RAPIDO')).not.toBeNull();
        expect(selectDeModelo('RAPIDO')!.textContent, 'o valor digitado fica visível mesmo fora da lista').toContain('claude-recem-lancado');
    });

    it('"Outro modelo…" escolhido de outro valor não grava a opção como modelo', async () => {
        const montado = await abrirComModelos([LISTA_ANTHROPIC, SEM_LISTA(G), SEM_LISTA(O)]);
        const aba = abaDeProvedor(montado);
        aba.aoEscolherModelo(aba.niveis[1], 0, 'claude-opus-5-5');
        expect(aba.usaSelectDeModelo(aba.niveis[1], 0), 'qualquer valor que não é o "Outro" não muda o campo').toBe(true);
        expect(JSON.stringify(montado.componente.formulario.getRawValue())).not.toContain('__outro_modelo__');
    });

    it('trocar o provedor do item põe o primeiro modelo da lista dele (ou a primeira sugestão) no lugar do modelo do anterior', async () => {
        const montado = await abrirComModelos([LISTA_ANTHROPIC, SEM_LISTA(G), LISTA_OPENAI]);
        const aba = abaDeProvedor(montado);
        const grupo = montado.componente.formulario.controls.cadeiaRapido.at(0);

        grupo.controls.provedor.setValue(O);
        aba.aoTrocarProvedor(aba.niveis[0], 0, O);
        await montado.atualizar();
        expect(grupo.controls.modelo.value).toBe('gpt-6.1-sol');

        grupo.controls.provedor.setValue(G);
        aba.aoTrocarProvedor(aba.niveis[0], 0, G);
        expect(grupo.controls.modelo.value, 'sem lista, a primeira sugestão fixa').toBe('gemini-2.5-flash');

        grupo.controls.modelo.setValue('gemini-2.5-pro');
        aba.aoTrocarProvedor(aba.niveis[0], 0, G);
        expect(grupo.controls.modelo.value, 'modelo que já é do provedor não é trocado').toBe('gemini-2.5-pro');
    });

    it('a validação de salvar é a da 261: modelo do select ou digitado precisa ser do provedor do item', async () => {
        const montado = await abrirComModelos([LISTA_ANTHROPIC, SEM_LISTA(G), SEM_LISTA(O)]);
        montado.componente.formulario.controls.cadeiaRapido.at(0).patchValue({ modelo: 'gpt-5' });
        await montado.atualizar();
        montado.componente.salvar();
        await montado.atualizar();
        expect(textoDaTela()).toContain('O modelo "gpt-5" não é de Anthropic (cadeia do nível rápido)');
        montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    });
});
