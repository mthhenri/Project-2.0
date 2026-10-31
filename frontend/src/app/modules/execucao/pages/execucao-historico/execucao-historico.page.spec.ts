import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { EstadoIaEnum, ExecucaoItemDto, TipoUsuarioEnum } from '@project20/shared';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { ExecucaoHistoricoPage } from './execucao-historico.page';
import { dataParaIso } from '../../utils/execucao.util';

type Montado = ComponenteMontado<ExecucaoHistoricoPage>;

// O cronômetro da linha em andamento usa setInterval, que deixaria a zona instável: só os intervalos são falsos.
const usarRelogioFalso = () => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });

afterEach(() => vi.useRealTimers());

function criarExecucao(id: number, sobrescritas: Partial<ExecucaoItemDto> = {}): ExecucaoItemDto {
    const inicio = new Date();
    inicio.setHours(inicio.getHours() - 3);
    const fim = new Date(inicio.getTime() + 90 * 60_000);
    return {
        id, atividadeId: 20 + id, nomeAtividade: `Atividade ${id}`, demandaId: 10, nomeDemanda: 'Demanda dez',
        projetoId: 5, nomeProjeto: 'Portal', descricao: `Descrição ${id}`, inicioData: inicio, fimData: fim,
        duracaoMinutos: 90, usuarioId: 1, nomeUsuario: 'Maria Souza', ...sobrescritas,
    };
}

const pagina = (itens: ExecucaoItemDto[], totalMinutosDia = 0, totalItens = itens.length) =>
    ({ itens, totalItens, pagina: 1, itensPorPagina: 50, totalMinutosDia });

async function montarPagina({ usuario = TipoUsuarioEnum.GESTOR, consulta = {} }: { usuario?: TipoUsuarioEnum; consulta?: Record<string, string> } = {}) {
    TestBed.resetTestingModule();
    usarRelogioFalso();
    const parametros = new BehaviorSubject(convertToParamMap(consulta));
    const rota = { snapshot: { queryParamMap: parametros.value }, queryParamMap: parametros.asObservable() };
    const montado = await montarComponente(ExecucaoHistoricoPage, { usuario, provedores: [{ provide: ActivatedRoute, useValue: rota }] });
    const irPara = vi.fn().mockResolvedValue(true);
    (montado.fixture.debugElement.injector.get(Router) as unknown as { navigate: unknown }).navigate = irPara;
    return { montado, irPara, parametros };
}

/** Atende as leituras de apoio (usuários do filtro e dos dialogs filhos) e a primeira busca de execuções. */
async function carregar(montado: Montado, itens: ExecucaoItemDto[] = [], totalMinutosDia = 0): Promise<void> {
    for (const requisicao of montado.http.match((r) => r.method === 'GET' && r.url.endsWith('/usuario'))) {
        responderSucesso(requisicao, { itens: [{ id: 1, nomeCompleto: 'Maria Souza' }, { id: 3, nomeCompleto: 'João Lima' }], totalItens: 2 });
    }
    for (const requisicao of montado.http.match((r) => r.method === 'GET' && (r.url.endsWith('/demanda/atribuidas') || r.url.endsWith('/tag')))) {
        responderSucesso(requisicao, []);
    }
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina(itens, totalMinutosDia));
    await montado.atualizar();
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const botaoPorRotulo = (montado: Montado, rotulo: string) =>
    Array.from(montado.elemento.querySelectorAll('button')).filter((botao) => botao.getAttribute('aria-label') === rotulo);
const botaoPorTexto = (montado: Montado, conteudo: string) =>
    Array.from(montado.elemento.querySelectorAll('button')).find((botao) => botao.textContent?.includes(conteudo));
const cabecalhos = (montado: Montado) => Array.from(montado.elemento.querySelectorAll('th')).map((celula) => celula.textContent?.trim());

