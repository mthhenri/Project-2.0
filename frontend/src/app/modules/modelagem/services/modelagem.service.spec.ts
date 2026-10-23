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
});
