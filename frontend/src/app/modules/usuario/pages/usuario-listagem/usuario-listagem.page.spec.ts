import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TipoUsuarioEnum, UsuarioResumoDto } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { responderErro } from '../../../../../testes/http-teste';
import { criarUsuarioTeste } from '../../../../../testes/usuarios-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { UsuarioListagemPage } from './usuario-listagem.page';

// Listagem de usuários (SYSTEM.SPEC.md §14, "Gerenciar usuários"): estados da tela e ações visíveis por tipo.

type Montado = ComponenteMontado<UsuarioListagemPage>;

const ID_LOGADO = criarUsuarioTeste().id;

function resumo(id: number, sobrescrita: Partial<UsuarioResumoDto> = {}): UsuarioResumoDto {
    return {
        id, login: `user${id}`, nomeCompleto: `Pessoa ${id}`, cargoTitulo: 'Dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR,
        ativo: true, temAnotacoes: false, ...sobrescrita,
    } as UsuarioResumoDto;
}

const PAGINA = (itens: UsuarioResumoDto[]) => ({ itens, totalItens: itens.length, paginaAtual: 1, itensPorPagina: 10, totalPaginas: 1 });

async function montarListagem(tipoLogado: TipoUsuarioEnum, armazenamento?: Record<string, string>): Promise<Montado> {
    return montarComponente(UsuarioListagemPage, { usuario: tipoLogado, armazenamento });
}

/** O p-table (lazy) e o ngOnInit pedem a lista: responde todas as chamadas pendentes com a mesma página. */
async function carregar(montado: Montado, itens: UsuarioResumoDto[]): Promise<void> {
    for (const requisicao of montado.http.match((resultadoSeguinte) => resultadoSeguinte.method === 'GET' && resultadoSeguinte.url.endsWith('/usuario'))) {
        requisicao.flush({ sucesso: true, dados: PAGINA(itens), mensagem: 'ok' });
    }
    await montado.atualizar();
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const botaoPorRotulo = (montado: Montado, rotulo: string) =>
    montado.elemento.querySelector<HTMLElement>(`[aria-label="${rotulo}"]`);
const quantosBotoes = (montado: Montado, rotulo: string) => montado.elemento.querySelectorAll(`[aria-label="${rotulo}"]`).length;

describe('UsuarioListagemPage — anotações (task 195)', () => {
    const botoesDeAnotacao = (montado: Montado) => Array.from(montado.elemento.querySelectorAll<HTMLElement>('.usuario-listagem__coluna-anotacoes button'));

    it('o gestor vê o botão nas linhas de desenvolvedores e na própria, e não na de outro gestor ou administrador', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, [
            resumo(2),
            resumo(3),
            resumo(4, { tipo: TipoUsuarioEnum.GESTOR }),
            resumo(5, { tipo: TipoUsuarioEnum.ADMINISTRADOR }),
            resumo(ID_LOGADO, { tipo: TipoUsuarioEnum.GESTOR }),
        ]);
        expect(botoesDeAnotacao(montado)).toHaveLength(3);
    });

    it('o gestor abre o pad do auxiliar (que é desenvolvedor para isto)', async () => {
        const gestor = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(gestor, [resumo(2, { tipo: TipoUsuarioEnum.AUXILIAR })]);
        expect(botoesDeAnotacao(gestor)).toHaveLength(1);
    });
});

describe('UsuarioListagemPage — estados', () => {
    it('na primeira carga mostra o esqueleto; chegando os dados, mostra a tabela e o contador', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        expect(montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();

        await carregar(montado, [resumo(2), resumo(3)]);
        expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
        expect(texto(montado)).toContain('Pessoa 2');
        expect(texto(montado)).toContain('Pessoa 3');
        expect(texto(montado)).toContain('2 usuários');
    });

    it('sem usuários e sem filtro: estado vazio com o convite a criar o primeiro (gestor)', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, []);
        expect(texto(montado)).toContain('Nenhum usuário ainda');
        expect(texto(montado)).toContain('Criar o primeiro usuário');
    });

    it('sem resultado com filtro ativo: pede para limpar os filtros', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, []);
        montado.componente.aoMudarTipo(TipoUsuarioEnum.ADMINISTRADOR);
        await carregar(montado, []);
        expect(texto(montado)).toContain('Nenhum usuário corresponde aos filtros');
        expect(texto(montado)).toContain('Limpar filtros');
    });

    it('erro da API: sai do carregando, avisa por toast e fica sem linhas', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        const avisos: unknown[] = [];
        montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(mensagem));
        for (const requisicao of montado.http.match((resultadoAtual) => resultadoAtual.method === 'GET' && resultadoAtual.url.endsWith('/usuario'))) {
            responderErro(requisicao, 500, 'falha');
        }
        await montado.atualizar();
        expect(montado.componente.carregando()).toBe(false);
        expect(montado.componente.usuarios()).toEqual([]);
        expect(avisos.length).toBeGreaterThan(0);
    });

    it('o filtro de tipo vai na consulta e fica guardado para a próxima visita', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, []);
        montado.componente.aoMudarTipo(TipoUsuarioEnum.GESTOR);
        const consulta = montado.http.match((registroParcial) => registroParcial.method === 'GET' && registroParcial.url.endsWith('/usuario'));
        expect(consulta.at(-1)!.request.params.get('tipo')).toBe('GESTOR');
        expect(JSON.parse(localStorage.getItem('usuario.filtros')!)).toEqual({ tipo: 'GESTOR', ativo: null });
    });

    it('filtros guardados com valor inválido são ignorados', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR, { 'usuario.filtros': JSON.stringify({ tipo: 'CHEFE', ativo: 'XPTO' }) });
        expect(montado.componente.tipoFiltro()).toBeNull();
        expect(montado.componente.ativoFiltro()).toBeNull();
    });
});

