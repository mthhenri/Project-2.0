import { describe, it, expect, vi, afterEach } from 'vitest';
import { ConfirmationService } from 'primeng/api';
import { NivelIaEnum, PromptTestadoDto, TipoPromptEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { PromptTesteDialogComponent } from './prompt-teste-dialog.component';

// Task 140: testar o prompt antes de salvar. 1 a 5 narrativas, cada uma roda duas vezes (ativo e rascunho), nada é gravado.
// O nível analítico (o mais caro) pede confirmação; as narrativas ficam no navegador, por tipo de prompt.

type Montado = ComponenteMontado<PromptTesteDialogComponent>;

const CANDIDATO = 'Você é o assistente do Project 2.0. Seja breve.';
const CHAVE_PAD = 'prompt-teste.narrativas.PAD';

const textoDaTela = () => document.body.textContent ?? '';
const botao = (rotulo: string) =>
  Array.from(document.body.querySelectorAll('button')).find((candidato) => candidato.textContent?.includes(rotulo)) as HTMLButtonElement;
const campo = (numero: number) => document.body.querySelector(`textarea[aria-label="Narrativa ${numero}"]`) as HTMLTextAreaElement;
const campos = () => document.body.querySelectorAll('textarea[aria-label^="Narrativa "]');

async function abrir(
  tipo: TipoPromptEnum,
  opcoes: { conteudo?: string; armazenamento?: Record<string, string> } = {},
): Promise<{ montado: Montado; confirmar: ReturnType<typeof vi.spyOn> }> {
  const montado = await montarComponente(PromptTesteDialogComponent, {
    usuario: TipoUsuarioEnum.ADMINISTRADOR,
    armazenamento: opcoes.armazenamento,
    entradas: { visivel: true, tipo, conteudo: opcoes.conteudo ?? CANDIDATO },
    provedores: [ConfirmationService],
  });
  const confirmar = vi.spyOn(montado.fixture.debugElement.injector.get(ConfirmationService), 'confirm').mockImplementation(() => ({}) as never);
  await montado.atualizar();
  return { montado, confirmar };
}

async function digitar(montado: Montado, numero: number, texto: string): Promise<void> {
  const alvo = campo(numero);
  alvo.value = texto;
  alvo.dispatchEvent(new Event('input'));
  await montado.atualizar();
}

function saida(texto: string | null, erro: string | null = null) {
  return { texto, erro, tokensEntrada: 120, tokensSaida: 45 };
}

function testado(nivel: NivelIaEnum, narrativas: string[], sobrescrita: Partial<PromptTestadoDto['resultados'][number]> = {}): PromptTestadoDto {
  return {
    nivel,
    resultados: narrativas.map((narrativa) => ({ narrativa, ativo: saida('Resposta do ativo'), candidato: saida('Resposta do rascunho'), ...sobrescrita })),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('PromptTesteDialogComponent — narrativas', () => {
  it('abre com uma narrativa vazia, "1 de 5" e o "Testar" desabilitado', async () => {
    await abrir(TipoPromptEnum.PAD);
    expect(textoDaTela()).toContain('Testar antes de salvar');
    expect(campos()).toHaveLength(1);
    expect(textoDaTela()).toContain('1 de 5');
    expect(botao('Testar').disabled).toBe(true);
    expect(textoDaTela()).toContain('Cole até 5 narrativas');
    expect(textoDaTela()).toContain('no nível padrão');
  });

  it('aceita no máximo 5 narrativas: no limite "Adicionar narrativa" fica desabilitado', async () => {
    const { montado } = await abrir(TipoPromptEnum.PAD);
    for (let vez = 0; vez < 4; vez++) {
      botao('Adicionar narrativa').click();
      await montado.atualizar();
    }
    expect(campos()).toHaveLength(5);
    expect(textoDaTela()).toContain('5 de 5');
    expect(botao('Adicionar narrativa').disabled).toBe(true);

    montado.componente.adicionar();
    await montado.atualizar();
    expect(campos()).toHaveLength(5);
  });

  it('"Testar" só habilita com alguma narrativa preenchida (espaços não contam)', async () => {
    const { montado } = await abrir(TipoPromptEnum.PAD);
    await digitar(montado, 1, '    ');
    expect(botao('Testar').disabled).toBe(true);
    await digitar(montado, 1, 'Terminei o login');
    expect(botao('Testar').disabled).toBe(false);
  });

  it('com o editor vazio não deixa testar, mesmo com narrativa preenchida', async () => {
    const { montado } = await abrir(TipoPromptEnum.PAD, { conteudo: '   ' });
    await digitar(montado, 1, 'Terminei o login');
    expect(botao('Testar').disabled).toBe(true);
  });

  it('remover uma narrativa a tira; remover a última deixa um campo vazio no lugar', async () => {
    const { montado } = await abrir(TipoPromptEnum.PAD, { armazenamento: { [CHAVE_PAD]: JSON.stringify(['primeira', 'segunda']) } });
    expect(campos()).toHaveLength(2);
    (document.body.querySelector('[aria-label="Remover narrativa 1"]') as HTMLButtonElement).click();
    await montado.atualizar();
    expect(campos()).toHaveLength(1);
    expect(campo(1).value).toBe('segunda');

    (document.body.querySelector('[aria-label="Remover narrativa 1"]') as HTMLButtonElement).click();
    await montado.atualizar();
    expect(campos()).toHaveLength(1);
    expect(campo(1).value).toBe('');
  });

  it('guarda no navegador o que se digita, na chave do tipo do prompt', async () => {
    const { montado } = await abrir(TipoPromptEnum.PAD);
    await digitar(montado, 1, 'Narrativa do pad');
    expect(JSON.parse(localStorage.getItem(CHAVE_PAD) ?? '[]')).toEqual(['Narrativa do pad']);
    expect(localStorage.getItem('prompt-teste.narrativas.CHECKIN')).toBeNull();
  });

  it('recarrega só as narrativas guardadas do tipo aberto: as de outro tipo não aparecem', async () => {
    await abrir(TipoPromptEnum.CHECKIN, { armazenamento: { [CHAVE_PAD]: JSON.stringify(['Narrativa do pad']) } });
    expect(campos()).toHaveLength(1);
    expect(campo(1).value).toBe('');
  });

  it('narrativas guardadas acima do limite são cortadas em 5 e itens que não são texto são ignorados', async () => {
    await abrir(TipoPromptEnum.PAD, { armazenamento: { [CHAVE_PAD]: JSON.stringify(['1', '2', '3', '4', '5', '6', 7]) } });
    expect(campos()).toHaveLength(5);
    expect(campo(5).value).toBe('5');
  });

  it('conteúdo guardado inválido (não é JSON) começa com uma narrativa vazia', async () => {
    await abrir(TipoPromptEnum.PAD, { armazenamento: { [CHAVE_PAD]: '{não é json' } });
    expect(campos()).toHaveLength(1);
    expect(campo(1).value).toBe('');
  });
});

describe('PromptTesteDialogComponent — testar', () => {
  it('nível padrão roda direto: POST /prompt/:tipo/testar com o texto do editor e só as narrativas preenchidas, aparadas', async () => {
    const { montado, confirmar } = await abrir(TipoPromptEnum.PAD);
    botao('Adicionar narrativa').click();
    botao('Adicionar narrativa').click();
    await montado.atualizar();
    await digitar(montado, 1, '  Terminei o login  ');
    await digitar(montado, 3, 'Reunião com o cliente');

    botao('Testar').click();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/prompt/PAD/testar');
    expect(confirmar).not.toHaveBeenCalled();
    expect(requisicao.request.body).toEqual({ conteudo: CANDIDATO, narrativas: ['Terminei o login', 'Reunião com o cliente'] });

    await montado.atualizar();
    expect(montado.componente.executando()).toBe(true);
    expect(document.body.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(botao('Testar').disabled).toBe(true);
    responderSucesso(requisicao, testado(NivelIaEnum.PADRAO, ['Terminei o login', 'Reunião com o cliente']));
    await montado.atualizar();
    expect(montado.componente.executando()).toBe(false);
  });

  it('nível analítico pede confirmação com o número de chamadas (2 por narrativa) e só roda depois de aceitar', async () => {
    const { montado, confirmar } = await abrir(TipoPromptEnum.ENTREVISTA_DEMANDA);
    expect(textoDaTela()).toContain('no nível analítico');
    botao('Adicionar narrativa').click();
    await montado.atualizar();
    await digitar(montado, 1, 'Quero um módulo de cobrança');
    await digitar(montado, 2, 'Quero relatórios');

    botao('Testar').click();
    await montado.atualizar();
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/testar'));
    expect(confirmar).toHaveBeenCalledTimes(1);
    const confirmacao = confirmar.mock.calls[0][0] as { message: string; accept: () => void };
    expect(confirmacao.message).toContain('4 chamadas');

    confirmacao.accept();
    const requisicao = esperarRequisicao(montado.http, 'POST', '/prompt/ENTREVISTA_DEMANDA/testar');
    expect(requisicao.request.body.narrativas).toEqual(['Quero um módulo de cobrança', 'Quero relatórios']);
    responderSucesso(requisicao, testado(NivelIaEnum.ANALITICO, ['x', 'y']));
  });

  it('mostra, para cada narrativa, a resposta do ativo e a do rascunho lado a lado, com os tokens', async () => {
    const { montado } = await abrir(TipoPromptEnum.PAD);
    await digitar(montado, 1, 'Terminei o login');
    botao('Testar').click();
    const resultado = testado(NivelIaEnum.PADRAO, ['Terminei o login']);
    resultado.resultados[0].ativo = saida('Texto do prompt ativo');
    resultado.resultados[0].candidato = saida('Texto do prompt candidato');
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/prompt/PAD/testar'), resultado);
    await montado.atualizar();

    const texto = textoDaTela();
    expect(texto).toContain('Narrativa 1');
    expect(texto).toContain('Ativo');
    expect(texto).toContain('Rascunho');
    expect(texto).toContain('Texto do prompt ativo');
    expect(texto).toContain('Texto do prompt candidato');
    expect(texto).toContain('120 entrada · 45 saída (tokens)');
  });

  it('erro numa das saídas aparece só nela: a outra mostra a resposta normalmente (sem tokens na que falhou)', async () => {
    const { montado } = await abrir(TipoPromptEnum.PAD);
    await digitar(montado, 1, 'Terminei o login');
    botao('Testar').click();
    const resultado = testado(NivelIaEnum.PADRAO, ['Terminei o login']);
    resultado.resultados[0].candidato = saida(null, 'A IA recusou o texto candidato');
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/prompt/PAD/testar'), resultado);
    await montado.atualizar();

    const alertas = Array.from(document.body.querySelectorAll('[role="alert"]')).map((alerta) => alerta.textContent);
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toContain('A IA recusou o texto candidato');
    expect(textoDaTela()).toContain('Resposta do ativo');
    expect(textoDaTela().match(/\(tokens\)/g)).toHaveLength(1);
  });

  it('cada narrativa do resultado ganha o seu bloco, na ordem', async () => {
    const { montado } = await abrir(TipoPromptEnum.PAD);
    await digitar(montado, 1, 'a');
    botao('Testar').click();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/prompt/PAD/testar'), testado(NivelIaEnum.PADRAO, ['primeira', 'segunda', 'terceira']));
    await montado.atualizar();

    expect(document.body.querySelectorAll('article')).toHaveLength(3);
    expect(textoDaTela()).toContain('Narrativa 3');
    expect(textoDaTela()).toContain('terceira');
  });

  it('falha da requisição mostra a mensagem do backend, libera o botão e não deixa resultado', async () => {
    const { montado } = await abrir(TipoPromptEnum.PAD);
    await digitar(montado, 1, 'Terminei o login');
    botao('Testar').click();
    responderErro(esperarRequisicao(montado.http, 'POST', '/prompt/PAD/testar'), 500, 'A IA está fora do ar');
    await montado.atualizar();

    expect(montado.componente.erro()).toBe('A IA está fora do ar');
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain('A IA está fora do ar');
    expect(montado.componente.resultado()).toBeNull();
    expect(botao('Testar').disabled).toBe(false);
  });

  it('testar de novo limpa o erro e o resultado anteriores', async () => {
    const { montado } = await abrir(TipoPromptEnum.PAD);
    await digitar(montado, 1, 'Terminei o login');
    botao('Testar').click();
    responderErro(esperarRequisicao(montado.http, 'POST', '/prompt/PAD/testar'), 500, 'Falhou');
    await montado.atualizar();

    botao('Testar').click();
    await montado.atualizar();
    expect(montado.componente.erro()).toBeNull();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/prompt/PAD/testar'), testado(NivelIaEnum.PADRAO, ['Terminei o login']));
    await montado.atualizar();
    expect(textoDaTela()).toContain('Resposta do ativo');
    expect(document.body.querySelector('[role="alert"]')).toBeNull();
  });
});
