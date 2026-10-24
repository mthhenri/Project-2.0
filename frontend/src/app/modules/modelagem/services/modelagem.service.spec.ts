import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ModelagemDiagramaDto } from '@project20/shared';
import { montarComponente } from '../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../testes/http-teste';
import { Component } from '@angular/core';
import { ModelagemService } from './modelagem.service';

@Component({ standalone: true, template: '' })
class HospedeiroComponent {}

describe('ModelagemService', () => {
  it('busca o diagrama em GET /modelagem', async () => {
    TestBed.resetTestingModule();
    const { http } = await montarComponente(HospedeiroComponent);
    const diagrama: ModelagemDiagramaDto = { origem: 'teste', colunasOcultas: [], avisos: [], grupos: [], tabelas: [] };
    let recebido: ModelagemDiagramaDto | null = null;
    TestBed.inject(ModelagemService).obterDiagrama().subscribe((resposta) => (recebido = resposta.dados));
    const requisicao = esperarRequisicao(http, 'GET', '/modelagem');
    responderSucesso(requisicao, diagrama);
    expect(recebido).toEqual(diagrama);
  });

  it('cria, altera e exclui grupo pelas rotas de grupo', async () => {
    TestBed.resetTestingModule();
    const { http } = await montarComponente(HospedeiroComponent);
    const servico = TestBed.inject(ModelagemService);

    servico.criarGrupo({ titulo: 'Ponto', rotulo: 'Ponto' }).subscribe();
    const criacao = esperarRequisicao(http, 'POST', '/modelagem/grupo');
    expect(criacao.request.body).toEqual({ titulo: 'Ponto', rotulo: 'Ponto' });
    responderSucesso(criacao, { id: 7, titulo: 'Ponto', rotulo: 'Ponto', corIndice: 2 });

    servico.alterarGrupo(7, { titulo: 'Ponto do dia', rotulo: 'Ponto' }).subscribe();
    const alteracao = esperarRequisicao(http, 'PUT', '/modelagem/grupo/7');
    expect(alteracao.request.body).toEqual({ titulo: 'Ponto do dia', rotulo: 'Ponto' });
    responderSucesso(alteracao, { id: 7, titulo: 'Ponto do dia', rotulo: 'Ponto', corIndice: 2 });

    servico.excluirGrupo(7).subscribe();
    responderSucesso(esperarRequisicao(http, 'DELETE', '/modelagem/grupo/7'), null);
  });

  it('grava o grupo e a posição de uma tabela em PUT /modelagem/tabela/:nome', async () => {
    TestBed.resetTestingModule();
    const { http } = await montarComponente(HospedeiroComponent);
    TestBed.inject(ModelagemService).alterarTabela('ponto_justificativa', { grupoId: 3, x: 10, y: 20 }).subscribe();
    const requisicao = esperarRequisicao(http, 'PUT', '/modelagem/tabela/ponto_justificativa');
    expect(requisicao.request.body).toEqual({ grupoId: 3, x: 10, y: 20 });
    responderSucesso(requisicao, { nome: 'ponto_justificativa', grupoId: 3, x: 10, y: 20 });
  });

  it('tira uma tabela da modelagem em DELETE /modelagem/tabela/:nome (o nome vai codificado na rota)', async () => {
    TestBed.resetTestingModule();
    const { http } = await montarComponente(HospedeiroComponent);
    TestBed.inject(ModelagemService).removerTabela('ponto justificativa').subscribe();
    responderSucesso(esperarRequisicao(http, 'DELETE', '/modelagem/tabela/ponto%20justificativa'), null);
  });
});
