import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { TagListagemPage } from './tag-listagem.page';

// Completa a spec de referência da listagem (task 172): quick-add (validação), cor inline, edição, exclusão com
// "Desfazer", seleção em lote e criar a partir da busca. A página só existe para o gestor (rota com gestorGuard).

const TAGS = [
  { id: 1, nome: 'Backend', cor: '#112233' },
  { id: 2, nome: 'Frontend', cor: '#445566' },
  { id: 3, nome: 'Infra', cor: '#778899' },
];

type Montado = ComponenteMontado<TagListagemPage>;

const textoDaPagina = (montado: Montado) => montado.elemento.textContent ?? '';
const porRotulo = (montado: Montado, rotulo: string) =>
  montado.elemento.querySelector<HTMLElement>(`[aria-label="${rotulo}"]`)!;
const nomes = (montado: Montado) => montado.componente.tags().map((tag) => tag.nome);

async function digitar(montado: Montado, rotulo: string, texto: string) {
  const entrada = porRotulo(montado, rotulo) as HTMLInputElement;
  entrada.value = texto;
  entrada.dispatchEvent(new Event('input'));
  await montado.atualizar();
}

async function montarCarregada(): Promise<Montado> {
  const montado = await montarComponente(TagListagemPage, { usuario: TipoUsuarioEnum.GESTOR });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), TAGS);
  await montado.atualizar();
  return montado;
}

describe('TagListagemPage — quick-add (validação)', () => {
  it('o botão Adicionar fica desabilitado com o campo vazio ou com nome repetido', async () => {
    const montado = await montarCarregada();
    const adicionar = () => Array.from(montado.elemento.querySelectorAll('button')).find((b) => b.textContent?.includes('Adicionar'))!;
    expect(adicionar().disabled).toBe(true);

    await digitar(montado, 'Nome da nova tag', 'Nova');
    expect(adicionar().disabled).toBe(false);

    await digitar(montado, 'Nome da nova tag', 'FRONTEND');
    expect(adicionar().disabled).toBe(true);
  });

  it('a duplicidade ignora caixa e acento', async () => {
    const montado = await montarCarregada();
    await digitar(montado, 'Nome da nova tag', 'bàckend');
    expect(textoDaPagina(montado)).toContain('Já existe uma tag com esse nome.');
  });

  it('nome só com espaços não envia nada', async () => {
    const montado = await montarCarregada();
    await digitar(montado, 'Nome da nova tag', '   ');
    montado.componente.adicionar();
    await montado.atualizar();
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
  });

  it('nome com caractere proibido mostra o aviso e não envia', async () => {
    const montado = await montarCarregada();
    montado.componente.campoRapidoControle.setValue('Tag~ruim');
    montado.componente.adicionar();
    await montado.atualizar();

    expect(montado.componente.erroRapido()).toBe(montado.componente.mensagemCaracteresProibidos);
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
  });

  it('a tag recém-digitada fica sem ação (id temporário) até o servidor responder', async () => {
    const montado = await montarCarregada();
    await digitar(montado, 'Nome da nova tag', 'Nova');
    montado.componente.adicionar();
    await montado.atualizar();

    const temporaria = montado.componente.tags().find((tag) => tag.nome === 'Nova')!;
    expect(montado.componente.eTemporaria(temporaria)).toBe(true);
    expect((porRotulo(montado, 'Editar Nova') as HTMLButtonElement).disabled).toBe(true);
    expect((porRotulo(montado, 'Trocar a cor de Nova') as HTMLButtonElement).disabled).toBe(true);
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/tag'), { id: 9, nome: 'Nova', cor: temporaria.cor, createdDate: '2026-01-15' }, 201);
  });
});

describe('TagListagemPage — criar a partir da busca', () => {
  it('"Criar tag" leva o termo ao quick-add e limpa a busca', async () => {
    const montado = await montarCarregada();
    await digitar(montado, 'Buscar tag', 'zzz');

    montado.componente.criarDoTermo();
    await montado.atualizar();

    expect(montado.componente.campoBuscaControle.value).toBe('');
    expect((porRotulo(montado, 'Nome da nova tag') as HTMLInputElement).value).toBe('zzz');
    expect(nomes(montado)).toEqual(['Backend', 'Frontend', 'Infra']);
  });
});

