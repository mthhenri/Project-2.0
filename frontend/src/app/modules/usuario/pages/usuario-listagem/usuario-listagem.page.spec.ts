import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum, UsuarioResumoDto } from '@project20/shared';
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
    status: TipoUsuarioStatusEnum.ATIVO, temAnotacoes: false, ...sobrescrita,
  } as UsuarioResumoDto;
}

const PAGINA = (itens: UsuarioResumoDto[]) => ({ itens, totalItens: itens.length, paginaAtual: 1, itensPorPagina: 10, totalPaginas: 1 });

async function montarListagem(tipoLogado: TipoUsuarioEnum, armazenamento?: Record<string, string>): Promise<Montado> {
  return montarComponente(UsuarioListagemPage, { usuario: tipoLogado, armazenamento });
}

/** O p-table (lazy) e o ngOnInit pedem a lista: responde todas as chamadas pendentes com a mesma página. */
async function carregar(montado: Montado, itens: UsuarioResumoDto[]): Promise<void> {
  for (const requisicao of montado.http.match((r) => r.method === 'GET' && r.url.endsWith('/usuario'))) {
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
    for (const requisicao of montado.http.match((r) => r.method === 'GET' && r.url.endsWith('/usuario'))) {
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
    const consulta = montado.http.match((r) => r.method === 'GET' && r.url.endsWith('/usuario'));
    expect(consulta.at(-1)!.request.params.get('tipo')).toBe('GESTOR');
    expect(JSON.parse(localStorage.getItem('usuario.filtros')!)).toEqual({ tipo: 'GESTOR', status: null });
  });

  it('filtros guardados com valor inválido são ignorados', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR, { 'usuario.filtros': JSON.stringify({ tipo: 'CHEFE', status: 'XPTO' }) });
    expect(montado.componente.tipoFiltro()).toBeNull();
    expect(montado.componente.statusFiltro()).toBeNull();
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

  it('desenvolvedor não vê "Novo Usuário" nem a coluna de anotações nem ações de gestão', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregar(montado, [resumo(2)]);
    expect(texto(montado)).not.toContain('Novo Usuário');
    expect(texto(montado)).not.toContain('Anotações');
    expect(quantosBotoes(montado, 'Excluir usuário')).toBe(0);
    expect(botaoPorRotulo(montado, 'Editar usuário')).toBeNull();
  });
});

describe('UsuarioListagemPage — clique na linha (task 280)', () => {
  const primeiraLinha = (montado: Montado) => montado.elemento.querySelector<HTMLElement>('.usuario-listagem__linha')!;

  it('o gestor clica na linha e abre o Editar daquela pessoa (não existe mais o perfil em leitura)', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, [resumo(2)]);
    expect(primeiraLinha(montado).classList.contains('usuario-listagem__linha--editavel')).toBe(true);
    primeiraLinha(montado).click();
    expect(montado.http.expectOne((r) => r.method === 'GET' && r.url.endsWith('/usuario/2')).request.method).toBe('GET');
  });

  it('o desenvolvedor só abre a própria linha; a de outra pessoa não é clicável nem faz pedido', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.DESENVOLVEDOR);
    await carregar(montado, [resumo(2)]);
    const linha = primeiraLinha(montado);
    expect(linha.classList.contains('usuario-listagem__linha--editavel')).toBe(false);
    expect(linha.hasAttribute('tabindex')).toBe(false);
    linha.click();
    montado.http.expectNone((r) => r.url.includes('/usuario/'));
  });
});

describe('UsuarioListagemPage — status e exclusão', () => {
  it('alternar status muda a linha na hora, chama PUT e oferece desfazer', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, [resumo(2)]);
    montado.componente.alternarStatus(montado.componente.usuarios()[0], false);

    expect(montado.componente.usuarios()[0].status).toBe(TipoUsuarioStatusEnum.INATIVO);
    const requisicao = montado.http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/usuario/2'));
    expect(requisicao.request.body).toEqual({ status: TipoUsuarioStatusEnum.INATIVO });
    requisicao.flush({ sucesso: true, dados: {}, mensagem: 'ok' });

    const oferta = TestBed.inject(DesfazerService).oferta();
    expect(oferta?.mensagem).toBe('Pessoa 2 inativado');
  });

  it('se o servidor recusa a troca de status, a linha volta ao valor anterior', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, [resumo(2)]);
    montado.componente.alternarStatus(montado.componente.usuarios()[0], false);
    responderErro(montado.http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/usuario/2')), 400, 'O sistema deve ter ao menos um administrador ativo');
    await montado.atualizar();
    expect(montado.componente.usuarios()[0].status).toBe(TipoUsuarioStatusEnum.ATIVO);
  });

  it('excluir tira a linha na hora, chama DELETE e oferece desfazer que restaura', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, [resumo(2), resumo(3)]);
    montado.componente.excluir(montado.componente.usuarios()[0]);
    expect(montado.componente.usuarios().map((u) => u.id)).toEqual([3]);
    expect(montado.componente.totalRegistros()).toBe(1);

    montado.http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/usuario/2')).flush({ sucesso: true, dados: null, mensagem: 'ok' });
    const oferta = TestBed.inject(DesfazerService).oferta();
    expect(oferta?.mensagem).toBe('Usuário "Pessoa 2" excluído');

    TestBed.inject(DesfazerService).executar();
    montado.http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/usuario/2/restaurar')).flush({ sucesso: true, dados: {}, mensagem: 'ok' });
  });

  it('se o servidor recusa a exclusão, a linha e o total voltam', async () => {
    const montado = await montarListagem(TipoUsuarioEnum.GESTOR);
    await carregar(montado, [resumo(2), resumo(3)]);
    montado.componente.excluir(montado.componente.usuarios()[0]);
    responderErro(montado.http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/usuario/2')), 400, 'O sistema deve ter ao menos um administrador ativo');
    await montado.atualizar();
    expect(montado.componente.usuarios().map((u) => u.id)).toEqual([2, 3]);
    expect(montado.componente.totalRegistros()).toBe(2);
  });
});