describe('ExecucaoHistoricoPage: carregamento e estados', () => {
    it('abre no dia de hoje, na primeira página, e mostra o esqueleto até a resposta', async () => {
        const { montado } = await montarPagina();
        const requisicao = esperarRequisicao(montado.http, 'GET', '/execucao');
        expect(requisicao.request.params.get('data')).toBe(dataParaIso(montado.componente.hoje));
        expect(requisicao.request.params.get('pagina')).toBe('1');
        expect(requisicao.request.params.get('itensPorPagina')).toBe('50');
        expect(requisicao.request.params.has('usuarioId')).toBe(false);
        expect(montado.componente.primeiraCarga()).toBe(true);
        expect(montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();
    });

    it('com dados mostra as linhas, o resumo do dia e o total de minutos no rodapé', async () => {
        const { montado } = await montarPagina();
        await carregar(montado, [criarExecucao(1), criarExecucao(2, { duracaoMinutos: 60 })], 150);
        expect(montado.componente.primeiraCarga()).toBe(false);
        expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
        expect(montado.elemento.querySelectorAll('tr.execucao-historico__linha').length).toBe(2);
        expect(texto(montado)).toContain('Atividade 1');
        expect(texto(montado)).toContain('Descrição 2');
        expect(texto(montado)).toContain('2 execuções · 2h30');
        expect(montado.elemento.querySelector('.execucao-historico__rodape')?.textContent).toContain('Total do dia');
        expect(montado.componente.totalMinutosDia()).toBe(150);
    });

    it('sem execuções mostra o estado vazio com a data e sem rodapé de total', async () => {
        const { montado } = await montarPagina();
        await carregar(montado, []);
        expect(texto(montado)).toContain('Nenhuma execução em');
        expect(texto(montado)).toContain('Nenhuma execução');
        expect(montado.elemento.querySelector('.execucao-historico__rodape')).toBeNull();
        expect(botaoPorTexto(montado, 'Ver dia anterior')).toBeDefined();
        expect(botaoPorTexto(montado, 'Voltar para hoje')).toBeUndefined();
    });

    it('em outro dia vazio oferece voltar para hoje; com usuário filtrado, limpar o filtro', async () => {
        const { montado, irPara } = await montarPagina({ consulta: { data: '2026-01-05', usuario: '3' } });
        await carregar(montado, []);
        expect(botaoPorTexto(montado, 'Voltar para hoje')).toBeDefined();
        botaoPorTexto(montado, 'Limpar filtro de usuário')!.click();
        expect(irPara).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { data: '2026-01-05', usuario: null } }));
    });

    it('falha na busca mantém a tela sem dados, tira o esqueleto e não derruba a página', async () => {
        const { montado } = await montarPagina();
        responderErro(esperarRequisicao(montado.http, 'GET', '/execucao'), 500, 'Falha ao listar');
        await montado.atualizar();
        expect(montado.componente.carregando()).toBe(false);
        expect(montado.componente.execucoes()).toEqual([]);
        expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
        expect(texto(montado)).toContain('Nenhuma execução em');
    });

    it('a execução em andamento sai da tabela e vai para o bloco "Em andamento agora", com cronômetro', async () => {
        const { montado } = await montarPagina();
        await carregar(montado, [criarExecucao(1), criarExecucao(2, { fimData: null, duracaoMinutos: null })], 90);
        const linhas = Array.from(montado.elemento.querySelectorAll('tr.execucao-historico__linha'));
        expect(linhas.length).toBe(1);
        expect(linhas[0].textContent).toContain('1h 30min');
        expect(linhas[0].querySelector('app-execucao-timer')).toBeNull();
        const bloco = montado.elemento.querySelector('app-execucao-agora')!;
        expect(bloco.textContent).toContain('Em andamento agora');
        expect(bloco.textContent).toContain('Atividade 2');
        expect(bloco.querySelector('app-execucao-timer')).not.toBeNull();
        expect(texto(montado)).toContain('2 execuções · 1h30 · 1 em andamento');
        expect(montado.elemento.querySelector('.execucao-historico__rodape')?.textContent).toContain('Total do dia');
    });

    it('só com execução ativa a tabela não diz que o dia está vazio', async () => {
        const { montado } = await montarPagina();
        await carregar(montado, [criarExecucao(2, { fimData: null, duracaoMinutos: null })], 10);
        expect(texto(montado)).toContain('Nenhuma execução encerrada em');
        expect(texto(montado)).not.toContain('Ver dia anterior');
        expect(montado.componente.totalEncerradas()).toBe(0);
    });

    it('gestor sem filtro vê um cartão por usuário em andamento, com o nome', async () => {
        const { montado } = await montarPagina();
        await carregar(
            montado,
            [
                criarExecucao(1, { fimData: null, duracaoMinutos: null, nomeUsuario: 'Maria Souza' }),
                criarExecucao(2, { fimData: null, duracaoMinutos: null, nomeUsuario: 'João Lima' }),
            ],
            0,
        );
        const bloco = montado.elemento.querySelector('app-execucao-agora')!;
        expect(bloco.querySelectorAll('article').length).toBe(2);
        expect(bloco.textContent).toContain('Em andamento agora · 2');
        expect(bloco.textContent).toContain('João Lima');
        expect(bloco.querySelector('.execucao-agora__avatar')?.textContent?.trim()).toBe('MS');
    });

    it('gestor filtrado em um usuário vê o cartão sem avatar', async () => {
        const { montado } = await montarPagina({ consulta: { usuario: '1' } });
        await carregar(montado, [criarExecucao(1, { fimData: null, duracaoMinutos: null })]);
        expect(montado.elemento.querySelector('.execucao-agora__avatar')).toBeNull();
    });

    it('sem execução ativa o gestor vê o estado vazio e nenhum botão de iniciar', async () => {
        const { montado } = await montarPagina();
        await carregar(montado, [criarExecucao(1)], 90);
        expect(montado.elemento.querySelector('app-execucao-agora')?.textContent).toContain('Ninguém está executando agora.');
        expect(botaoPorTexto(montado, 'Iniciar atividade')).toBeUndefined();
    });

    it('num dia passado sem execução ativa o bloco "agora" não aparece', async () => {
        const { montado } = await montarPagina({ consulta: { data: '2026-01-05' } });
        await carregar(montado, [criarExecucao(1)], 90);
        expect(montado.elemento.querySelector('app-execucao-agora')).toBeNull();
    });

    it('o desenvolvedor sem execução ativa leva "O que temos pra fazer?" ao chat com a IA no ar', async () => {
        const { montado, irPara } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
        montado.fixture.debugElement.injector.get(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.NO_AR);
        await carregar(montado, []);
        botaoPorTexto(montado, 'Iniciar atividade')!.click();
        expect(irPara).toHaveBeenCalledWith(['/chat'], { queryParams: { mensagem: 'O que temos pra fazer?' } });
    });

    it('com execução já feita no dia a mensagem do chat é "De onde paramos?"', async () => {
        const { montado, irPara } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
        montado.fixture.debugElement.injector.get(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.NO_AR);
        await carregar(montado, [criarExecucao(1)], 90);
        botaoPorTexto(montado, 'Iniciar atividade')!.click();
        expect(irPara).toHaveBeenCalledWith(['/chat'], { queryParams: { mensagem: 'De onde paramos?' } });
    });

    it('com a IA fora do ar, "Iniciar atividade" leva às Atividades', async () => {
        const { montado, irPara } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
        montado.fixture.debugElement.injector.get(IaDisponibilidadeService).estadoReal.set(EstadoIaEnum.DESLIGADA);
        await carregar(montado, []);
        botaoPorTexto(montado, 'Iniciar atividade')!.click();
        expect(irPara).toHaveBeenCalledWith(['/atividade']);
    });

    it('ao encerrar pelo diálogo da execução, a lista recarrega', async () => {
        const { montado } = await montarPagina();
        const ativa = criarExecucao(2, { fimData: null, duracaoMinutos: null });
        await carregar(montado, [ativa]);
        montado.componente.aposEncerrarExecucao();
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina([{ ...ativa, fimData: new Date(), duracaoMinutos: 30 }], 30));
        await montado.atualizar();
        expect(montado.componente.ativas()).toEqual([]);
        expect(montado.componente.linhas().length).toBe(1);
    });
});