describe('TagListagemPage — cor inline', () => {
  async function abrirPaletaDe(montado: Montado, nomeDaTag: string) {
    porRotulo(montado, `Trocar a cor de ${nomeDaTag}`).click();
    await montado.atualizar();
  }

  it('escolher uma cor da paleta aplica na hora, faz PUT só com a cor e fecha', async () => {
    const montado = await montarCarregada();
    await abrirPaletaDe(montado, 'Backend');

    montado.componente.aoEscolherCor('#ef4444');
    expect(montado.componente.tags().find((tag) => tag.id === 1)!.cor).toBe('#ef4444');

    const requisicao = esperarRequisicao(montado.http, 'PUT', '/tag/1');
    expect(requisicao.request.body).toEqual({ cor: '#ef4444' });
    responderSucesso(requisicao, { id: 1, nome: 'Backend', cor: '#ef4444', createdDate: '2026-01-15' });
    await montado.atualizar();
    expect(montado.componente.tags().find((tag) => tag.id === 1)!.cor).toBe('#ef4444');
  });

  it('falha no PUT devolve a cor anterior', async () => {
    const montado = await montarCarregada();
    await abrirPaletaDe(montado, 'Backend');
    montado.componente.aoEscolherCor('#ef4444');

    responderErro(esperarRequisicao(montado.http, 'PUT', '/tag/1'), 500, 'falha');
    await montado.atualizar();
    expect(montado.componente.tags().find((tag) => tag.id === 1)!.cor).toBe('#112233');
  });

  it('escolher a mesma cor não chama o backend', async () => {
    const montado = await montarCarregada();
    await abrirPaletaDe(montado, 'Backend');
    montado.componente.aoEscolherCor('#112233');
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });

  it('cor personalizada (fora da paleta) só é aplicada ao fechar o popover', async () => {
    const montado = await montarCarregada();
    await abrirPaletaDe(montado, 'Backend');

    montado.componente.aoEscolherCor('#010203');
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');

    montado.componente.aoFecharPaleta();
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/tag/1');
    expect(requisicao.request.body).toEqual({ cor: '#010203' });
    responderSucesso(requisicao, { id: 1, nome: 'Backend', cor: '#010203', createdDate: '2026-01-15' });
  });

  it('a cor do swatch do quick-add muda a cor da próxima tag, sem chamar o backend', async () => {
    const montado = await montarCarregada();
    porRotulo(montado, 'Escolher a cor da nova tag').click();
    await montado.atualizar();

    montado.componente.aoEscolherCor('#22c55e');
    expect(montado.componente.corNova()).toBe('#22c55e');
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });
});

describe('TagListagemPage — edição do nome na linha (task 282)', () => {
  async function editarNome(montado: Montado, rotulo: string, texto: string) {
    porRotulo(montado, rotulo).click();
    await montado.atualizar();
    const campo = montado.elemento.querySelector<HTMLInputElement>('.tag-listagem__nome-edicao')!;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    await montado.atualizar();
    return campo;
  }

  it('clicar no nome troca o pill por um campo com o nome atual; não existe mais o dialog de edição', async () => {
    const montado = await montarCarregada();
    porRotulo(montado, 'Editar Backend').click();
    await montado.atualizar();

    const campo = montado.elemento.querySelector<HTMLInputElement>('.tag-listagem__nome-edicao')!;
    expect(campo.value).toBe('Backend');
    expect(document.body.textContent).not.toContain('Editar Tag');
  });

  it('Enter salva: o nome muda na hora, a lista mantém a ordem por nome e faz PUT só com o nome', async () => {
    const montado = await montarCarregada();
    const campo = await editarNome(montado, 'Editar Backend', 'Zeta');
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await montado.atualizar();

    expect(nomes(montado)).toEqual(['Frontend', 'Infra', 'Zeta']);
    const requisicao = esperarRequisicao(montado.http, 'PUT', '/tag/1');
    expect(requisicao.request.body).toEqual({ nome: 'Zeta' });
    responderSucesso(requisicao, { id: 1, nome: 'Zeta', cor: '#112233', createdDate: '2026-01-15' });
    await montado.atualizar();
    expect(montado.elemento.querySelector('.tag-listagem__nome-edicao')).toBeNull();
  });

  it('Esc cancela sem pedido; sair do campo com o mesmo nome também não pede nada', async () => {
    const montado = await montarCarregada();
    const campo = await editarNome(montado, 'Editar Backend', 'Zeta');
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await montado.atualizar();
    expect(nomes(montado)).toEqual(['Backend', 'Frontend', 'Infra']);

    porRotulo(montado, 'Editar Backend').click();
    await montado.atualizar();
    montado.elemento.querySelector<HTMLInputElement>('.tag-listagem__nome-edicao')!.dispatchEvent(new Event('blur'));
    await montado.atualizar();
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
  });

  it('sair do campo com um nome novo e válido salva', async () => {
    const montado = await montarCarregada();
    const campo = await editarNome(montado, 'Editar Infra', 'Infra e nuvem');
    campo.dispatchEvent(new Event('blur'));
    await montado.atualizar();
    expect(esperarRequisicao(montado.http, 'PUT', '/tag/3').request.body).toEqual({ nome: 'Infra e nuvem' });
  });

  it('nome vazio ou repetido não salva e mostra o motivo na linha', async () => {
    const montado = await montarCarregada();
    let campo = await editarNome(montado, 'Editar Backend', '   ');
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await montado.atualizar();
    expect(textoDaPagina(montado)).toContain('Nome é obrigatório');

    campo = await editarNome(montado, 'Nome de Backend', 'FRONTEND');
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await montado.atualizar();
    expect(textoDaPagina(montado)).toContain('Já existe uma tag com esse nome.');
    montado.http.expectNone((requisicao) => requisicao.method === 'PUT');
    expect(montado.componente.tagEmEdicaoDeNome()).toBe(1);
  });

  it('se o servidor recusa, o nome volta ao anterior', async () => {
    const montado = await montarCarregada();
    const campo = await editarNome(montado, 'Editar Backend', 'Zeta');
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await montado.atualizar();
    responderErro(esperarRequisicao(montado.http, 'PUT', '/tag/1'), 400, 'Nome já usado', ['Nome já usado']);
    await montado.atualizar();
    expect(nomes(montado)).toEqual(['Backend', 'Frontend', 'Infra']);
  });
});

