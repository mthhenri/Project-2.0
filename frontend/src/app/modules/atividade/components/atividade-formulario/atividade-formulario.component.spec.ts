import { describe, it, expect } from 'vitest';
import { TipoAtividadePrioridadeEnum, TipoAtividadeStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { AtividadeFormularioComponent } from './atividade-formulario.component';

// Formulário de nova atividade (task 105): o gestor também escolhe o responsável; o desenvolvedor sempre cria para si (o corpo nunca leva
// usuarioId). A demanda é obrigatória e vem só das demandas atribuídas ao usuário.

type Montado = ComponenteMontado<AtividadeFormularioComponent>;

const DEMANDAS = [
  { id: 10, nome: 'Login', projetoId: 3, nomeProjeto: 'Portal' },
  { id: 11, nome: 'Relatório', projetoId: 3, nomeProjeto: 'Portal' },
];
const TAGS = [{ id: 1, nome: 'Backend', cor: '#112233' }, { id: 2, nome: 'Frontend', cor: '#445566' }];
const PRIORIDADES = [{ codigo: TipoAtividadePrioridadeEnum.INDEFINIDA, descricao: 'Indefinida', ordem: 5, cor: '#999999' }];
const USUARIOS = [{ id: 2, nomeCompleto: 'Ana', login: 'ana', cargoTitulo: 'Dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: 'ATIVO' }];

async function abrir(tipo: TipoUsuarioEnum, entradas: Record<string, unknown> = {}) {
  const montado = await montarComponente(AtividadeFormularioComponent, { usuario: tipo, entradas });
  const criadas: Array<{ id: number; criarOutra: boolean }> = [];
  montado.componente.criada.subscribe((criada) => criadas.push(criada));
  return { montado, criadas };
}

/** Responde às leituras que o formulário faz ao abrir; a lista de usuários só existe para o gestor. */
async function responderAbertura(montado: Montado, gestor: boolean): Promise<void> {
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), PRIORIDADES);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/atribuidas'), DEMANDAS);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), TAGS);
  if (gestor) responderSucesso(esperarRequisicao(montado.http, 'GET', '/usuario'), { itens: USUARIOS, totalItens: 1, paginaAtual: 1, itensPorPagina: 100, totalPaginas: 1 });
  await montado.atualizar();
}

describe('AtividadeFormularioComponent — abrir', () => {
  it('gestor: carrega demandas atribuídas, tags, prioridades e a lista de usuários ativos para escolher o responsável', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR);
    const consultaUsuarios = esperarRequisicao(montado.http, 'GET', '/usuario');
    expect(consultaUsuarios.request.params.get('status')).toBe('ATIVO');
    consultaUsuarios.flush({ sucesso: true, dados: { itens: USUARIOS, totalItens: 1, paginaAtual: 1, itensPorPagina: 100, totalPaginas: 1 }, mensagem: '' });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), PRIORIDADES);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/atribuidas'), DEMANDAS);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), TAGS);
    await montado.atualizar();

    expect(montado.componente.demandasAtribuidas().map((demanda) => demanda.rotulo)).toEqual(['Portal - Login', 'Portal - Relatório']);
    expect(montado.componente.todasAsTags()).toHaveLength(2);
    expect(montado.componente.usuarios().map((usuario) => usuario.id)).toEqual([2]);
    expect(montado.elemento.querySelector('#nova-usuario')).not.toBeNull();
  });

  it('desenvolvedor: não pede a lista de usuários e não mostra o campo Responsável', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    await responderAbertura(montado, false);
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/usuario'));
    expect(montado.elemento.querySelector('#nova-usuario')).toBeNull();
    expect(montado.elemento.querySelector('#nova-prioridade')).not.toBeNull();
  });

  it('abre limpo: status Desenvolvendo, prioridade Indefinida, sem tags; a demanda inicial vem preenchida', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR, { demandaIdInicial: 11 });
    await responderAbertura(montado, true);
    expect(montado.componente.formulario.getRawValue()).toEqual({
      nome: '', demandaId: 11, usuarioId: null, status: TipoAtividadeStatusEnum.DESENVOLVENDO, prioridade: TipoAtividadePrioridadeEnum.INDEFINIDA, tagIds: [],
    });
  });

  it('sem demanda inicial a demanda fica vazia e o formulário não é válido', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    await responderAbertura(montado, false);
    expect(montado.componente.formulario.controls.demandaId.value).toBeNull();
    expect(montado.elemento.textContent).toContain('Escolha a demanda a que esta atividade pertence.');
  });
});

describe('AtividadeFormularioComponent — validação', () => {
  it('nome exige ao menos 3 caracteres e rejeita caractere proibido', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    await responderAbertura(montado, false);
    const nome = montado.componente.formulario.controls.nome;
    expect(nome.hasError('required')).toBe(true);
    nome.setValue('ab');
    expect(nome.hasError('minlength')).toBe(true);
    nome.setValue("Aspas ' proibida");
    expect(nome.hasError('pattern')).toBe(true);
    nome.setValue('Ação – válida');
    expect(nome.valid).toBe(true);
  });

  it('formulário inválido não chama a API, marca os campos e mostra os erros', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    await responderAbertura(montado, false);
    montado.componente.salvar();
    await montado.atualizar();
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    expect(montado.componente.campoInvalido('nome')).toBe(true);
    expect(montado.componente.campoInvalido('demandaId')).toBe(true);
    expect(montado.elemento.textContent).toContain('Informe um nome com ao menos 3 caracteres');
    expect(montado.elemento.textContent).toContain('Selecione a demanda');
  });
});