describe('ExecucaoHistoricoPage: filtros', () => {
    it('data e usuário da URL viram parâmetros da busca (gestor)', async () => {
        const { montado } = await montarPagina({ consulta: { data: '2026-01-05', usuario: '3' } });
        const requisicao = esperarRequisicao(montado.http, 'GET', '/execucao');
        expect(requisicao.request.params.get('data')).toBe('2026-01-05');
        expect(requisicao.request.params.get('usuarioId')).toBe('3');
        expect(montado.componente.formularioFiltros.value.usuarioId).toBe(3);
        expect(montado.componente.visualizandoHoje()).toBe(false);
    });

    it('data futura ou inválida na URL cai em hoje', async () => {
        const futura = montarPagina({ consulta: { data: '2999-01-01' } });
        const { montado } = await futura;
        expect(esperarRequisicao(montado.http, 'GET', '/execucao').request.params.get('data')).toBe(dataParaIso(montado.componente.hoje));

        const invalida = await montarPagina({ consulta: { data: '2026-02-30' } });
        expect(esperarRequisicao(invalida.montado.http, 'GET', '/execucao').request.params.get('data')).toBe(dataParaIso(invalida.montado.componente.hoje));
    });

    it('mudança de URL recarrega a lista do novo dia, voltando à primeira página', async () => {
        const { montado, parametros } = await montarPagina();
        await carregar(montado, [criarExecucao(1)]);
        parametros.next(convertToParamMap({ data: '2026-01-05' }));
        const requisicao = esperarRequisicao(montado.http, 'GET', '/execucao');
        expect(requisicao.request.params.get('data')).toBe('2026-01-05');
        expect(requisicao.request.params.get('pagina')).toBe('1');
        responderSucesso(requisicao, pagina([]));
    });

    it('o dia anterior vai para a URL com a data; hoje fica sem data na URL', async () => {
        const { montado, irPara } = await montarPagina();
        await carregar(montado);
        botaoPorRotulo(montado, 'Dia anterior')[0].click();
        const hoje = montado.componente.hoje;
        const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
        expect(irPara).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { data: dataParaIso(ontem), usuario: null } }));
        montado.componente.aoMudarFiltro();
        expect(irPara).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { data: null, usuario: null } }));
    });

    it('em hoje não há "Hoje" nem próximo dia; em dia passado o "Hoje" aparece e volta à data corrente', async () => {
        const hojeMontado = await montarPagina();
        await carregar(hojeMontado.montado);
        expect(botaoPorTexto(hojeMontado.montado, 'Hoje')).toBeUndefined();
        expect((botaoPorRotulo(hojeMontado.montado, 'Próximo dia')[0] as HTMLButtonElement).disabled).toBe(true);

        const passado = await montarPagina({ consulta: { data: '2026-01-05' } });
        await carregar(passado.montado);
        expect((botaoPorRotulo(passado.montado, 'Próximo dia')[0] as HTMLButtonElement).disabled).toBe(false);
        botaoPorTexto(passado.montado, 'Hoje')!.click();
        expect(passado.irPara).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { data: null, usuario: null } }));
    });

    it('"Minhas" filtra pelo usuário logado e, estando ativo, remove o filtro', async () => {
        const { montado, irPara } = await montarPagina();
        await carregar(montado);
        botaoPorTexto(montado, 'Minhas')!.click();
        expect(irPara).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { data: null, usuario: 1 } }));

        const ativa = await montarPagina({ consulta: { usuario: '1' } });
        await carregar(ativa.montado);
        expect(ativa.montado.componente.filtrandoMinhas()).toBe(true);
        botaoPorTexto(ativa.montado, 'Minhas')!.click();
        expect(ativa.irPara).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { data: null, usuario: null } }));
    });

    it('o gestor carrega a lista de usuários ativos para o filtro', async () => {
        const { montado } = await montarPagina();
        const usuarios = esperarRequisicao(montado.http, 'GET', '/usuario');
        expect(usuarios.request.params.get('allRows')).toBe('true');
        responderSucesso(usuarios, { itens: [{ id: 3, nomeCompleto: 'João Lima' }], totalItens: 1 });
        expect(montado.componente.usuarios().length).toBe(1);
        montado.http.match(() => true);
    });

    it('voltar para a aba recarrega a lista, exceto com uma busca em andamento', async () => {
        const { montado } = await montarPagina();
        await carregar(montado);
        montado.componente.aoVoltarParaAba();
        const recarga = esperarRequisicao(montado.http, 'GET', '/execucao');
        montado.componente.aoVoltarParaAba();
        montado.http.expectNone((r) => r.method === 'GET' && r.url.endsWith('/execucao'));
        responderSucesso(recarga, pagina([]));
    });
});

