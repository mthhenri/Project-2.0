import { describe, expect, it, vi } from 'vitest';
import { DemandaDocumentacaoResumoDto, TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { DocumentacaoSeletorComponent } from './documentacao-seletor.component';

// O seletor da demanda da tela de Documentações (task 259): botão, popover com busca e árvore, destaque, marcas e escolha.

function demanda(id: number, nome: string, sobrescrita: Partial<DemandaDocumentacaoResumoDto> = {}): DemandaDocumentacaoResumoDto {
  return {
    id, projetoId: 1, projetoNome: 'Portal', demandaPaiId: null, nome, caminho: nome, status: TipoDemandaStatusEnum.PLANEJADA,
    temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, emExecucao: false, podeEditar: true, ...sobrescrita,
  };
}

const DEMANDAS = [
  demanda(1, 'Autenticação', { temDescricaoTecnica: true }),
  demanda(2, 'Tela de login', { demandaPaiId: 1, caminho: 'Autenticação › Tela de login', emExecucao: true }),
  demanda(3, 'Relatórios', { projetoId: 2, projetoNome: 'Financeiro' }),
];

async function montar(entradas: Record<string, unknown> = {}) {
  return montarComponente(DocumentacaoSeletorComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { demandas: DEMANDAS, ...entradas } });
}

async function abrir(montado: Awaited<ReturnType<typeof montar>>) {
  montado.elemento.querySelector<HTMLButtonElement>('.documentacao-seletor__gatilho')!.click();
  await montado.atualizar();
}

const nomes = () => Array.from(document.body.querySelectorAll('.documentacao-seletor__painel .documentacao-seletor__nome')).map((no) => no.textContent?.trim());
const projetos = () => Array.from(document.body.querySelectorAll('.documentacao-seletor__painel .documentacao-seletor__projeto')).map((no) => no.textContent?.trim());

describe('DocumentacaoSeletorComponent', () => {
  it('sem demanda escolhida o botão convida a escolher', async () => {
    const vazio = await montar();
    expect(vazio.elemento.querySelector('.documentacao-seletor__gatilho')?.textContent).toContain('Escolher demanda');
  });

  it('com demanda escolhida o botão mostra o nome, o caminho e "Rodando"', async () => {
    const escolhida = await montar({ escolhidaId: 2 });
    const gatilho = escolhida.elemento.querySelector('.documentacao-seletor__gatilho')?.textContent ?? '';
    expect(gatilho).toContain('Tela de login');
    expect(gatilho).toContain('Portal › Autenticação');
    expect(gatilho).toContain('Rodando');
  });

  it('abre o popover com os projetos e as demandas raiz; as filhas ficam recolhidas até abrir a mãe', async () => {
    const montado = await montar();
    await abrir(montado);
    expect(projetos()).toEqual(['Portal', 'Financeiro']);
    expect(nomes()).toEqual(['Autenticação', 'Relatórios']);

    document.body.querySelector<HTMLButtonElement>('[aria-label="Expandir Autenticação"]')!.click();
    await montado.atualizar();
    expect(nomes()).toEqual(['Autenticação', 'Tela de login', 'Relatórios']);
  });

  it('o caminho da demanda escolhida já vem aberto', async () => {
    const montado = await montar({ escolhidaId: 2 });
    await abrir(montado);
    expect(nomes()).toEqual(['Autenticação', 'Tela de login', 'Relatórios']);
  });

  it('a busca ignora acento e caixa, destaca o termo e mantém os ancestrais', async () => {
    const montado = await montar();
    await abrir(montado);
    montado.componente.controleBusca.setValue('LOGIN');
    await montado.atualizar();
    expect(nomes()).toEqual(['Autenticação', 'Tela de login']);
    expect(projetos()).toEqual(['Portal']);
    expect(document.body.querySelector('.documentacao-seletor__nome mark')?.textContent).toBe('login');
  });

  it('busca sem resultado mostra a mensagem com "Limpar busca", que traz tudo de volta', async () => {
    const montado = await montar();
    await abrir(montado);
    montado.componente.controleBusca.setValue('zzz');
    await montado.atualizar();
    expect(document.body.textContent).toContain('Nenhuma demanda encontrada');

    Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.includes('Limpar busca'))!.click();
    await montado.atualizar();
    expect(nomes()).toEqual(['Autenticação', 'Relatórios']);
  });

  it('escolher emite o id e fecha o popover', async () => {
    const montado = await montar();
    const escolheu = vi.fn();
    montado.componente.escolheu.subscribe(escolheu);
    await abrir(montado);
    Array.from(document.body.querySelectorAll<HTMLButtonElement>('.documentacao-seletor__demanda')).find((item) => item.textContent?.includes('Relatórios'))!.click();
    await montado.atualizar();
    expect(escolheu).toHaveBeenCalledWith(3);
  });

  it('carregando mostra o esqueleto no popover', async () => {
    const carregando = await montar({ demandas: [], carregando: true });
    await abrir(carregando);
    expect(document.body.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('erro oferece tentar de novo', async () => {
    const erro = await montar({ demandas: [], erro: true });
    const recarregar = vi.fn();
    erro.componente.recarregar.subscribe(recarregar);
    await abrir(erro);
    expect(document.body.textContent).toContain('Não foi possível carregar as demandas');
    Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.includes('Tentar de novo'))!.click();
    expect(recarregar).toHaveBeenCalled();
  });
});
