import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { TagListagemPage } from './tag-listagem.page';

// Componente de referência (task 172): listagem (carregando, vazio, cheio, erro) e quick-add (validação,
// envio e erro do backend). Consulta por texto e por aria-label, nunca por classe interna do PrimeNG.

const TAGS = [
  { id: 1, nome: 'Backend', cor: '#112233' },
  { id: 2, nome: 'Frontend', cor: '#445566' },
];

type Montado = ComponenteMontado<TagListagemPage>;

const textoDaPagina = (montado: Montado) => montado.elemento.textContent ?? '';
const campo = (montado: Montado, rotulo: string) =>
  montado.elemento.querySelector<HTMLInputElement>(`[aria-label="${rotulo}"]`)!;

async function digitar(montado: Montado, rotulo: string, texto: string) {
  const entrada = campo(montado, rotulo);
  entrada.value = texto;
  entrada.dispatchEvent(new Event('input'));
  await montado.atualizar();
}

async function apertarEnter(montado: Montado, rotulo: string) {
  campo(montado, rotulo).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  await montado.atualizar();
}

async function montarListagem(): Promise<Montado> {
  return montarComponente(TagListagemPage, { usuario: TipoUsuarioEnum.GESTOR });
}

async function montarComListaCarregada(): Promise<Montado> {
  const montado = await montarListagem();
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), TAGS);
  await montado.atualizar();
  return montado;
}

describe('TagListagemPage — listagem', () => {
  it('mostra o esqueleto enquanto carrega e a lista quando chega', async () => {
    const montado = await montarListagem();
    expect(montado.elemento.querySelector('app-skeleton-lista')).not.toBeNull();

    responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), TAGS);
    await montado.atualizar();

    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(textoDaPagina(montado)).toContain('Backend');
    expect(textoDaPagina(montado)).toContain('Frontend');
    expect(textoDaPagina(montado)).toContain('2 tags');
    montado.http.verify();
  });

  it('mostra o estado vazio quando não há tags', async () => {
    const montado = await montarListagem();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), []);
    await montado.atualizar();

    expect(textoDaPagina(montado)).toContain('Nenhuma tag ainda');
    montado.http.verify();
  });

  it('em erro da API sai do carregamento, avisa por toast e fica no estado vazio', async () => {
    const montado = await montarListagem();
    const avisos: unknown[] = [];
    montado.mensagens.messageObserver.subscribe((mensagem) => avisos.push(mensagem));

    responderErro(esperarRequisicao(montado.http, 'GET', '/tag'), 500, 'falha');
    await montado.atualizar();

    expect(montado.elemento.querySelector('app-skeleton-lista')).toBeNull();
    expect(textoDaPagina(montado)).toContain('Nenhuma tag ainda');
    expect(avisos).toHaveLength(1);
    montado.http.verify();
  });

  it('a busca filtra a lista e, sem resultado, oferece criar a tag do termo', async () => {
    const montado = await montarComListaCarregada();

    await digitar(montado, 'Buscar tag', 'front');
    expect(textoDaPagina(montado)).toContain('Frontend');
    expect(textoDaPagina(montado)).not.toContain('Backend');

    await digitar(montado, 'Buscar tag', 'zzz');
    expect(textoDaPagina(montado)).toContain('Nenhuma tag corresponde a "zzz"');
    expect(textoDaPagina(montado)).toContain('Criar tag "zzz"');
  });
});

describe('TagListagemPage — quick-add', () => {
  it('Enter envia o nome, mostra a tag na hora e a reconcilia com a resposta', async () => {
    const montado = await montarComListaCarregada();
    await digitar(montado, 'Nome da nova tag', 'Infra');
    await apertarEnter(montado, 'Nome da nova tag');

    expect(textoDaPagina(montado)).toContain('Infra');
    const requisicao = esperarRequisicao(montado.http, 'POST', '/tag');
    expect(requisicao.request.body.nome).toBe('Infra');
    expect(requisicao.request.body.cor).toMatch(/^#[0-9a-fA-F]{6}$/);

    responderSucesso(requisicao, { id: 9, nome: 'Infra', cor: requisicao.request.body.cor, createdDate: '2026-01-15' }, 201);
    await montado.atualizar();

    expect(montado.componente.tags().map((tag) => tag.id)).toContain(9);
    expect(montado.componente.tags().every((tag) => tag.id > 0)).toBe(true);
    montado.http.verify();
  });

  it('recusa nome repetido sem chamar o backend', async () => {
    const montado = await montarComListaCarregada();
    await digitar(montado, 'Nome da nova tag', 'backend');

    expect(textoDaPagina(montado)).toContain('Já existe uma tag com esse nome.');
    await apertarEnter(montado, 'Nome da nova tag');
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
  });

  it('erro do backend: a tag some, o texto volta ao campo e o motivo aparece', async () => {
    const montado = await montarComListaCarregada();
    await digitar(montado, 'Nome da nova tag', 'Infra');
    await apertarEnter(montado, 'Nome da nova tag');

    responderErro(esperarRequisicao(montado.http, 'POST', '/tag'), 400, 'Tag duplicada', ['Já existe uma tag com esse nome']);
    await montado.atualizar();

    expect(montado.componente.tags().map((tag) => tag.nome)).not.toContain('Infra');
    expect(campo(montado, 'Nome da nova tag').value).toBe('Infra');
    expect(textoDaPagina(montado)).toContain('Já existe uma tag com esse nome');
  });
});
