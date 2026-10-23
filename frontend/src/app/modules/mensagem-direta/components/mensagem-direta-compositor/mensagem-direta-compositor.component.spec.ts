import { describe, it, expect, beforeEach } from 'vitest';
import { editorViewCtx } from '@milkdown/kit/core';
import { TextSelection } from '@milkdown/kit/prose/state';
import { ReferenciaMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import {
  campoDeMensagem,
  colarNaMensagem,
  digitarNaMensagem,
  editavelDaMensagem,
  esperarCampoDeMensagem,
  teclarNaMensagem,
  textoDaMensagem,
} from '../../../../../testes/campo-mensagem';
import { EnvioDoCompositor } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaCompositorComponent } from './mensagem-direta-compositor.component';

// O compositor do chat entre colaboradores (task 211, refeito sobre o editor formatado na task 218): `Enter` envia (menos em lista e em código), `Shift+Enter`
// cria parágrafo ou item, `Ctrl+Enter` envia sempre, bloco de código (botão, colagem e atalho do Desktop), `@` (as pessoas da conversa) e `#` (demandas e
// atividades pela API), e no envio só vão as menções e referências cujo texto ainda está na mensagem. O jsdom não digita de verdade: o texto entra pela API do
// editor e as teclas são eventos no elemento editável (as regras de digitação do Milkdown, como `- ` virar lista, são conferidas ao vivo).

const PESSOAS = [{ usuarioId: 9, nome: 'Camila Duarte' }];
const pausa = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