describe('UsuarioListagemPage — ações por tipo de usuário', () => {
    it('gestor vê "Novo Usuário" e as ações de editar, senha e excluir nas linhas de outras pessoas', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, [resumo(2), resumo(3)]);
        expect(texto(montado)).toContain('Novo Usuário');
        expect(quantosBotoes(montado, 'Editar usuário')).toBe(2);
        expect(quantosBotoes(montado, 'Alterar senha')).toBe(2);
        expect(quantosBotoes(montado, 'Excluir usuário')).toBe(2);
    });

    it('gestor não gerencia administrador: a linha dele fica sem editar, senha e excluir', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, [resumo(2, { tipo: TipoUsuarioEnum.ADMINISTRADOR }), resumo(3)]);
        expect(quantosBotoes(montado, 'Editar usuário')).toBe(1);
        expect(quantosBotoes(montado, 'Excluir usuário')).toBe(1);
    });

    it('administrador gerencia a linha de outro administrador', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.ADMINISTRADOR);
        await carregar(montado, [resumo(2, { tipo: TipoUsuarioEnum.ADMINISTRADOR })]);
        expect(quantosBotoes(montado, 'Editar usuário')).toBe(1);
        expect(quantosBotoes(montado, 'Excluir usuário')).toBe(1);
    });

    it('na própria linha não há excluir, e o switch de status fica desabilitado (derrubaria a própria sessão)', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, [resumo(ID_LOGADO, { tipo: TipoUsuarioEnum.GESTOR })]);
        expect(quantosBotoes(montado, 'Excluir usuário')).toBe(0);
        expect(quantosBotoes(montado, 'Editar usuário')).toBe(1);
        expect(montado.componente.eOutraPessoa(montado.componente.usuarios()[0])).toBe(false);
    });

    it('o filtro de tipo oferece Auxiliares, e a linha do auxiliar mostra o selo "Auxiliar"', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, [resumo(2, { tipo: TipoUsuarioEnum.AUXILIAR })]);
        expect(montado.componente.tiposOpcoes.map((opcao) => opcao.label)).toEqual(['Todos', 'Desenvolvedores', 'Auxiliares', 'Gestores', 'Administradores']);
        expect(texto(montado)).toContain('Auxiliar');
    });

    it('o auxiliar não vê "Novo Usuário" nem as ações de gestão (a tela é do gestor)', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.AUXILIAR);
        await carregar(montado, [resumo(2)]);
        expect(texto(montado)).not.toContain('Novo Usuário');
        expect(quantosBotoes(montado, 'Excluir usuário')).toBe(0);
        expect(botaoPorRotulo(montado, 'Editar usuário')).toBeNull();
    });

    it('desenvolvedor não vê "Novo Usuário" nem a coluna de anotações nem ações de gestão', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.DESENVOLVEDOR);
        await carregar(montado, [resumo(2)]);
        expect(texto(montado)).not.toContain('Novo Usuário');
        expect(texto(montado)).not.toContain('Anotações');
        expect(quantosBotoes(montado, 'Excluir usuário')).toBe(0);
        expect(botaoPorRotulo(montado, 'Editar usuário')).toBeNull();
    });
});

describe('UsuarioListagemPage — a linha não tem clique', () => {
    const primeiraLinha = (montado: Montado) => montado.elemento.querySelector<HTMLElement>('.usuario-listagem__linha')!;

    it('clicar na linha não abre o Editar nem faz pedido; só o lápis edita', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, [resumo(2)]);
        const linha = primeiraLinha(montado);
        expect(linha.hasAttribute('tabindex')).toBe(false);
        linha.click();
        linha.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        montado.http.expectNone((registroLocal) => registroLocal.url.includes('/usuario/'));
        expect(botaoPorRotulo(montado, 'Editar usuário')).not.toBeNull();
    });
});

