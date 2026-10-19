import { describe, it, expect } from 'vitest';
import { TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { minutosDoIntervalo } from '../../utils/intervalo-registro.util';
import { ExecucaoRegistroDialogComponent } from './execucao-registro-dialog.component';

// Dialog "Registrar execução" (gestor, task 103): intervalo passado + descrição, com chips de duração que sempre terminam em agora
// (exceto a manhã, 9h–12h). O padrão ao abrir é a última hora.

type Montado = ComponenteMontado<ExecucaoRegistroDialogComponent>;

const ATIVIDADE = { id: 30, nome: 'Corrigir bug', nomeProjeto: 'Portal', nomeUsuario: 'Ana Souza' };

async function abrirDialog(): Promise<{ montado: Montado; registros: number[] }> {
  const montado = await montarComponente(ExecucaoRegistroDialogComponent, { usuario: TipoUsuarioEnum.GESTOR });
  const registros: number[] = [];
  montado.componente.registrado.subscribe(() => registros.push(1));
  montado.componente.abrir(ATIVIDADE);
  await montado.atualizar();
  return { montado, registros };
}

function chips(): HTMLButtonElement[] {
  return Array.from(document.body.querySelectorAll<HTMLButtonElement>('.execucao-registro-dialog__chip'));
}

describe('ExecucaoRegistroDialogComponent — abrir', () => {
  it('abre com a atividade, o intervalo padrão de 1 hora terminando agora e a descrição vazia', async () => {
    const { montado } = await abrirDialog();
    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(montado.componente.atividade()).toEqual(ATIVIDADE);
    const { inicioData, fimData, descricao } = montado.componente.formulario.getRawValue();
    expect(minutosDoIntervalo({ inicioData: inicioData!, fimData: fimData! })).toBe(60);
    expect(Math.abs(Date.now() - fimData!.getTime())).toBeLessThan(120_000);
    expect(descricao).toBe('');
    expect(montado.componente.duracaoAtiva()).toBe(60);
  });

  it('mostra projeto, atividade e executor com as iniciais', async () => {
    await abrirDialog();
    expect(document.body.textContent).toContain('Portal · Corrigir bug');
    expect(document.body.textContent).toContain('Ana Souza');
    expect(document.body.querySelector('.execucao-registro-dialog__avatar')?.textContent?.trim()).toBe('AS');
  });

  it('reabrir descarta o que foi digitado antes', async () => {
    const { montado } = await abrirDialog();
    montado.componente.formulario.patchValue({ descricao: 'Texto antigo' });
    montado.componente.abrir({ ...ATIVIDADE, id: 31 });
    expect(montado.componente.formulario.controls.descricao.value).toBe('');
    expect(montado.componente.atividade()?.id).toBe(31);
  });
});

describe('ExecucaoRegistroDialogComponent — chips de duração', () => {
  it('oferece 30min, 1h, 2h, 4h e Manhã 9h–12h', async () => {
    await abrirDialog();
    expect(chips().map((chip) => chip.textContent?.trim())).toEqual(['30min', '1h', '2h', '4h', 'Manhã 9h–12h']);
  });

  it('clicar numa duração reescreve o intervalo, que termina agora, e destaca o chip', async () => {
    const { montado } = await abrirDialog();
    chips().find((chip) => chip.textContent?.trim() === '2h')!.click();
    await montado.atualizar();
    const { inicioData, fimData } = montado.componente.formulario.getRawValue();
    expect(minutosDoIntervalo({ inicioData: inicioData!, fimData: fimData! })).toBe(120);
    expect(Math.abs(Date.now() - fimData!.getTime())).toBeLessThan(120_000);
    expect(montado.componente.duracaoAtiva()).toBe(120);
    const ativos = chips().filter((chip) => chip.classList.contains('execucao-registro-dialog__chip--ativo'));
    expect(ativos.map((chip) => chip.textContent?.trim())).toEqual(['2h']);
  });

  it('"Manhã" usa hoje das 9h às 12h e é o chip destacado', async () => {
    const { montado } = await abrirDialog();
    montado.componente.aplicarDuracao('manha');
    await montado.atualizar();
    const { inicioData, fimData } = montado.componente.formulario.getRawValue();
    const hoje = new Date();
    expect([inicioData!.getHours(), inicioData!.getMinutes(), fimData!.getHours(), fimData!.getMinutes()]).toEqual([9, 0, 12, 0]);
    expect(inicioData!.toDateString()).toBe(hoje.toDateString());
    expect(montado.componente.duracaoAtiva()).toBe('manha');
  });

  it('intervalo editado à mão, fora dos atalhos, não destaca nenhum chip', async () => {
    const { montado } = await abrirDialog();
    const fim = new Date(2026, 5, 10, 15, 0);
    montado.componente.formulario.patchValue({ inicioData: new Date(2026, 5, 10, 14, 10), fimData: fim });
    await montado.atualizar();
    expect(montado.componente.duracaoAtiva()).toBeNull();
    expect(chips().some((chip) => chip.classList.contains('execucao-registro-dialog__chip--ativo'))).toBe(false);
  });
});

describe('ExecucaoRegistroDialogComponent — salvar', () => {
  it('descrição é obrigatória e rejeita caractere proibido', async () => {
    const { montado } = await abrirDialog();
    const descricao = montado.componente.formulario.controls.descricao;
    expect(descricao.hasError('required')).toBe(true);
    descricao.setValue("Aspas ' proibida");
    expect(descricao.hasError('pattern')).toBe(true);
    descricao.setValue('Corrigi o bug');
    expect(descricao.valid).toBe(true);
  });

  it('formulário inválido (sem descrição) não chama a API e mostra o erro', async () => {
    const { montado } = await abrirDialog();
    montado.componente.salvar();
    await montado.atualizar();
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    expect(montado.componente.campoInvalido('descricao')).toBe(true);
    expect(document.body.textContent).toContain('Informe a descrição da execução');
  });

  it('fim igual ou anterior ao início invalida o formulário', async () => {
    const { montado } = await abrirDialog();
    const instante = new Date(2026, 5, 10, 10, 0);
    montado.componente.formulario.patchValue({ inicioData: instante, fimData: instante, descricao: 'Algo' });
    expect(montado.componente.formulario.hasError('fimAntesDoInicio')).toBe(true);
    montado.componente.salvar();
    await montado.atualizar();
    montado.http.expectNone((requisicao) => requisicao.method === 'POST');
    expect(document.body.textContent).toContain('O fim deve ser posterior ao início');
  });

  it('envia a atividade, o intervalo em ISO e a descrição sem espaços nas pontas; depois fecha e emite registrado', async () => {
    const { montado, registros } = await abrirDialog();
    const inicio = new Date(2026, 5, 10, 9, 0);
    const fim = new Date(2026, 5, 10, 11, 30);
    montado.componente.formulario.patchValue({ inicioData: inicio, fimData: fim, descricao: '  Corrigi o bug  ' });
    montado.componente.salvar();
    expect(montado.componente.salvando()).toBe(true);
    const requisicao = esperarRequisicao(montado.http, 'POST', '/execucao/registro');
    expect(requisicao.request.body).toEqual({ atividadeId: 30, inicioData: inicio.toISOString(), fimData: fim.toISOString(), descricao: 'Corrigi o bug' });
    responderSucesso(requisicao, { id: 70 }, 201);
    await montado.atualizar();
    expect(montado.componente.mostrarDialog()).toBe(false);
    expect(montado.componente.salvando()).toBe(false);
    expect(registros).toHaveLength(1);
  });

  it('erro do backend: o dialog continua aberto, nada é emitido e o botão volta a ficar livre', async () => {
    const { montado, registros } = await abrirDialog();
    montado.componente.formulario.patchValue({ descricao: 'Texto' });
    montado.componente.salvar();
    responderErro(esperarRequisicao(montado.http, 'POST', '/execucao/registro'), 400, 'Já existe execução nesse intervalo');
    await montado.atualizar();
    expect(montado.componente.mostrarDialog()).toBe(true);
    expect(montado.componente.salvando()).toBe(false);
    expect(registros).toEqual([]);
  });

  it('aceitar a sugestão do assistente substitui a descrição', async () => {
    const { montado } = await abrirDialog();
    montado.componente.aceitarDescricaoAssistente('Texto melhorado pela IA');
    expect(montado.componente.formulario.controls.descricao.value).toBe('Texto melhorado pela IA');
  });

  it('iniciais usa as duas primeiras palavras do nome', async () => {
    const { montado } = await abrirDialog();
    expect(montado.componente.iniciais('maria da silva')).toBe('MD');
    expect(montado.componente.iniciais('Ana')).toBe('A');
  });
});
