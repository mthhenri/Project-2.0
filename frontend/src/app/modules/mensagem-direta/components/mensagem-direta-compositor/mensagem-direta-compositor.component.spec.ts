import { describe, it, expect, beforeEach } from 'vitest';
import { ReferenciaMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { EnvioDoCompositor } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaCompositorComponent } from './mensagem-direta-compositor.component';

// O compositor do chat entre colaboradores (task 211): Enter envia, bloco de código (botão e colagem), `@` (as pessoas da conversa) e `#` (demandas e
// atividades pela API), e no envio só vão as menções e referências cujo texto ainda está na mensagem.

const PESSOAS = [{ usuarioId: 9, nome: 'Camila Duarte' }];
const pausa = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

describe('MensagemDiretaCompositorComponent', () => {
  let tela: ComponenteMontado<MensagemDiretaCompositorComponent>;
  let envios: EnvioDoCompositor[];

  const campo = () => tela.elemento.querySelector<HTMLTextAreaElement>('textarea[aria-label="Mensagem"]')!;

  async function digitar(texto: string, cursor = texto.length) {
    campo().value = texto;
    campo().setSelectionRange(cursor, cursor);
    campo().dispatchEvent(new Event('input'));
    await tela.atualizar();
  }

  const teclar = (tecla: string, opcoes: KeyboardEventInit = {}) => {
    const evento = new KeyboardEvent('keydown', { key: tecla, bubbles: true, cancelable: true, ...opcoes });
    campo().dispatchEvent(evento);
    return evento;
  };

  beforeEach(async () => {
    envios = [];
    tela = await montarComponente(MensagemDiretaCompositorComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { pessoas: PESSOAS, chave: 9 } });
    tela.componente.enviar.subscribe((envio) => envios.push(envio));
  });

  it('Enter envia o texto; Shift+Enter e texto em branco não enviam; depois de enviar o campo esvazia', async () => {
    await digitar('   ');
    expect(teclar('Enter').defaultPrevented).toBe(true);
    expect(envios).toEqual([]);

    await digitar('Oi, tudo bem?');
    teclar('Enter', { shiftKey: true });
    expect(envios).toEqual([]);
    teclar('Enter');
    expect(envios).toEqual([{ texto: 'Oi, tudo bem?', mencoes: [], referencias: [] }]);
    expect(campo().value).toBe('');
  });

  it('@ abre as pessoas da conversa; Enter escolhe e a menção vai no envio', async () => {
    await digitar('Valeu! Vou chamar a @Cam');
    expect(tela.elemento.querySelector('[role="listbox"]')).not.toBeNull();
    expect(tela.elemento.textContent).toContain('Mencionar');
    expect(tela.elemento.textContent).toContain('Camila Duarte');

    teclar('Enter');
    await tela.atualizar();
    expect(campo().value).toBe('Valeu! Vou chamar a @Camila Duarte ');
    expect(tela.elemento.querySelector('[role="listbox"]')).toBeNull();

    teclar('Enter');
    expect(envios).toEqual([{ texto: 'Valeu! Vou chamar a @Camila Duarte ', mencoes: [9], referencias: [] }]);
  });

  it('pontuação digitada logo depois da escolha consome o espaço automático; outra tecla o mantém', async () => {
    await digitar('oi @Cam');
    teclar('Enter');
    await tela.atualizar();
    expect(campo().value).toBe('oi @Camila Duarte ');
    teclar(',');
    expect(campo().value).toBe('oi @Camila Duarte');

    await digitar('oi @Cam');
    teclar('Enter');
    await tela.atualizar();
    teclar('x');
    expect(campo().value).toBe('oi @Camila Duarte ');
    teclar(',');
    expect(campo().value).toBe('oi @Camila Duarte ');
  });

  it('a menção que o usuário apagou do texto não vai no envio', async () => {
    await digitar('oi @Cam');
    teclar('Tab');
    await tela.atualizar();
    await digitar('oi, apaguei a menção');
    teclar('Enter');
    expect(envios[0].mencoes).toEqual([]);
  });

  it('@ sem ninguém que combine mostra "Nenhum resultado"; com espaço no termo e sem resultado, fecha', async () => {
    await digitar('@zzz');
    expect(tela.elemento.textContent).toContain('Nenhum resultado');
    await digitar('@zzz yyy');
    expect(tela.elemento.querySelector('.compositor-direto__lista')).toBeNull();
  });

  it('# com uma letra não consulta; com duas, espera a pausa e busca demandas e atividades; escolher registra a referência', async () => {
    await digitar('veja #c');
    await pausa(300);
    tela.http.expectNone((requisicao) => requisicao.url.endsWith('/mensagem-direta/referencias'));
    expect(tela.elemento.querySelector('.compositor-direto__lista')).toBeNull();

    await digitar('veja #co');
    expect(tela.elemento.textContent).toContain('Buscando');
    await pausa(300);
    const busca = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencias');
    expect(busca.request.params.get('texto')).toBe('co');
    responderSucesso(busca, {
      referencias: [
        { tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212, nome: 'Corrigir filtro', situacao: 'DESENVOLVENDO', demandaNome: null },
        { tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57, nome: 'Concluir login', situacao: 'PENDENTE', demandaNome: 'Autenticação' },
      ],
    });
    await tela.atualizar();

    expect(tela.elemento.textContent).toContain('Referenciar');
    expect(tela.elemento.textContent).toContain('Demanda · Desenvolvendo');
    expect(tela.elemento.textContent).toContain('Atividade · Autenticação');

    teclar('ArrowDown');
    await tela.atualizar();
    teclar('Enter');
    await tela.atualizar();
    expect(campo().value).toBe('veja #Concluir login ');
    teclar('Enter');
    expect(envios).toEqual([{ texto: 'veja #Concluir login ', mencoes: [], referencias: [{ tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57 }] }]);
  });

  it('clicar numa sugestão a escolhe, sem tirar o foco do campo', async () => {
    await digitar('#fi');
    await pausa(300);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencias'), {
      referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 1, nome: 'Filtro', situacao: 'PLANEJADA', demandaNome: null }],
    });
    await tela.atualizar();
    const opcao = tela.elemento.querySelector<HTMLElement>('[role="option"]')!;
    expect(opcao.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))).toBe(false);
    opcao.click();
    await tela.atualizar();
    expect(campo().value).toBe('#Filtro ');
  });

  it('erro na busca do # mostra o aviso, e Esc fecha só a lista (sem enviar e sem deixar o Esc subir)', async () => {
    await digitar('#err');
    await pausa(300);
    responderErro(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencias'), 500, 'falhou');
    await tela.atualizar();
    expect(tela.elemento.textContent).toContain('Não foi possível buscar.');

    const esc = teclar('Escape');
    await tela.atualizar();
    expect(esc.defaultPrevented).toBe(true);
    expect(tela.elemento.querySelector('.compositor-direto__lista')).toBeNull();
    expect(envios).toEqual([]);
    expect(campo().value).toBe('#err');
  });

  // O botão `</>` abre o mini editor (task 216); o bloco só entra no campo quando o usuário insere.
  const botaoDeCodigo = () => tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Inserir bloco de código"]')!;
  const painel = () => tela.elemento.querySelector('app-mensagem-direta-codigo-painel');
  const editorDeCodigo = () => tela.elemento.querySelector<HTMLTextAreaElement>('textarea[aria-label="Código do bloco"]')!;
  const botaoDoPainel = (rotulo: string) => Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('app-mensagem-direta-codigo-painel p-button button')).find((item) => item.textContent?.includes(rotulo))!;
  async function digitarNoEditor(codigo: string) {
    editorDeCodigo().value = codigo;
    editorDeCodigo().dispatchEvent(new Event('input'));
    await tela.atualizar();
  }

  it('o botão Código abre o mini editor sem mexer no campo; Esc fecha e devolve o foco ao campo', async () => {
    await digitar('antes');
    botaoDeCodigo().click();
    await tela.atualizar();
    expect(painel()).not.toBeNull();
    expect(editorDeCodigo().value).toBe('');
    expect(campo().value).toBe('antes');
    expect(tela.elemento.querySelector('.compositor-direto__caixa')!.hasAttribute('inert')).toBe(true);

    editorDeCodigo().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await tela.atualizar();
    expect(painel()).toBeNull();
    expect(campo().value).toBe('antes');
    expect(tela.elemento.querySelector('.compositor-direto__caixa')!.hasAttribute('inert')).toBe(false);
  });

  it('Inserir põe o bloco no campo (cerca sem linguagem) e fecha o painel; nada é enviado sozinho', async () => {
    await digitar('');
    botaoDeCodigo().click();
    await tela.atualizar();
    await digitarNoEditor('const a = 1;');
    botaoDoPainel('Inserir').click();
    await tela.atualizar();
    expect(painel()).toBeNull();
    expect(campo().value).toBe('```\nconst a = 1;\n```');
    expect(envios).toEqual([]);
  });

  it('com a linguagem escolhida, o nome curto vai na cerca', async () => {
    await digitar('veja:');
    botaoDeCodigo().click();
    await tela.atualizar();
    await digitarNoEditor('print(1)');
    const painelAberto = tela.fixture.debugElement.query((elemento) => elemento.name === 'app-mensagem-direta-codigo-painel');
    painelAberto.componentInstance['controleLinguagem'].setValue('py');
    await tela.atualizar();
    botaoDoPainel('Inserir').click();
    await tela.atualizar();
    expect(campo().value).toBe('veja:\n```py\nprint(1)\n```');
  });

  it('o trecho selecionado já vem no editor e é trocado pelo bloco', async () => {
    await digitar('antes\nconst a = 1;\nfim', 22);
    campo().setSelectionRange(6, 18);
    botaoDeCodigo().click();
    await tela.atualizar();
    expect(editorDeCodigo().value).toBe('const a = 1;');
    await digitarNoEditor('const a = 2;');
    botaoDoPainel('Inserir').click();
    await tela.atualizar();
    expect(campo().value).toBe('antes\n```\nconst a = 2;\n```\nfim');
  });

  it('colar várias linhas com cara de código vira bloco; colar prosa segue o caminho normal', async () => {
    const colar = (texto: string) => {
      const evento = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(evento, 'clipboardData', { value: { getData: () => texto } });
      campo().dispatchEvent(evento);
      return evento;
    };
    await digitar('');
    const codigo = colar('ngOnInit() {\n  this.filtro.set(\'\');\n}');
    await tela.atualizar();
    expect(codigo.defaultPrevented).toBe(true);
    expect(campo().value).toBe('```\nngOnInit() {\n  this.filtro.set(\'\');\n}\n```');

    const prosa = colar('Oi Camila,\nvocê olha isso hoje?\nObrigado!');
    expect(prosa.defaultPrevented).toBe(false);
  });

  it('o texto de mais de 10.000 caracteres não envia', async () => {
    await digitar('a'.repeat(10_001));
    expect(tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Enviar mensagem"]')!.disabled).toBe(true);
  });

  // --- correções da revisão (task 211) ----------------------------------------------------------

  const listaAberta = () => tela.elemento.querySelector('.compositor-direto__lista') !== null;

  it('depois de escolher uma referência, continuar a frase não reabre a lista nem busca de novo', async () => {
    await digitar('veja #Cor');
    await pausa(300);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencias'), {
      referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212, nome: 'Corrigir filtro', situacao: 'PLANEJADA', demandaNome: null }],
    });
    await tela.atualizar();
    teclar('Enter');
    await tela.atualizar();
    expect(campo().value).toBe('veja #Corrigir filtro ');

    await digitar('veja #Corrigir filtro está pronto');
    await pausa(300);
    tela.http.expectNone((requisicao) => requisicao.url.endsWith('/mensagem-direta/referencias'));
    expect(listaAberta()).toBe(false);
    teclar('Enter');
    expect(envios.at(-1)?.texto).toBe('veja #Corrigir filtro está pronto');
  });

  it('# comum numa frase ("o PR #12 quebrou a build"): sem resultado a lista fecha e não reabre naquele gatilho', async () => {
    await digitar('o PR #12 qu');
    await pausa(300);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencias'), { referencias: [] });
    await tela.atualizar();
    expect(listaAberta()).toBe(false);

    await digitar('o PR #12 quebrou a build');
    await pausa(300);
    tela.http.expectNone((requisicao) => requisicao.url.endsWith('/mensagem-direta/referencias'));
    expect(listaAberta()).toBe(false);
  });

  it('depois de um Esc, o gatilho volta a abrir quando o texto passa a ter outro (apagar e digitar @ de novo)', async () => {
    await digitar('@');
    expect(listaAberta()).toBe(true);
    teclar('Escape');
    await tela.atualizar();
    expect(listaAberta()).toBe(false);

    await digitar('');
    await digitar('@');
    expect(listaAberta()).toBe(true);
  });

  it('Esc sem lista visível NÃO é engolido (segue para o popup); com a lista aberta, só a fecha', async () => {
    await digitar('#a'); // uma letra: lista fechada
    expect(listaAberta()).toBe(false);
    expect(teclar('Escape').defaultPrevented).toBe(false);

    await digitar('@');
    expect(listaAberta()).toBe(true);
    expect(teclar('Escape').defaultPrevented).toBe(true);
  });

  it('clicar fora do campo (perder o foco) fecha a lista, e as setas passam do 8º item sem estourar', async () => {
    await digitar('@');
    expect(listaAberta()).toBe(true);
    campo().dispatchEvent(new Event('blur'));
    await tela.atualizar();
    expect(listaAberta()).toBe(false);

    await digitar('');
    await digitar('#fi');
    await pausa(300);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencias'), {
      referencias: Array.from({ length: 8 }, (_, i) => ({ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: i + 1, nome: `Filtro ${i + 1}`, situacao: 'PLANEJADA', demandaNome: null })),
    });
    await tela.atualizar();
    for (let i = 0; i < 9; i++) teclar('ArrowDown');
    await tela.atualizar();
    expect(tela.elemento.querySelectorAll('[role="option"]').length).toBe(8);
    expect(tela.elemento.querySelector('.compositor-direto__item--ativo')?.textContent).toContain('Filtro 2');
  });

  it('resposta atrasada de um termo antigo é descartada (digitei mais letras antes de ela chegar)', async () => {
    await digitar('#lo');
    await pausa(300);
    const antiga = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencias');
    await digitar('#lox');
    responderSucesso(antiga, { referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 1, nome: 'Login', situacao: 'PLANEJADA', demandaNome: null }] });
    await tela.atualizar();

    expect(tela.elemento.querySelectorAll('[role="option"]').length).toBe(0);
    expect(tela.elemento.textContent).toContain('Buscando');
    teclar('Enter');
    expect(envios.at(-1)?.texto).toBe('#lox');
  });

  it('colar código perto do limite de 10.000 caracteres não vira bloco (a cerca não caberia)', async () => {
    const colar = (texto: string) => {
      const evento = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(evento, 'clipboardData', { value: { getData: () => texto } });
      campo().dispatchEvent(evento);
      return evento;
    };
    await digitar('a'.repeat(9_990), 9_990);
    const codigo = colar('const a = 1;\nconst b = 2;\nreturn a + b;');
    expect(codigo.defaultPrevented).toBe(false);
    expect(campo().value.includes('```')).toBe(false);
  });

  it('o código do Desktop entra uma vez como bloco, com o cursor depois dele, e nada é enviado sozinho', async () => {
    let usados = 0;
    tela.componente.textoAplicado.subscribe(() => usados++);
    tela.fixture.componentRef.setInput('codigoInicial', ['const a = 1;', 'const b = 2;'].join('\n'));
    await tela.atualizar();
    await pausa(5);
    expect(campo().value).toBe(['```', 'const a = 1;', 'const b = 2;', '```'].join('\n'));
    expect(campo().selectionStart).toBe(campo().value.length);
    expect(usados).toBe(1);
    expect(envios).toEqual([]);
  });
});