describe('UsuarioListagemPage — status e exclusão', () => {
    it('alternar status muda a linha na hora, chama PUT e oferece desfazer', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, [resumo(2)]);
        montado.componente.alternarStatus(montado.componente.usuarios()[0], false);

        expect(montado.componente.usuarios()[0].ativo).toBe(false);
        const requisicao = montado.http.expectOne((registroSelecionado) => registroSelecionado.method === 'PUT' && registroSelecionado.url.endsWith('/usuario/2'));
        expect(requisicao.request.body).toEqual({ ativo: false });
        requisicao.flush({ sucesso: true, dados: {}, mensagem: 'ok' });

        const oferta = TestBed.inject(DesfazerService).oferta();
        expect(oferta?.mensagem).toBe('Pessoa 2 inativado');
    });

    it('se o servidor recusa a troca de status, a linha volta ao valor anterior', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, [resumo(2)]);
        montado.componente.alternarStatus(montado.componente.usuarios()[0], false);
        responderErro(montado.http.expectOne((registroPrincipal) => registroPrincipal.method === 'PUT' && registroPrincipal.url.endsWith('/usuario/2')), 400, 'O sistema deve ter ao menos um administrador ativo');
        await montado.atualizar();
        expect(montado.componente.usuarios()[0].ativo).toBe(true);
    });

    it('excluir tira a linha na hora, chama DELETE e oferece desfazer que restaura', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, [resumo(2), resumo(3)]);
        montado.componente.excluir(montado.componente.usuarios()[0]);
        expect(montado.componente.usuarios().map((usuarioResumoDtoAtual) => usuarioResumoDtoAtual.id)).toEqual([3]);
        expect(montado.componente.totalRegistros()).toBe(1);

        montado.http.expectOne((registroSeguinte) => registroSeguinte.method === 'DELETE' && registroSeguinte.url.endsWith('/usuario/2')).flush({ sucesso: true, dados: null, mensagem: 'ok' });
        const oferta = TestBed.inject(DesfazerService).oferta();
        expect(oferta?.mensagem).toBe('Usuário "Pessoa 2" excluído');

        TestBed.inject(DesfazerService).executar();
        montado.http.expectOne((registroAtual) => registroAtual.method === 'PATCH' && registroAtual.url.endsWith('/usuario/2/restaurar')).flush({ sucesso: true, dados: {}, mensagem: 'ok' });
    });

    it('se o servidor recusa a exclusão, a linha e o total voltam', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, [resumo(2), resumo(3)]);
        montado.componente.excluir(montado.componente.usuarios()[0]);
        responderErro(montado.http.expectOne((registro) => registro.method === 'DELETE' && registro.url.endsWith('/usuario/2')), 400, 'O sistema deve ter ao menos um administrador ativo');
        await montado.atualizar();
        expect(montado.componente.usuarios().map((usuarioResumoDto) => usuarioResumoDto.id)).toEqual([2, 3]);
        expect(montado.componente.totalRegistros()).toBe(2);
    });
});

describe('UsuarioListagemPage — ajuda dos tipos (task 306)', () => {
    it('o botão "Tipos de usuário" abre a ajuda com os quatro tipos', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, [resumo(2)]);
        const botao = Array.from(montado.elemento.querySelectorAll<HTMLElement>('button')).find((candidato) => candidato.textContent?.includes('Tipos de usuário'));
        expect(botao).toBeTruthy();
        botao!.click();
        await montado.atualizar();
        const ajuda = document.body.querySelector('.usuario-listagem__tipos');
        expect(ajuda).not.toBeNull();
        expect(ajuda!.querySelectorAll('app-usuario-tipo-descricao')).toHaveLength(4);
        for (const rotulo of ['Desenvolvedor', 'Auxiliar', 'Gestor', 'Administrador']) expect(ajuda!.textContent).toContain(rotulo);
    });

    it('o botão "Alterar textos dos tipos" é só do administrador', async () => {
        const administrador = await montarListagem(TipoUsuarioEnum.ADMINISTRADOR);
        await carregar(administrador, [resumo(2)]);
        expect(texto(administrador)).toContain('Alterar textos dos tipos');
    });

    it('o gestor não vê "Alterar textos dos tipos" e ainda vê "Tipos de usuário"', async () => {
        const gestor = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(gestor, [resumo(2)]);
        expect(texto(gestor)).not.toContain('Alterar textos dos tipos');
        expect(texto(gestor)).toContain('Tipos de usuário');
    });

    it('ao abrir a tela pede os textos dos tipos à API', async () => {
        const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
        await carregar(montado, [resumo(2)]);
        expect(montado.http.match((requisicao) => requisicao.method === 'GET' && requisicao.url.endsWith('/tipo-usuario-ajuda'))).toHaveLength(1);
    });
});

