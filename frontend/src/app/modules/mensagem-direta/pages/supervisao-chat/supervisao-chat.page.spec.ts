import { describe, it, expect } from 'vitest';
import { AutorMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { SupervisaoChatPage } from './supervisao-chat.page';

// A tela do gestor para ler as conversas entre desenvolvedores (task 214): lista, leitura somente leitura, estados e a conversa privada (403).

const ANA = { usuarioId: 4, usuarioNome: 'Ana Souza', tipo: TipoUsuarioEnum.DESENVOLVEDOR };
const BRUNO = { usuarioId: 9, usuarioNome: 'Bruno Lima', tipo: TipoUsuarioEnum.DESENVOLVEDOR };

function mensagem(parcial: Record<string, unknown> = {}) {
  return {
    mensagemId: 'm1', conversaId: '4-9', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 4, texto: 'Alguém viu o bug do login?',
    contemCodigo: false, mencoes: [], referencias: [], respondeA: null, createdDate: '2026-10-21T14:00:00.000Z', ...parcial,
  };
}

const CONVERSA = { conversaId: '4-9', participantes: [ANA, BRUNO], totalMensagens: 2, ultimaMensagem: mensagem() };

async function montar() {
  return montarComponente(SupervisaoChatPage, { usuario: TipoUsuarioEnum.GESTOR });
}

function responderLista(tela: Awaited<ReturnType<typeof montar>>, conversas: unknown[] = [CONVERSA]) {
  responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/conversas'), { conversas, total: conversas.length, pagina: 1, porPagina: 20 });
}

describe('SupervisaoChatPage', () => {
  it('lista as conversas com os nomes, a prévia e o total, e pede a primeira página', async () => {
    const tela = await montar();
    const requisicao = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/conversas');
    expect(requisicao.request.params.get('pagina')).toBe('1');
    responderSucesso(requisicao, { conversas: [CONVERSA], total: 1, pagina: 1, porPagina: 20 });
    await tela.atualizar();

    expect(tela.elemento.textContent).toContain('Ana Souza e Bruno Lima');
    expect(tela.elemento.textContent).toContain('Alguém viu o bug do login?');
    expect(tela.elemento.textContent).toContain('1 conversa');
    expect(tela.elemento.textContent).toContain('Escolha uma conversa');
  });

  it('mostra o estado vazio quando não há conversas', async () => {
    const tela = await montar();
    responderLista(tela, []);
    await tela.atualizar();
    expect(tela.elemento.textContent).toContain('Nenhuma conversa ainda');
  });

  it('mostra o erro da lista e tenta de novo', async () => {
    const tela = await montar();
    responderErro(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/conversas'), 500, 'falhou');
    await tela.atualizar();
    expect(tela.elemento.textContent).toContain('Não foi possível carregar as conversas.');

    const tentar = Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button')).find((botao) => botao.textContent?.includes('Tentar de novo'))!;
    tentar.click();
    responderLista(tela);
    await tela.atualizar();
    expect(tela.elemento.textContent).toContain('Ana Souza e Bruno Lima');
  });

  it('abre a conversa em modo leitura: faixa de aviso, mensagens, linha do sistema e nenhum campo de resposta', async () => {
    const tela = await montar();
    responderLista(tela);
    await tela.atualizar();

    tela.elemento.querySelector<HTMLButtonElement>('.supervisao-chat__item')!.click();
    const abertura = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/conversa/4-9');
    expect(abertura.request.params.has('cursor')).toBe(false);
    responderSucesso(abertura, {
      conversaId: '4-9',
      participantes: [ANA, BRUNO],
      proximoCursor: null,
      participantesAvisados: true,
      mensagens: [
        mensagem({ mensagemId: 'm2', autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null, texto: 'Carla, gestor, leu esta conversa', createdDate: '2026-10-21T14:05:00.000Z' }),
        mensagem(),
      ],
    });
    await tela.atualizar();

    expect(tela.elemento.textContent).toContain('Você está lendo uma conversa entre Ana Souza e Bruno Lima; eles são avisados.');
    expect(tela.elemento.textContent).toContain('Alguém viu o bug do login?');
    expect(tela.elemento.querySelector('.supervisao-chat__sistema')?.textContent).toContain('Carla, gestor, leu esta conversa');
    expect(tela.elemento.querySelector('textarea, [contenteditable="true"], app-mensagem-direta-compositor')).toBeNull();
  });

  it('pagina as mensagens anteriores com o cursor, sem repetir as que já estão na tela', async () => {
    const tela = await montar();
    responderLista(tela);
    await tela.atualizar();
    tela.elemento.querySelector<HTMLButtonElement>('.supervisao-chat__item')!.click();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/conversa/4-9'), {
      conversaId: '4-9', participantes: [ANA, BRUNO], proximoCursor: 'c1', participantesAvisados: false,
      mensagens: [mensagem({ mensagemId: 'm2', texto: 'Mensagem nova', createdDate: '2026-10-21T15:00:00.000Z' })],
    });
    await tela.atualizar();

    const anteriores = Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button')).find((botao) => botao.textContent?.includes('Mensagens anteriores'))!;
    anteriores.click();
    const pagina = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/conversa/4-9');
    expect(pagina.request.params.get('cursor')).toBe('c1');
    responderSucesso(pagina, {
      conversaId: '4-9', participantes: [ANA, BRUNO], proximoCursor: null, participantesAvisados: false,
      mensagens: [mensagem({ mensagemId: 'm1', texto: 'Mensagem antiga' }), mensagem({ mensagemId: 'm2', texto: 'Mensagem nova', createdDate: '2026-10-21T15:00:00.000Z' })],
    });
    await tela.atualizar();

    const texto = tela.elemento.textContent ?? '';
    expect(texto).toContain('Mensagem antiga');
    expect(texto.match(/Mensagem nova/g)?.length).toBe(1);
    expect(texto).not.toContain('Mensagens anteriores');
  });

  it('conversa que ficou privada (403) mostra o aviso, sem mensagens', async () => {
    const tela = await montar();
    responderLista(tela);
    await tela.atualizar();
    tela.elemento.querySelector<HTMLButtonElement>('.supervisao-chat__item')!.click();
    responderErro(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/conversa/4-9'), 403, 'privada');
    await tela.atualizar();

    expect(tela.elemento.textContent).toContain('Conversa privada');
    expect(tela.elemento.querySelector('.supervisao-chat__mensagem')).toBeNull();
  });

  it('o filtro "Com código" e a busca refazem a lista na primeira página', async () => {
    const tela = await montar();
    responderLista(tela);
    await tela.atualizar();

    const campo = tela.elemento.querySelector<HTMLInputElement>('input[formcontrolname="busca"]')!;
    campo.value = 'login';
    campo.dispatchEvent(new Event('input'));
    await new Promise((resolver) => setTimeout(resolver, 450));

    const busca = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/conversas');
    expect(busca.request.params.get('texto')).toBe('login');
    expect(busca.request.params.get('pagina')).toBe('1');
    responderSucesso(busca, { conversas: [], total: 0, pagina: 1, porPagina: 20 });
    await tela.atualizar();
    expect(tela.elemento.textContent).toContain('Nenhuma conversa encontrada');
  });
});