describe('TagListagemPage — exclusão', () => {
  it('excluir tira a tag na hora, faz DELETE e oferece "Desfazer"', async () => {
    const montado = await montarCarregada();
    montado.componente.excluir(TAGS[0]);
    await montado.atualizar();
    expect(nomes(montado)).toEqual(['Frontend', 'Infra']);

    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/tag/1'), null);
    expect(TestBed.inject(DesfazerService).oferta()?.mensagem).toBe('Tag "Backend" excluída');
  });

  it('"Desfazer" faz PATCH em restaurar e devolve a tag à lista na ordem certa', async () => {
    const montado = await montarCarregada();
    montado.componente.excluir(TAGS[0]);
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/tag/1'), null);

    TestBed.inject(DesfazerService).executar();
    responderSucesso(esperarRequisicao(montado.http, 'PATCH', '/tag/1/restaurar'), TAGS[0]);
    await montado.atualizar();

    expect(nomes(montado)).toEqual(['Backend', 'Frontend', 'Infra']);
    expect(TestBed.inject(DesfazerService).oferta()).toBeNull();
  });

  it('falha no DELETE devolve a tag à lista e não oferece "Desfazer"', async () => {
    const montado = await montarCarregada();
    montado.componente.excluir(TAGS[1]);
    expect(nomes(montado)).toEqual(['Backend', 'Infra']);

    responderErro(esperarRequisicao(montado.http, 'DELETE', '/tag/2'), 500, 'falha');
    await montado.atualizar();

    expect(nomes(montado)).toEqual(['Backend', 'Frontend', 'Infra']);
    expect(TestBed.inject(DesfazerService).oferta()).toBeNull();
  });

  it('o botão de excluir do cartão chama a exclusão da tag certa', async () => {
    const montado = await montarCarregada();
    const botoes = Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('[aria-label="Excluir tag"]'));
    expect(botoes).toHaveLength(3);
    botoes[2].click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/tag/3'), null);
    expect(nomes(montado)).toEqual(['Backend', 'Frontend']);
  });
});

describe('TagListagemPage — seleção em lote', () => {
  it('marcar tags mostra a barra com a contagem; limpar esconde', async () => {
    const montado = await montarCarregada();
    montado.componente.alternarSelecao(TAGS[0], true);
    montado.componente.alternarSelecao(TAGS[1], true);
    await montado.atualizar();
    expect(textoDaPagina(montado)).toContain('2 selecionadas');

    montado.componente.limparSelecao();
    await montado.atualizar();
    expect(textoDaPagina(montado)).not.toContain('selecionadas');
  });

  it('excluir selecionadas apaga cada uma, com um único "Desfazer" que restaura todas', async () => {
    const montado = await montarCarregada();
    montado.componente.alternarSelecao(TAGS[0], true);
    montado.componente.alternarSelecao(TAGS[2], true);
    montado.componente.excluirSelecionadas();
    await montado.atualizar();
    expect(nomes(montado)).toEqual(['Frontend']);
    expect(montado.componente.selecionadas().size).toBe(0);

    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/tag/1'), null);
    responderSucesso(esperarRequisicao(montado.http, 'DELETE', '/tag/3'), null);
    expect(TestBed.inject(DesfazerService).oferta()?.mensagem).toBe('2 tags excluídas');

    TestBed.inject(DesfazerService).executar();
    responderSucesso(esperarRequisicao(montado.http, 'PATCH', '/tag/1/restaurar'), TAGS[0]);
    responderSucesso(esperarRequisicao(montado.http, 'PATCH', '/tag/3/restaurar'), TAGS[2]);
    await montado.atualizar();
    expect(nomes(montado)).toEqual(['Backend', 'Frontend', 'Infra']);
  });

  it('falha em lote recarrega a lista do servidor', async () => {
    const montado = await montarCarregada();
    montado.componente.alternarSelecao(TAGS[0], true);
    montado.componente.alternarSelecao(TAGS[1], true);
    montado.componente.excluirSelecionadas();

    responderErro(esperarRequisicao(montado.http, 'DELETE', '/tag/1'), 500, 'falha');
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), TAGS);
    await montado.atualizar();

    expect(nomes(montado)).toEqual(['Backend', 'Frontend', 'Infra']);
  });

  it('sem nenhuma selecionada, excluir selecionadas não faz nada', async () => {
    const montado = await montarCarregada();
    montado.componente.excluirSelecionadas();
    montado.http.expectNone((requisicao) => requisicao.method === 'DELETE');
    expect(nomes(montado)).toHaveLength(3);
  });
});