describe('MensagemDiretaCompositorComponent', () => {
  let tela: ComponenteMontado<MensagemDiretaCompositorComponent>;
  let envios: EnvioDoCompositor[];

  const digitar = async (texto: string) => {
    digitarNaMensagem(tela.fixture, texto);
    await tela.atualizar();
  };
  const teclar = (tecla: string, opcoes: KeyboardEventInit = {}) => teclarNaMensagem(tela.fixture, tecla, opcoes);
  const markdown = () => textoDaMensagem(tela.fixture);
  const editor = () => campoDeMensagem(tela.fixture).editor()!;
  const listaAberta = () => tela.elemento.querySelector('.compositor-direto__lista') !== null;

  /** Seleciona o trecho de texto (ou só põe o cursor no fim dele, com `soCursor`) dentro do documento. */
  function selecionar(trecho: string, soCursor = false): void {
    editor().acao((contexto) => {
      const view = contexto.get(editorViewCtx);
      let inicio = -1;
      view.state.doc.descendants((no, posicao) => {
        if (inicio < 0 && no.isText && no.text?.includes(trecho)) inicio = posicao + (no.text?.indexOf(trecho) ?? 0);
        return inicio < 0;
      });
      const de = soCursor ? inicio + trecho.length : inicio;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, de, inicio + trecho.length)));
    });
  }

  beforeEach(async () => {
    envios = [];
    tela = await montarComponente(MensagemDiretaCompositorComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { pessoas: PESSOAS, chave: 9 } });
    tela.componente.enviar.subscribe((envio) => envios.push(envio));
    await esperarCampoDeMensagem(tela.fixture, () => tela.atualizar());
  });

  it('avisa que está digitando só pelas teclas do usuário; texto posto por programa, Enter e teclas de controle não avisam', async () => {
    let avisos = 0;
    tela.componente.digitando.subscribe(() => avisos++);
    await digitar('Oi');
    expect(avisos).toBe(0);

    teclar('o');
    expect(avisos).toBe(1);
    teclar('Backspace');
    expect(avisos).toBe(2);
    teclar('Shift');
    teclar('ArrowLeft');
    teclar('b', { ctrlKey: true });
    expect(avisos).toBe(2);
    teclar('Enter');
    expect(avisos).toBe(2);
    teclar('Backspace');
    expect(avisos).toBe(2);
  });

  // --- enviar e quebrar linha -----------------------------------------------------------------------------------------

  it('Enter envia o texto; texto em branco não envia; depois de enviar o campo esvazia', async () => {
    await digitar('   ');
    expect(teclar('Enter').defaultPrevented).toBe(true);
    expect(envios).toEqual([]);

    await digitar('Oi, tudo bem?');
    expect(teclar('Enter').defaultPrevented).toBe(true);
    expect(envios).toEqual([{ texto: 'Oi, tudo bem?', mencoes: [], referencias: [] }]);
    expect(markdown()).toBe('');
    expect(editavelDaMensagem(tela.fixture).textContent).toBe('');
  });

  it('o Enter logo depois de digitar envia o texto de agora, não o que o editor sincronizou antes (o ouvinte do Milkdown atrasa 200 ms)', async () => {
    editor().inserirTexto('rápido');
    teclar('Enter');
    expect(envios.map((envio) => envio.texto)).toEqual(['rápido']);
  });

  it('Shift+Enter não envia: cria um novo parágrafo (e nunca uma quebra dura com barra invertida)', async () => {
    await digitar('um');
    expect(teclar('Enter', { shiftKey: true }).defaultPrevented).toBe(true);
    editor().inserirTexto('dois');
    expect(envios).toEqual([]);
    expect(markdown()).toBe('um\n\ndois');
    expect(markdown()).not.toContain('\\');
  });

  it('Ctrl+Enter envia sempre, inclusive dentro de lista; Enter dentro de lista continua a lista e não envia', async () => {
    await digitar('primeiro');
    editor().executar('lista');
    teclar('Enter');
    expect(envios).toEqual([]);
    editor().inserirTexto('segundo');
    expect(markdown()).toBe('- primeiro\n- segundo');

    expect(teclar('Enter', { ctrlKey: true }).defaultPrevented).toBe(true);
    expect(envios).toEqual([{ texto: '- primeiro\n- segundo', mencoes: [], referencias: [] }]);
  });

  it('Shift+Enter dentro de lista cria um novo item', async () => {
    await digitar('a');
    editor().executar('lista');
    teclar('Enter', { shiftKey: true });
    editor().inserirTexto('b');
    expect(markdown()).toBe('- a\n- b');
  });

  it('Enter dentro de bloco de código não envia (a quebra de linha é do código); Ctrl+Enter envia', async () => {
    editor().inserirBlocoDeCodigo('const a = 1;', 'ts');
    selecionar('const a = 1;', true);
    teclar('Enter');
    teclar('Enter', { shiftKey: true });
    expect(envios).toEqual([]);
    expect((markdown().match(/```/g) ?? []).length).toBe(2);

    teclar('Enter', { ctrlKey: true });
    expect(envios).toHaveLength(1);
    expect(envios[0].texto).toContain('```ts');
  });

  it('Ctrl+B deixa a seleção em negrito, Ctrl+I em itálico (atalhos do próprio editor)', async () => {
    await digitar('texto');
    selecionar('texto');
    teclar('b', { ctrlKey: true });
    expect(markdown()).toBe('**texto**');
    teclar('i', { ctrlKey: true });
    expect(markdown()).toBe('***texto***');
  });

  it('o texto de mais de 10.000 caracteres não envia e mostra o contador; perto do limite o contador aparece', async () => {
    await digitar('a'.repeat(8_500));
    expect(tela.elemento.querySelector('.compositor-direto__contador')?.textContent).toContain('8.500 / 10.000');
    expect(tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Enviar mensagem"]')!.disabled).toBe(false);

    await digitar('a'.repeat(10_001));
    expect(tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Enviar mensagem"]')!.disabled).toBe(true);
    expect(tela.elemento.querySelector('.compositor-direto__contador')?.textContent).toContain('Passou do limite');
    teclar('Enter');
    expect(envios).toEqual([]);

    await digitar('curto');
    expect(tela.elemento.querySelector('.compositor-direto__contador')).toBeNull();
  });

  // --- @ -------------------------------------------------------------------------------------------------------------

  it('@ abre as pessoas da conversa; Enter escolhe e a menção vai no envio', async () => {
    await digitar('Valeu! Vou chamar a @Cam');
    expect(tela.elemento.querySelector('[role="listbox"]')).not.toBeNull();
    expect(tela.elemento.textContent).toContain('Mencionar');
    expect(tela.elemento.textContent).toContain('Camila Duarte');

    teclar('Enter');
    await tela.atualizar();
    expect(markdown()).toBe('Valeu! Vou chamar a @Camila Duarte ');
    expect(listaAberta()).toBe(false);

    teclar('Enter');
    expect(envios).toEqual([{ texto: 'Valeu! Vou chamar a @Camila Duarte', mencoes: [9], referencias: [] }]);
  });

  it('pontuação digitada logo depois da escolha consome o espaço automático; outra tecla o mantém', async () => {
    await digitar('oi @Cam');
    teclar('Tab');
    await tela.atualizar();
    expect(markdown()).toBe('oi @Camila Duarte ');
    teclar(',');
    expect(markdown()).toBe('oi @Camila Duarte');

    await digitar('oi @Cam');
    teclar('Tab');
    await tela.atualizar();
    teclar('x');
    expect(markdown()).toBe('oi @Camila Duarte ');
    teclar(',');
    expect(markdown()).toBe('oi @Camila Duarte ');
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
    expect(listaAberta()).toBe(false);
  });

  it('o @ no meio de outro bloco (outro parágrafo) abre as sugestões do cursor, não do começo do texto', async () => {
    await digitar('primeiro');
    teclar('Enter', { shiftKey: true });
    editor().inserirTexto('chama @Cam');
    await tela.atualizar();
    expect(listaAberta()).toBe(true);
    teclar('Enter');
    await tela.atualizar();
    expect(markdown()).toBe('primeiro\n\nchama @Camila Duarte ');
  });

  // --- # -------------------------------------------------------------------------------------------------------------

  it('# com uma letra não consulta; com duas, espera a pausa e busca demandas e atividades; escolher registra a referência', async () => {
    await digitar('veja #c');
    await pausa(300);
    tela.http.expectNone((requisicao) => requisicao.url.endsWith('/mensagem-direta/referencias'));
    expect(listaAberta()).toBe(false);

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
    expect(markdown()).toBe('veja #Concluir login ');
    teclar('Enter');
    expect(envios).toEqual([{ texto: 'veja #Concluir login', mencoes: [], referencias: [{ tipo: ReferenciaMensagemDiretaEnum.ATIVIDADE, id: 57 }] }]);
  });

  it('o # no começo do parágrafo sai escapado no Markdown, e a referência continua valendo no envio', async () => {
    await digitar('#fi');
    await pausa(300);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencias'), {
      referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 1, nome: 'Filtro', situacao: 'PLANEJADA', demandaNome: null }],
    });
    await tela.atualizar();
    teclar('Enter');
    await tela.atualizar();
    expect(markdown()).toContain('#Filtro');
    teclar('Enter');
    expect(envios[0].referencias).toEqual([{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 1 }]);
  });

  it('clicar numa sugestão a escolhe, sem tirar o foco do campo', async () => {
    await digitar('veja #fi');
    await pausa(300);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencias'), {
      referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 1, nome: 'Filtro', situacao: 'PLANEJADA', demandaNome: null }],
    });
    await tela.atualizar();
    const opcao = tela.elemento.querySelector<HTMLElement>('[role="option"]')!;
    expect(opcao.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))).toBe(false);
    opcao.click();
    await tela.atualizar();
    expect(markdown()).toBe('veja #Filtro ');
  });

  it('erro na busca do # mostra o aviso, e Esc fecha só a lista (sem enviar e sem deixar o Esc subir)', async () => {
    await digitar('veja #err');
    await pausa(300);
    responderErro(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencias'), 500, 'falhou');
    await tela.atualizar();
    expect(tela.elemento.textContent).toContain('Não foi possível buscar.');

    const esc = teclar('Escape');
    await tela.atualizar();
    expect(esc.defaultPrevented).toBe(true);
    expect(listaAberta()).toBe(false);
    expect(envios).toEqual([]);
    expect(markdown()).toBe('veja #err');
  });

  it('depois de escolher uma referência, continuar a frase não reabre a lista nem busca de novo', async () => {
    await digitar('veja #Cor');
    await pausa(300);
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/referencias'), {
      referencias: [{ tipo: ReferenciaMensagemDiretaEnum.DEMANDA, id: 212, nome: 'Corrigir filtro', situacao: 'PLANEJADA', demandaNome: null }],
    });
    await tela.atualizar();
    teclar('Enter');
    await tela.atualizar();
    expect(markdown()).toBe('veja #Corrigir filtro ');

    editor().inserirTexto('está pronto');
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

    editor().inserirTexto('ebrou a build');
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
    editavelDaMensagem(tela.fixture).dispatchEvent(new FocusEvent('blur'));
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
    expect(envios.at(-1)?.texto).toContain('#lox');
  });

  // --- código ---------------------------------------------------------------------------------------------------------

  // O botão `</>` abre o mini editor (task 216); o bloco só entra no campo quando o usuário insere.
  const botaoDeCodigo = () => tela.elemento.querySelector<HTMLButtonElement>('button[aria-label="Inserir bloco de código"]')!;
  const painel = () => tela.elemento.querySelector('app-mensagem-direta-codigo-painel');
  const editorDeCodigo = () => tela.elemento.querySelector<HTMLTextAreaElement>('textarea[aria-label="Código do bloco"]')!;
  const botaoDoPainel = (rotulo: string) =>
    Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('app-mensagem-direta-codigo-painel p-button button')).find((item) => item.textContent?.includes(rotulo))!;
  async function digitarNoEditorDeCodigo(codigo: string) {
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
    expect(markdown()).toBe('antes');
    expect(tela.elemento.querySelector('.compositor-direto__caixa')!.hasAttribute('inert')).toBe(true);

    editorDeCodigo().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await tela.atualizar();
    expect(painel()).toBeNull();
    expect(markdown()).toBe('antes');
    expect(tela.elemento.querySelector('.compositor-direto__caixa')!.hasAttribute('inert')).toBe(false);
  });

  it('Inserir põe o bloco no campo (cerca sem linguagem) e fecha o painel; nada é enviado sozinho', async () => {
    botaoDeCodigo().click();
    await tela.atualizar();
    await digitarNoEditorDeCodigo('const a = 1;');
    botaoDoPainel('Inserir').click();
    await tela.atualizar();
    expect(painel()).toBeNull();
    expect(markdown()).toBe('```\nconst a = 1;\n```');
    expect(envios).toEqual([]);
  });

  it('com a linguagem escolhida, o nome curto vai na cerca, depois do texto que já estava no campo', async () => {
    await digitar('veja:');
    botaoDeCodigo().click();
    await tela.atualizar();
    await digitarNoEditorDeCodigo('print(1)');
    const painelAberto = tela.fixture.debugElement.query((elemento) => elemento.name === 'app-mensagem-direta-codigo-painel');
    painelAberto.componentInstance['controleLinguagem'].setValue('py');
    await tela.atualizar();
    botaoDoPainel('Inserir').click();
    await tela.atualizar();
    expect(markdown()).toBe('veja:\n\n```py\nprint(1)\n```');
  });

  it('o trecho selecionado já vem no editor e é trocado pelo bloco', async () => {
    await digitar('antes');
    editor().inserirBlocoDeCodigo('x', null);
    editor().inserirTexto('const a = 1;');
    selecionar('const a = 1;');
    botaoDeCodigo().click();
    await tela.atualizar();
    expect(editorDeCodigo().value).toBe('const a = 1;');
    await digitarNoEditorDeCodigo('const a = 2;');
    botaoDoPainel('Inserir').click();
    await tela.atualizar();
    expect(markdown()).toBe('antes\n\n```\nx\n```\n\n```\nconst a = 2;\n```');
  });

  it('colar várias linhas com cara de código vira bloco; colar prosa não vira', async () => {
    const codigo = colarNaMensagem(tela.fixture, "ngOnInit() {\n  this.filtro.set('');\n}");
    await tela.atualizar();
    expect(codigo.defaultPrevented).toBe(true);
    expect(markdown()).toBe("```\nngOnInit() {\n  this.filtro.set('');\n}\n```");

    await digitar('');
    colarNaMensagem(tela.fixture, 'Oi Camila,\nvocê olha isso hoje?\nObrigado!');
    await tela.atualizar();
    expect(markdown()).toContain('Obrigado!');
    expect(markdown()).not.toContain('```');
  });

  it('colar código dentro de um bloco de código segue o caminho do editor (não cria bloco dentro de bloco)', async () => {
    editor().inserirBlocoDeCodigo('const a = 1;', 'ts');
    selecionar('const a = 1;', true);
    colarNaMensagem(tela.fixture, 'const b = 2;\nconst c = 3;\nreturn b + c;');
    await tela.atualizar();
    expect((markdown().match(/```/g) ?? []).length).toBe(2);
  });

  it('colar código perto do limite de 10.000 caracteres não vira bloco (a cerca não caberia)', async () => {
    await digitar('a'.repeat(9_990));
    colarNaMensagem(tela.fixture, 'const a = 1;\nconst b = 2;\nreturn a + b;');
    await tela.atualizar();
    expect(markdown().includes('```')).toBe(false);
  });

  it('o código do Desktop entra uma vez como bloco e nada é enviado sozinho', async () => {
    let usados = 0;
    tela.componente.textoAplicado.subscribe(() => usados++);
    tela.fixture.componentRef.setInput('codigoInicial', ['const a = 1;', 'const b = 2;'].join('\n'));
    await tela.atualizar();
    expect(markdown()).toBe(['```', 'const a = 1;', 'const b = 2;', '```'].join('\n'));
    expect(usados).toBe(1);
    expect(envios).toEqual([]);
  });
});
