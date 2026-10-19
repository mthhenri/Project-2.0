import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DesktopDownloadService } from './desktop-download.service';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../testes/http-teste';

let servico: DesktopDownloadService;
let http: HttpTestingController;

const DISPONIVEL = { disponivel: true, versao: '1.2.0', nomeArquivo: 'Project-Desktop-1.2.0.exe', tamanhoBytes: 87_654_321 };
const INDISPONIVEL = { disponivel: false, versao: null, nomeArquivo: null, tamanhoBytes: null };

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servico = TestBed.inject(DesktopDownloadService);
  http = TestBed.inject(HttpTestingController);
});

describe('DesktopDownloadService (frontend, task 198)', () => {
  it('começa sem versão: o botão não aparece até a leitura chegar', () => {
    expect(servico.versao()).toBeNull();
    expect(servico.baixando()).toBe(false);
  });

  it('carregar guarda a versão publicada; sem executável a versão fica nula', () => {
    servico.carregar();
    responderSucesso(esperarRequisicao(http, 'GET', '/desktop/versao'), DISPONIVEL);
    expect(servico.versao()?.versao).toBe('1.2.0');

    servico.carregar();
    responderSucesso(esperarRequisicao(http, 'GET', '/desktop/versao'), INDISPONIVEL);
    expect(servico.versao()).toBeNull();
  });

  it('falha ao ler a versão não mostra o botão nem quebra', () => {
    servico.carregar();
    responderErro(esperarRequisicao(http, 'GET', '/desktop/versao'), 500, 'erro');
    expect(servico.versao()).toBeNull();
  });

  it('baixar faz GET em /desktop/download como blob, dispara o arquivo com o nome do cabeçalho e libera o botão', () => {
    const criar = vi.fn(() => 'blob:url');
    const revogar = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: criar, revokeObjectURL: revogar });
    const nomes: string[] = [];
    const clique = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { nomes.push(this.download); });

    servico.baixar();
    expect(servico.baixando()).toBe(true);
    servico.baixar();
    const requisicao = esperarRequisicao(http, 'GET', '/desktop/download');
    expect(requisicao.request.responseType).toBe('blob');
    requisicao.flush(new Blob(['x']), { headers: { 'Content-Disposition': 'attachment; filename="Project-Desktop-1.2.0.exe"' } });

    expect(nomes).toEqual(['Project-Desktop-1.2.0.exe']);
    expect(criar).toHaveBeenCalledTimes(1);
    expect(revogar).toHaveBeenCalledWith('blob:url');
    expect(servico.baixando()).toBe(false);
    clique.mockRestore();
    vi.unstubAllGlobals();
  });

  it('erro no download libera o botão', () => {
    servico.baixar();
    esperarRequisicao(http, 'GET', '/desktop/download').flush(new Blob(['sem executável']), { status: 404, statusText: 'Not Found' });
    expect(servico.baixando()).toBe(false);
  });
});