describe('ExecucaoHistoricoPage: gestor x desenvolvedor', () => {
    it('gestor vê o filtro de usuário, Minhas, Relatório, a coluna Usuário e a coluna Ações', async () => {
        const { montado } = await montarPagina();
        await carregar(montado, [criarExecucao(1)], 90);
        expect(texto(montado)).toContain('Relatório');
        expect(botaoPorTexto(montado, 'Minhas')).toBeDefined();
        expect(montado.elemento.querySelector('#filtro-usuario, p-select')).not.toBeNull();
        expect(cabecalhos(montado)).toContain('Usuário');
        expect(cabecalhos(montado)).toContain('Ações');
        expect(texto(montado)).toContain('Maria Souza');
        expect(botaoPorRotulo(montado, 'Excluir execução').length).toBe(1);
    });

    it('desenvolvedor não vê filtro de usuário, Minhas, Relatório, colunas de usuário e ações, e não carrega usuários', async () => {
        const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
        montado.http.expectNone((r) => r.url.endsWith('/usuario'));
        await carregar(montado, [criarExecucao(1)], 90);
        expect(texto(montado)).not.toContain('Relatório');
        expect(botaoPorTexto(montado, 'Minhas')).toBeUndefined();
        expect(montado.elemento.querySelector('p-select')).toBeNull();
        expect(cabecalhos(montado)).not.toContain('Usuário');
        expect(cabecalhos(montado)).not.toContain('Ações');
        expect(botaoPorRotulo(montado, 'Excluir execução').length).toBe(0);
        expect(montado.elemento.querySelector('.execucao-historico__descricao-botao')).toBeNull();
        expect(texto(montado)).toContain('Descrição 1');
    });

    it('desenvolvedor ignora o usuário da URL: a busca não leva usuarioId', async () => {
        const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR, consulta: { usuario: '3' } });
        expect(esperarRequisicao(montado.http, 'GET', '/execucao').request.params.has('usuarioId')).toBe(false);
        expect(montado.componente.usuarioFiltradoId()).toBeNull();
    });

    it('desenvolvedor não consegue abrir a edição, nem programaticamente', async () => {
        const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
        await carregar(montado, [criarExecucao(1)]);
        montado.componente.iniciarEdicao(montado.componente.execucoes()[0], 'descricao');
        expect(montado.componente.edicao()).toBeNull();
        expect(montado.elemento.querySelector('.execucao-historico__momento--editavel')).toBeNull();
    });
});

