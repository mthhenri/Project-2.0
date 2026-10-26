import { describe, it, expect } from 'vitest';
import { PlanoAbaEnum, TipoDemandaStatusEnum, TipoPlanoPontoSituacaoEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { PlanoPublicarDialogComponent } from './plano-publicar-dialog.component';

// Publicar o plano na demanda (task 237): escolher os textos, ver o diff contra o texto atual da demanda, aba do cliente só para gestor,
// texto vazio que apagaria o da demanda só por escolha, lembrete de pontos em aberto e a recusa por versão mais nova (409).

type Montado = ComponenteMontado<PlanoPublicarDialogComponent>;

function plano(sobrescrita: Record<string, unknown> = {}) {
  return {
    id: 7, titulo: 'Plano', projetoId: 10, projetoNome: 'Projeto', demandaId: 20, demandaNome: 'Demanda de exportação', publicacaoData: null,
    criadorId: 1, criadorNome: 'Eu', isSolo: false, isArquivado: false, descricaoTecnica: 'Técnica nova', descricaoCliente: 'Cliente nova',
    documentacao: '', versao: 3, createdDate: 'a', updatedDate: 'b', ...sobrescrita,
  };
}

const DEMANDA = {
  id: 20, projetoId: 10, demandaPaiId: null, nome: 'Demanda de exportação', descricaoTecnica: 'Técnica velha', descricaoCliente: null, documentacao: 'Doc da demanda',
  horasEstimadas: 0, status: TipoDemandaStatusEnum.PLANEJADA, isEstrutural: false, previsaoFimData: null, createdDate: 'a', podeEditar: true,
};

async function abrir(usuario: TipoUsuarioEnum, dadosDoPlano = plano(), pontos: unknown[] = []): Promise<Montado> {
  const montado = await montarComponente(PlanoPublicarDialogComponent, { usuario, entradas: { plano: dadosDoPlano, visivel: true } });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/20'), DEMANDA);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano/7/ponto'), pontos);
  await montado.atualizar();
  return montado;
}

const documento = (montado: Montado) => montado.elemento.ownerDocument;
const textoDoDialogo = (montado: Montado) => documento(montado).querySelector('.p-dialog')?.textContent ?? '';
const rotulos = (montado: Montado) => Array.from(documento(montado).querySelectorAll('.plano-publicar__aba-rotulo')).map((item) => item.textContent?.trim());
const botaoPublicar = (montado: Montado) =>
  Array.from(documento(montado).querySelectorAll<HTMLButtonElement>('.p-dialog button')).find((item) => item.textContent?.trim() === 'Publicar')!;

describe('PlanoPublicarDialogComponent', () => {
  it('desenvolvedor não vê a aba do cliente; as que mudam a demanda já vêm marcadas, e a que apagaria o texto dela não', async () => {
    const montado = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);

    expect(rotulos(montado)).toEqual(['Descrição técnica', 'Documentação']);
    expect(montado.componente.marcadas().has(PlanoAbaEnum.DESCRICAO_TECNICA)).toBe(true);
    expect(montado.componente.marcadas().has(PlanoAbaEnum.DOCUMENTACAO)).toBe(false);
    expect(textoDoDialogo(montado)).toContain('Apaga o texto da demanda');
    expect(documento(montado).querySelectorAll('.diff-por-palavra').length).toBe(2);
  });

  it('gestor vê a aba do cliente; demanda sem texto mostra "Texto novo"', async () => {
    const montado = await abrir(TipoUsuarioEnum.GESTOR);
    expect(rotulos(montado)).toContain('Descrição do cliente');
    expect(textoDoDialogo(montado)).toContain('Texto novo');
  });

  it('publica só as abas marcadas, com a versão lida, e fecha avisando quem abriu', async () => {
    const montado = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    const publicados: unknown[] = [];
    montado.componente.publicado.subscribe((resposta) => publicados.push(resposta));

    botaoPublicar(montado).click();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/plano/7/publicacao');
    expect(requisicao.request.body).toEqual({ versao: 3, abas: [PlanoAbaEnum.DESCRICAO_TECNICA] });
    responderSucesso(requisicao, { id: 7, demandaId: 20, publicacaoData: '2026-10-26T12:00:00.000Z', abasPublicadas: [PlanoAbaEnum.DESCRICAO_TECNICA], trechosPendentes: 1 });
    await montado.atualizar();

    expect(publicados.length).toBe(1);
    expect(montado.componente.visivel()).toBe(false);
  });

  it('apagar o texto da demanda só vai na publicação quando a pessoa marca a aba (abasParaApagar)', async () => {
    const montado = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    montado.componente.alternar(PlanoAbaEnum.DOCUMENTACAO, true);
    await montado.atualizar();

    botaoPublicar(montado).click();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/plano/7/publicacao');
    expect(requisicao.request.body).toEqual({
      versao: 3,
      abas: [PlanoAbaEnum.DESCRICAO_TECNICA, PlanoAbaEnum.DOCUMENTACAO],
      abasParaApagar: [PlanoAbaEnum.DOCUMENTACAO],
    });
    responderErro(requisicao, 400, 'recusado no teste');
  });

  it('textos iguais aos da demanda: avisa que não há o que publicar e desabilita o Publicar', async () => {
    const montado = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, plano({ descricaoTecnica: 'Técnica velha', documentacao: 'Doc da demanda' }));
    expect(montado.componente.nenhumaMudanca()).toBe(true);
    expect(textoDoDialogo(montado)).toContain('Não há nada para publicar');
    expect(botaoPublicar(montado).disabled).toBe(true);
  });

  it('lembra dos pontos ainda abertos, sem impedir a publicação', async () => {
    const aberto = { id: 1, planoId: 7, rotulo: 'PERGUNTA', texto: 'Qual formato?', situacao: TipoPlanoPontoSituacaoEnum.ABERTO, resolucaoTexto: null, createdDate: 'a', updatedDate: 'b' };
    const resolvido = { ...aberto, id: 2, situacao: TipoPlanoPontoSituacaoEnum.RESOLVIDO };
    const montado = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, plano(), [aberto, resolvido]);

    expect(textoDoDialogo(montado)).toContain('Ainda há 1 ponto em aberto');
    expect(botaoPublicar(montado).disabled).toBe(false);
  });

  it('plano alterado depois do diff (409): mostra o erro e pede ao documento para recarregar', async () => {
    const montado = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    let recargas = 0;
    montado.componente.desatualizado.subscribe(() => recargas++);

    botaoPublicar(montado).click();
    responderErro(esperarRequisicao(montado.http, 'POST', '/plano/7/publicacao'), 409, 'O plano foi alterado depois de você ver a diferença.');
    await montado.atualizar();

    expect(recargas).toBe(1);
    expect(textoDoDialogo(montado)).toContain('O plano foi alterado depois');
    expect(montado.componente.visivel()).toBe(true);
  });
});