describe('AtividadeFormularioComponent — criar', () => {
  it('desenvolvedor: envia o corpo sem usuarioId (a atividade é dele) e sem tagIds quando nenhuma foi marcada', async () => {
    const { montado, criadas } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, { demandaIdInicial: 10 });
    await responderAbertura(montado, false);
    montado.componente.formulario.patchValue({ nome: 'Nova atividade', usuarioId: 2 });
    montado.componente.salvar();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/atividade');
    expect(requisicao.request.body).toEqual({ demandaId: 10, nome: 'Nova atividade', status: 'DESENVOLVENDO', prioridade: 'INDEFINIDA' });
    expect('usuarioId' in requisicao.request.body).toBe(false);
    responderSucesso(requisicao, { id: 90 }, 201);
    await montado.atualizar();
    expect(criadas).toEqual([{ id: 90, criarOutra: false }]);
  });

  it('gestor: envia o responsável escolhido, as tags marcadas, o status e a prioridade', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR, { demandaIdInicial: 10 });
    await responderAbertura(montado, true);
    const controles = montado.componente.formulario.controls;
    montado.componente.formulario.patchValue({ nome: 'Para a Ana', usuarioId: 2, status: TipoAtividadeStatusEnum.PLANEJADA, prioridade: TipoAtividadePrioridadeEnum.INDEFINIDA });
    montado.componente.alternarTagSelecao(controles.tagIds, 1);
    montado.componente.alternarTagSelecao(controles.tagIds, 2);
    montado.componente.alternarTagSelecao(controles.tagIds, 2);
    montado.componente.salvar();
    expect(esperarRequisicao(montado.http, 'POST', '/atividade').request.body).toEqual({
      demandaId: 10, nome: 'Para a Ana', status: 'PLANEJADA', prioridade: 'INDEFINIDA', usuarioId: 2, tagIds: [1],
    });
  });

  it('gestor sem responsável escolhido não manda usuarioId (a atividade fica com ele mesmo)', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.GESTOR, { demandaIdInicial: 10 });
    await responderAbertura(montado, true);
    montado.componente.formulario.patchValue({ nome: 'Minha atividade' });
    montado.componente.salvar();
    expect('usuarioId' in esperarRequisicao(montado.http, 'POST', '/atividade').request.body).toBe(false);
  });

  it('o aviso de sucesso é oferecido com o atalho "Ver atividade"', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, { demandaIdInicial: 10 });
    await responderAbertura(montado, false);
    montado.componente.formulario.patchValue({ nome: 'Com aviso' });
    montado.componente.salvar();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/atividade'), { id: 91 }, 201);
    await montado.atualizar();
    const oferta = montado.fixture.debugElement.injector.get(DesfazerService).oferta();
    expect(oferta?.mensagem).toBe('Atividade criada com sucesso');
    expect(oferta?.rotulo).toBe('Ver atividade');
  });

  it('"criar outra" limpa só o nome e preserva demanda, status, tags e responsável', async () => {
    const { montado, criadas } = await abrir(TipoUsuarioEnum.GESTOR, { demandaIdInicial: 10 });
    await responderAbertura(montado, true);
    montado.componente.formulario.patchValue({ nome: 'Primeira', usuarioId: 2, status: TipoAtividadeStatusEnum.PLANEJADA, tagIds: [1] });
    montado.componente.salvar(true);
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/atividade'), { id: 92 }, 201);
    await montado.atualizar();
    expect(criadas).toEqual([{ id: 92, criarOutra: true }]);
    expect(montado.componente.formulario.getRawValue()).toMatchObject({ nome: '', demandaId: 10, usuarioId: 2, status: TipoAtividadeStatusEnum.PLANEJADA, tagIds: [1] });
  });

  it('enquanto salva o estado fica ocupado; erro do backend não emite nada e libera o formulário', async () => {
    const { montado, criadas } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR, { demandaIdInicial: 10 });
    await responderAbertura(montado, false);
    montado.componente.formulario.patchValue({ nome: 'Falha' });
    montado.componente.salvar();
    expect(montado.componente.salvando()).toBe(true);
    responderErro(esperarRequisicao(montado.http, 'POST', '/atividade'), 400, 'Demanda inválida');
    await montado.atualizar();
    expect(criadas).toEqual([]);
    expect(montado.componente.salvando()).toBe(false);
  });
});

describe('AtividadeFormularioComponent — tags e status', () => {
  it('clicar numa tag a marca e desmarca, e o botão de status troca o status do formulário', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    await responderAbertura(montado, false);
    const chips = Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('.nova-atividade__tag-chip'));
    expect(chips.map((chip) => chip.textContent?.trim())).toEqual(['Backend', 'Frontend']);
    chips[0].click();
    await montado.atualizar();
    expect(montado.componente.formulario.controls.tagIds.value).toEqual([1]);
    expect(chips[0].classList.contains('nova-atividade__tag-chip--ativo')).toBe(true);
    chips[0].click();
    await montado.atualizar();
    expect(montado.componente.formulario.controls.tagIds.value).toEqual([]);

    const segmentos = Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('.nova-atividade__segmento'));
    segmentos.find((segmento) => segmento.textContent?.trim() === 'Pendente')!.click();
    expect(montado.componente.formulario.controls.status.value).toBe(TipoAtividadeStatusEnum.PENDENTE);
  });

  it('sem tags cadastradas mostra o estado vazio', async () => {
    const { montado } = await abrir(TipoUsuarioEnum.DESENVOLVEDOR);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), PRIORIDADES);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/atribuidas'), DEMANDAS);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/tag'), []);
    await montado.atualizar();
    expect(montado.elemento.textContent).toContain('Nenhuma tag cadastrada');
  });
});