describe('ExecucaoHistoricoPage: edição inline (gestor)', () => {
    async function carregada(itens: ExecucaoItemDto[] = [criarExecucao(1, { usuarioId: 3, nomeUsuario: 'João Lima' })]) {
        const contexto = await montarPagina();
        await carregar(contexto.montado, itens, 90);
        return contexto;
    }
    const execucaoUm = (montado: Montado) => montado.componente.execucoes()[0];

    it('clicar na descrição troca o texto por um campo de edição já com o valor atual', async () => {
        const { montado } = await carregada();
        (montado.elemento.querySelector('.execucao-historico__descricao-botao') as HTMLButtonElement).click();
        await montado.atualizar();
        expect(montado.componente.editando(execucaoUm(montado), 'descricao')).toBe(true);
        expect(montado.componente.rascunhoDescricao.value).toBe('Descrição 1');
        expect(montado.elemento.querySelector('textarea')).not.toBeNull();
    });

    it('clicar no início ou no fim abre o seletor de data daquele campo', async () => {
        const { montado } = await carregada();
        const [inicio, fim] = Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('.execucao-historico__momento--editavel'));
        inicio.click();
        await montado.atualizar();
        expect(montado.componente.editando(execucaoUm(montado), 'inicio')).toBe(true);
        expect(montado.componente.rascunhoData.value).toBeInstanceOf(Date);
        expect(montado.elemento.querySelector('p-datepicker')).not.toBeNull();

        montado.componente.iniciarEdicao(execucaoUm(montado), 'fim');
        expect(montado.componente.editando(execucaoUm(montado), 'fim')).toBe(true);
        expect(montado.componente.editando(execucaoUm(montado), 'inicio')).toBe(false);
        expect(fim).toBeDefined();
    });

    it('o horário aparece em cima e o dia/mês embaixo', async () => {
        const { montado } = await carregada();
        const momento = montado.elemento.querySelector('.execucao-historico__momento') as HTMLElement;
        expect(momento.children[0].classList).toContain('execucao-historico__momento-hora');
        expect(momento.children[1].classList).toContain('execucao-historico__momento-data');
    });

    it('sair sem alterar nada fecha o campo em silêncio, sem pergunta nem requisição', async () => {
        const { montado } = await carregada();
        montado.componente.iniciarEdicao(execucaoUm(montado), 'descricao');
        montado.componente.aoSairDaEdicao();
        expect(montado.componente.edicao()).toBeNull();
        expect(montado.componente.confirmandoEdicao()).toBe(false);
        montado.http.expectNone((r) => r.method === 'PUT');
    });

    it('sair com alteração pergunta "Salvar alteração?" e "Não" descarta o rascunho', async () => {
        const { montado } = await carregada();
        montado.componente.iniciarEdicao(execucaoUm(montado), 'descricao');
        montado.componente.rascunhoDescricao.setValue('Outra coisa');
        montado.componente.aoSairDaEdicao();
        await montado.atualizar();
        expect(montado.componente.confirmandoEdicao()).toBe(true);
        expect(texto(montado)).toContain('Salvar alteração?');

        montado.componente.descartarEdicao();
        await montado.atualizar();
        expect(montado.componente.edicao()).toBeNull();
        expect(execucaoUm(montado).descricao).toBe('Descrição 1');
        montado.http.expectNone((r) => r.method === 'PUT');
    });

    it('"Sim" envia PUT /execucao/:id com a descrição aparada e os demais valores intactos, e atualiza a linha', async () => {
        const { montado } = await carregada();
        const original = execucaoUm(montado);
        montado.componente.iniciarEdicao(original, 'descricao');
        montado.componente.rascunhoDescricao.setValue('  Nova descrição  ');
        montado.componente.aoSairDaEdicao();
        montado.componente.confirmarEdicao();

        const requisicao = esperarRequisicao(montado.http, 'PUT', '/execucao/1');
        expect(requisicao.request.body.descricao).toBe('Nova descrição');
        expect(requisicao.request.body.inicioData).toBe(original.inicioData.toISOString());
        expect(requisicao.request.body.fimData).toBe(original.fimData!.toISOString());
        expect(montado.componente.salvandoEdicao()).toBe(true);

        responderSucesso(requisicao, {
            ...original, descricao: 'Nova descrição', inicioData: original.inicioData.toISOString(),
            fimData: original.fimData!.toISOString(), duracaoMinutos: 45,
        });
        await montado.atualizar();
        expect(montado.componente.salvandoEdicao()).toBe(false);
        expect(montado.componente.edicao()).toBeNull();
        expect(execucaoUm(montado).descricao).toBe('Nova descrição');
        expect(execucaoUm(montado).duracaoMinutos).toBe(45);
    });

    it('alterar o início envia só o início novo; o fim e a descrição seguem como estavam', async () => {
        const { montado } = await carregada();
        const original = execucaoUm(montado);
        montado.componente.iniciarEdicao(original, 'inicio');
        const rascunho = montado.componente.rascunhoData.value as Date;
        montado.componente.rascunhoData.setValue(new Date(rascunho.getTime() - 10 * 60_000));
        montado.componente.aoSairDaEdicao();
        montado.componente.confirmarEdicao();

        const corpo = esperarRequisicao(montado.http, 'PUT', '/execucao/1').request.body;
        expect(new Date(corpo.inicioData).getTime()).toBe(original.inicioData.getTime() - 10 * 60_000);
        expect(corpo.fimData).toBe(original.fimData!.toISOString());
        expect(corpo.descricao).toBe('Descrição 1');
    });

    it('ao alterar o fim recarrega a duração e o total do dia', async () => {
        const { montado } = await carregada();
        const original = execucaoUm(montado);
        montado.componente.iniciarEdicao(original, 'fim');
        montado.componente.rascunhoData.setValue(new Date(montado.componente.rascunhoData.value!.getTime() + 10 * 60_000));
        montado.componente.aoSairDaEdicao();
        montado.componente.confirmarEdicao();
        const requisicao = esperarRequisicao(montado.http, 'PUT', '/execucao/1');
        const alterada = { ...original, fimData: requisicao.request.body.fimData, duracaoMinutos: 100 };
        responderSucesso(requisicao, alterada);
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina([alterada], 100));
        await montado.atualizar();
        expect(texto(montado)).toContain('1h40');
        expect(execucaoUm(montado).duracaoMinutos).toBe(100);
    });

    it('ao mover o início para outro dia a execução sai da lista e o total é recalculado', async () => {
        const { montado } = await carregada();
        const original = execucaoUm(montado);
        montado.componente.iniciarEdicao(original, 'inicio');
        montado.componente.rascunhoData.setValue(new Date(montado.componente.rascunhoData.value!.getTime() - 24 * 3_600_000));
        montado.componente.aoSairDaEdicao();
        montado.componente.confirmarEdicao();
        const requisicao = esperarRequisicao(montado.http, 'PUT', '/execucao/1');
        responderSucesso(requisicao, { ...original, inicioData: requisicao.request.body.inicioData, duracaoMinutos: 1530 });
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina([], 0));
        await montado.atualizar();
        expect(montado.componente.linhas()).toEqual([]);
        expect(montado.componente.totalMinutosDia()).toBe(0);
    });

    it('fim igual ou anterior ao início avisa e mantém o campo aberto, sem enviar', async () => {
        const { montado } = await carregada();
        const original = execucaoUm(montado);
        montado.componente.iniciarEdicao(original, 'fim');
        montado.componente.rascunhoData.setValue(new Date(montado.componente.rascunhoData.value!.getTime() - 3 * 3_600_000));
        montado.componente.aoSairDaEdicao();
        montado.componente.confirmarEdicao();
        montado.http.expectNone((r) => r.method === 'PUT');
        expect(montado.componente.edicao()).not.toBeNull();
        expect(montado.componente.confirmandoEdicao()).toBe(false);
    });

    it('descrição vazia ou com caracteres proibidos não é enviada e o campo continua aberto', async () => {
        const { montado } = await carregada();
        montado.componente.iniciarEdicao(execucaoUm(montado), 'descricao');
        for (const valor of ['', 'texto com "aspas"']) {
            montado.componente.rascunhoDescricao.setValue(valor);
            montado.componente.aoSairDaEdicao();
            montado.componente.confirmarEdicao();
            montado.http.expectNone((r) => r.method === 'PUT');
            expect(montado.componente.edicao()).not.toBeNull();
            expect(montado.componente.confirmandoEdicao()).toBe(false);
        }
    });

    it('erro do servidor mantém o campo aberto com o rascunho e a linha como estava', async () => {
        const { montado } = await carregada();
        montado.componente.iniciarEdicao(execucaoUm(montado), 'descricao');
        montado.componente.rascunhoDescricao.setValue('Vai falhar');
        montado.componente.aoSairDaEdicao();
        montado.componente.confirmarEdicao();
        responderErro(esperarRequisicao(montado.http, 'PUT', '/execucao/1'), 400, 'Sobreposição');
        await montado.atualizar();
        expect(montado.componente.salvandoEdicao()).toBe(false);
        expect(montado.componente.edicao()).not.toBeNull();
        expect(montado.componente.rascunhoDescricao.value).toBe('Vai falhar');
        expect(execucaoUm(montado).descricao).toBe('Descrição 1');
    });

    it('Esc sai da edição; com a pergunta aberta, Esc descarta', async () => {
        const { montado } = await carregada();
        montado.componente.iniciarEdicao(execucaoUm(montado), 'descricao');
        montado.componente.rascunhoDescricao.setValue('Mudou');
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(montado.componente.confirmandoEdicao()).toBe(true);
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(montado.componente.edicao()).toBeNull();
    });

    it('execução em andamento não abre edição do fim', async () => {
        const { montado } = await carregada([criarExecucao(1, { fimData: null, duracaoMinutos: null })]);
        montado.componente.iniciarEdicao(execucaoUm(montado), 'fim');
        expect(montado.componente.edicao()).toBeNull();
    });
});

describe('ExecucaoHistoricoPage: exclusão (gestor)', () => {
    it('a lixeira pede confirmação e só então envia DELETE /execucao/:id e recarrega a lista', async () => {
        const { montado } = await montarPagina();
        await carregar(montado, [criarExecucao(1)], 90);
        const confirmacao = montado.fixture.debugElement.injector.get(ConfirmationService);
        const confirmar = vi.spyOn(confirmacao, 'confirm');
        botaoPorRotulo(montado, 'Excluir execução')[0].click();
        expect(confirmar).toHaveBeenCalledTimes(1);
        montado.http.expectNone((r) => r.method === 'DELETE');

        confirmar.mock.calls[0][0].accept!();
        responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/execucao/1'), null);
        responderSucesso(esperarRequisicao(montado.http, 'GET', '/execucao'), pagina([]));
        await montado.atualizar();
        expect(montado.componente.execucoes()).toEqual([]);
    });

    it('o desenvolvedor não vê a lixeira', async () => {
        const { montado } = await montarPagina({ usuario: TipoUsuarioEnum.DESENVOLVEDOR });
        await carregar(montado, [criarExecucao(1)]);
        expect(botaoPorRotulo(montado, 'Excluir execução').length).toBe(0);
    });
});
