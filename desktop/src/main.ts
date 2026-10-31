import * as fs from 'node:fs';
import * as path from 'node:path';
import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, IpcMainEvent, IpcMainInvokeEvent, Menu, nativeImage, nativeTheme, Notification, screen, shell, Tray } from 'electron';
import { NOME_DO_APP, URL_DO_PROJECT } from './config';
import { montarPaginaDoDialogoDeSaida, RespostaDaSaida, respostaDaNavegacao } from './dialogo-de-saida';
import { decidirFechamento, destinoDaNavegacao, EstadoDeEncerramento, janelaForaDoLugar, limitarAoMonitor, resolverUrlDoProject, textoDoProximoCheckin } from './politica-da-janela';
import {
  ARQUIVO_DA_ULTIMA_VERSAO, deveAvisarQueAtualizou, deveConferirVersao, enderecoParaBaixar, lerUltimaVersaoGravada, lerVersaoPublicada, textoDaAtualizacao, textoDaVersaoNoMenu,
  textoDoAvisoDeAtualizacao, VersaoPublicada, versaoARegistrar,
} from './politica-da-versao';
import {
  AvisoDoChat, ConversaDoChat, decidirAtalho, enderecoDaJanelaDeChat, lerAvisoDoChat, lerCaminhoDoProject, lerConversaAbertaDoChat, lerPreferenciaDoChat, planoDoAtalho,
  posicaoDaJanelaDeChat, prepararAreaDeTransferencia, textoDoItemDoChat,
} from './politica-do-chat';
import { deveAbrirJanelinha, deveFecharJanelinha, enderecoDaApi, lerEstadoDaIa, lerSituacao, segundosAteOCheckin, SituacaoDoCheckin } from './politica-do-checkin';

const urlDoProject = resolverUrlDoProject(URL_DO_PROJECT, process.env);
const caminhoDoIcone = path.join(__dirname, '..', 'assets', 'icone.png');

const encerramento: EstadoDeEncerramento = { saidaConfirmada: false, encerramentoDoSistema: false };
/** Os tempos da conferência do check-in (a leitura da situação no backend): mais rápida enquanto a janelinha está aberta. */
const CONFERENCIA_OCIOSA_MS = 15_000;
const CONFERENCIA_COM_JANELINHA_MS = 3_000;
const LIMITE_DA_REDE_MS = 8_000;

/** A última situação lida do backend: o menu da bandeja calcula o tempo até o próximo check-in a partir dela. */
let ultimaSituacao: SituacaoDoCheckin | null = null;
/** O executável publicado no servidor (task 198) e quando o desktop conferiu pela última vez; o aviso de versão nova sai daqui. */
let versaoPublicada: VersaoPublicada | null = null;
let ultimaConferenciaDeVersao: number | null = null;
let janelinha: BrowserWindow | null = null;
/** Só quando o check-in terminou (ou deixou de ser exigido) a janelinha pode fechar; antes, fechar é recusado. */
let janelinhaLiberada = false;
let conferencia: NodeJS.Timeout | null = null;

let janela: BrowserWindow | null = null;
let dialogoDeSaida: BrowserWindow | null = null;
let bandeja: Tray | null = null;
let reajustando = false;
/** Trazer o Project para a frente minimiza e restaura de propósito; enquanto isso, o minimizar não pode ocultar a janela. */
let trazendoParaAFrente = false;
let tentativaDeReabrir: NodeJS.Timeout | null = null;

/** O chat entre colaboradores (task 213): a janela flutuante, o texto copiado que espera a página pedir e o atalho global. */
const CONFERENCIA_DO_CHAT_MS = 60_000;
const PRIMEIRA_CONFERENCIA_DO_CHAT_MS = 4_000;
const LARGURA_DO_CHAT = 420;
const ALTURA_DO_CHAT = 640;
let janelaDeChat: BrowserWindow | null = null;
let rascunhoPendente: string | null = null;
/** A conversa que a janela de chat está mostrando: o aviso dela não vira notificação (o usuário já está lendo). */
let conversaDaJanelaDeChat: number | null = null;
/** O atalho que a preferência do usuário pede e o que o sistema de fato registrou (diferem quando outro programa já usa a combinação). */
let atalhoDesejado: string | null = null;
let atalhoRegistrado: string | null = null;
let conferenciaDoChat: NodeJS.Timeout | null = null;
/** As notificações do sistema ainda na tela: sem a referência o coletor de lixo as descartaria antes do clique. */
const notificacoesNaTela = new Set<Notification>();

if (!app.requestSingleInstanceLock()) {
  // Já existe um Project Desktop aberto: ele é quem vai para a frente (evento `second-instance`).
  app.quit();
}

function areaDoMonitorPrincipal() {
  return screen.getPrimaryDisplay().workArea;
}

/** Devolve a janela ao monitor principal inteiro (o tamanho de abertura); maximizada, ela já ocupa a área e fica como está. */
function reajustarJanela(): void {
  if (!janela || janela.isDestroyed() || reajustando) return;
  reajustando = true;
  try {
    if (janela.isMinimized() || janela.isMaximized()) return;
    janela.setBounds(areaDoMonitorPrincipal());
  } finally {
    reajustando = false;
  }
}

/** Esconde a janela: ela some da barra de tarefas e do Alt+Tab, mas o app segue aberto e a bandeja a traz de volta. */
function ocultarJanela(): void {
  if (janela && !janela.isDestroyed()) janela.hide();
}

/**
 * Traz o Project para a frente na área de trabalho atual do Windows, saindo do oculto se for o caso: minimiza e restaura, o que o coloca
 * na área em uso (o Windows não deixa uma janela comum "seguir" o usuário entre áreas de trabalho de outro jeito).
 */
function trazerParaAFrente(): void {
  if (!janela || janela.isDestroyed()) {
    criarJanela();
    return;
  }
  trazendoParaAFrente = true;
  try {
    if (!janela.isVisible()) janela.show();
    janela.minimize();
    janela.restore();
    janela.show();
    reajustarJanela();
    janela.focus();
  } finally {
    // O evento de minimizar pode chegar um instante depois; a folga evita que ele oculte a janela que acabou de voltar.
    setTimeout(() => {
      trazendoParaAFrente = false;
    }, 700);
  }
}

/** Diz à página do Project se a janela está oculta ou minimizada (ver `ProjectDesktopService.oculto`). */
function avisarVisibilidade(): void {
  if (!janela || janela.isDestroyed()) return;
  janela.webContents.send('janela:visibilidade', { oculta: !janela.isVisible() || janela.isMinimized() });
}

function paginaDeFalha(): string {
  const html = `<!doctype html><meta charset="utf-8"><title>${NOME_DO_APP}</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;color:#1c2330;background:#f3f5f8"><div style="text-align:center;max-width:32rem;padding:1rem"><h1 style="font-size:1.25rem">Não foi possível abrir o Project</h1><p>Confira a rede e o endereço do sistema. O app tenta de novo a cada poucos segundos.</p><p style="color:#5d6877;font-size:.875rem">${urlDoProject}</p></div></body>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function criarJanela(): void {
  const area = areaDoMonitorPrincipal();
  janela = new BrowserWindow({
    ...area,
    title: NOME_DO_APP,
    icon: caminhoDoIcone,
    show: false,
    alwaysOnTop: true,
    // No Windows o botão de maximizar só vale com a janela redimensionável; o tamanho continua preso à área (`conferirLugar`).
    resizable: true,
    movable: false,
    maximizable: true,
    fullscreenable: false,
    minimizable: true,
    closable: true,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: !app.isPackaged },
  });

  janela.once('ready-to-show', () => {
    janela?.show();
    reajustarJanela();
  });

  // Nunca fecha por conta própria: fechar e Alt+F4 só ocultam a janela, e minimizar faz o mesmo (o sistema desligando e a saída
  // confirmada na bandeja passam). Oculta, ela some da barra de tarefas e o app segue vivo na bandeja.
  janela.on('close', (evento) => {
    if (decidirFechamento(encerramento) === 'ocultar') {
      evento.preventDefault();
      ocultarJanela();
    }
  });
  janela.on('minimize', () => {
    if (!trazendoParaAFrente) ocultarJanela();
  });
  // Voltou à tela (bandeja, segunda instância): o tamanho de abertura volta e o check-in passa a ser o diálogo dentro do Project.
  janela.on('show', () => {
    reajustarJanela();
    fecharJanelinha();
  });
  // A página não percebe sozinha que a janela sumiu (o Electron mantém `visibilityState` em `visible`): o desktop avisa, e é daí que sai a notificação.
  janela.on('show', avisarVisibilidade);
  janela.on('hide', avisarVisibilidade);
  janela.on('minimize', avisarVisibilidade);
  janela.on('restore', avisarVisibilidade);
  janela.webContents.on('did-finish-load', avisarVisibilidade);
  janela.on('session-end', () => {
    encerramento.encerramentoDoSistema = true;
  });

  // Trava: não arrasta nem encolhe pela borda; maximizar e restaurar valem, e restaurar ou voltar do minimizado devolve o tamanho de abertura.
  janela.on('will-move', (evento) => evento.preventDefault());
  const conferirLugar = () => {
    if (!janela || janela.isDestroyed() || janela.isMinimized() || reajustando) return;
    if (janelaForaDoLugar(janela.getBounds(), areaDoMonitorPrincipal(), janela.isMaximized())) reajustarJanela();
  };
  janela.on('resize', conferirLugar);
  janela.on('move', conferirLugar);
  janela.on('unmaximize', conferirLugar);
  janela.on('restore', () => {
    reajustarJanela();
    // O Project voltou à tela: o check-in passa a ser o diálogo dentro dele, a janelinha separada sai.
    fecharJanelinha();
  });
  screen.on('display-metrics-changed', reajustarJanela);

  // Links externos abrem no navegador do sistema; o Project em si fica na janela.
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (destinoDaNavegacao(url, urlDoProject) === 'navegador') void shell.openExternal(url);
    return { action: 'deny' };
  });
  janela.webContents.on('will-navigate', (evento, url) => {
    if (url.startsWith('data:')) return;
    if (destinoDaNavegacao(url, urlDoProject) === 'navegador') {
      evento.preventDefault();
      void shell.openExternal(url);
    }
  });

  // Sem rede ou com o front fora do ar: mostra o aviso e tenta de novo sozinho.
  janela.webContents.on('did-fail-load', (_evento, _codigo, _descricao, urlFalha, principal) => {
    if (!principal || urlFalha.startsWith('data:')) return;
    void janela?.loadURL(paginaDeFalha());
    if (tentativaDeReabrir) clearTimeout(tentativaDeReabrir);
    tentativaDeReabrir = setTimeout(() => void janela?.loadURL(urlDoProject), 5000);
  });

  janela.on('closed', () => {
    janela = null;
  });
  void janela.loadURL(urlDoProject);
}

function montarMenuDaBandeja(): Menu {
  const atualizacao = textoDaAtualizacao(versaoPublicada, app.getVersion());
  return Menu.buildFromTemplate([
    { label: 'Abrir o Project', click: trazerParaAFrente },
    { label: textoDaVersaoNoMenu(app.getVersion()), enabled: false },
    { label: textoDoProximoCheckin(segundosAteOCheckin(ultimaSituacao, Date.now())), enabled: false },
    { label: textoDoItemDoChat(atalhoDesejado, atalhoRegistrado !== null), enabled: atalhoDesejado !== null, click: acionarChat },
    // Há executável mais novo no servidor (task 198): abre o Project no navegador, que inicia o download com o login do usuário.
    ...(atualizacao ? [{ label: atualizacao, click: () => void shell.openExternal(enderecoParaBaixar(urlDoProject)) }] : []),
    { type: 'separator' },
    { label: 'Fechar completamente', click: () => void pedirSaida() },
  ]);
}

/**
 * Aviso de que o app acabou de ser atualizado (task 200): compara a versão que roda com a gravada na última execução, na pasta de dados do usuário.
 * É local (sem rede nem login) e só avisa quando a versão subiu; a versão nova é gravada depois do aviso, e nunca no lugar de uma maior.
 */
function avisarSeAtualizou(): void {
  const arquivo = path.join(app.getPath('userData'), ARQUIVO_DA_ULTIMA_VERSAO);
  let conteudo: string | null = null;
  try {
    conteudo = fs.readFileSync(arquivo, 'utf8');
  } catch {
    // Sem arquivo: primeira execução.
  }
  const ultima = lerUltimaVersaoGravada(conteudo);
  const atual = app.getVersion();
  if (deveAvisarQueAtualizou(ultima, atual) && Notification.isSupported()) {
    new Notification({ title: NOME_DO_APP, body: textoDoAvisoDeAtualizacao(atual), icon: caminhoDoIcone, silent: true }).show();
  }
  const aGravar = versaoARegistrar(ultima, atual);
  if (aGravar === null) return;
  try {
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.writeFileSync(arquivo, aGravar, 'utf8');
  } catch (erro) {
    console.warn('Não foi possível gravar a última versão que rodou:', erro);
  }
}

/** Única saída do app: confirma que isso desativa o check-in e só então encerra. */
async function pedirSaida(): Promise<void> {
  if (dialogoDeSaida && !dialogoDeSaida.isDestroyed()) {
    dialogoDeSaida.focus();
    return;
  }
  const resposta = await perguntarSaida();
  if (resposta !== 'sair') return;
  encerramento.saidaConfirmada = true;
  app.quit();
}

/** O aviso de saída: uma janelinha própria no estilo do Project (modal sobre o Project quando ele está na tela), e fechá-la é "continuar". */
function perguntarSaida(): Promise<RespostaDaSaida> {
  const pai = janela && !janela.isDestroyed() && janela.isVisible() && !janela.isMinimized() ? janela : undefined;
  const aviso = new BrowserWindow({
    width: 460,
    height: 190,
    parent: pai,
    modal: pai !== undefined,
    title: NOME_DO_APP,
    icon: caminhoDoIcone,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: pai !== undefined,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#18181b' : '#ffffff',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: false },
  });
  dialogoDeSaida = aviso;
  aviso.setAlwaysOnTop(true, 'screen-saver');
  return new Promise<RespostaDaSaida>((resolver) => {
    let resposta: RespostaDaSaida = 'continuar';
    const responder = (valor: RespostaDaSaida) => {
      resposta = valor;
      if (!aviso.isDestroyed()) aviso.close();
    };
    aviso.webContents.on('will-navigate', (evento, endereco) => {
      evento.preventDefault();
      const escolhida = respostaDaNavegacao(endereco);
      if (escolhida) responder(escolhida);
    });
    aviso.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    aviso.webContents.on('before-input-event', (evento, entrada) => {
      if (entrada.type === 'keyDown' && entrada.key === 'Escape') {
        evento.preventDefault();
        responder('continuar');
      }
    });
    aviso.once('ready-to-show', () => {
      aviso.show();
      aviso.focus();
    });
    aviso.on('closed', () => {
      dialogoDeSaida = null;
      resolver(resposta);
    });
    void aviso.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(montarPaginaDoDialogoDeSaida(NOME_DO_APP))}`);
  });
}

function criarBandeja(): void {
  bandeja = new Tray(nativeImage.createFromPath(caminhoDoIcone).resize({ width: 16, height: 16 }));
  bandeja.setToolTip(NOME_DO_APP);
  bandeja.on('click', trazerParaAFrente);
  // O menu é montado na hora de abrir, para o tempo até o check-in estar sempre atual.
  bandeja.on('right-click', () => bandeja?.popUpContextMenu(montarMenuDaBandeja()));
}

/** O Project principal está minimizado ou escondido: o usuário está em outro programa. */
function principalMinimizada(): boolean {
  return !janela || janela.isDestroyed() || janela.isMinimized() || !janela.isVisible();
}

/** O token do login vive no `localStorage` da página do Project; o desktop o lê dali para consultar a API como o próprio usuário. */
async function lerTokenDoLogin(): Promise<string | null> {
  if (!janela || janela.isDestroyed()) return null;
  try {
    const token = await janela.webContents.executeJavaScript("localStorage.getItem('access_token')");
    return typeof token === 'string' && token !== '' ? token : null;
  } catch {
    return null;
  }
}

async function chamarApi(rota: string, token: string): Promise<unknown> {
  try {
    const resposta = await fetch(enderecoDaApi(urlDoProject, rota), { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(LIMITE_DA_REDE_MS) });
    return resposta.ok ? await resposta.json() : null;
  } catch {
    return null;
  }
}

/** Abre a janelinha do check-in: pequena, sem moldura, sempre por cima, arrastável, que só fecha quando o check-in termina. */
function abrirJanelinha(): void {
  janelinhaLiberada = false;
  janelinha = new BrowserWindow({
    width: 480,
    height: 560,
    title: 'Hora do check-in',
    icon: caminhoDoIcone,
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    closable: true,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: !app.isPackaged },
  });
  // Acima de qualquer outra janela, inclusive de programas em tela cheia.
  janelinha.setAlwaysOnTop(true, 'screen-saver');
  janelinha.center();
  janelinha.once('ready-to-show', () => {
    janelinha?.show();
    janelinha?.focus();
  });
  janelinha.on('close', (evento) => {
    if (!janelinhaLiberada) evento.preventDefault();
  });
  // Arrasta à vontade, mas sem sair do monitor.
  janelinha.on('moved', () => {
    if (!janelinha || janelinha.isDestroyed()) return;
    const atual = janelinha.getBounds();
    const area = screen.getDisplayMatching(atual).workArea;
    const dentro = limitarAoMonitor(atual, area);
    if (dentro.x !== atual.x || dentro.y !== atual.y) janelinha.setBounds(dentro);
  });
  janelinha.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  janelinha.on('closed', () => {
    janelinha = null;
    janelinhaLiberada = false;
    agendarConferencia();
  });
  void janelinha.loadURL(new URL('checkin', urlDoProject).toString());
}

/** Libera e fecha a janelinha (o check-in terminou, ou o Project voltou à tela). */
function fecharJanelinha(): void {
  if (!janelinha || janelinha.isDestroyed()) return;
  janelinhaLiberada = true;
  janelinha.close();
}

/** Confere de hora em hora se o servidor publicou um executável mais novo; falha de rede deixa o aviso como estava. */
async function conferirVersao(token: string): Promise<void> {
  if (!deveConferirVersao(ultimaConferenciaDeVersao, Date.now())) return;
  ultimaConferenciaDeVersao = Date.now();
  const corpo = await chamarApi('desktop/versao', token);
  if (corpo !== null) versaoPublicada = lerVersaoPublicada(corpo);
}

/** Lê a situação do check-in no backend: atualiza a bandeja e abre ou fecha a janelinha conforme a regra pura. */
async function conferirCheckin(): Promise<void> {
  const token = await lerTokenDoLogin();
  if (!token) return;
  await conferirVersao(token);
  const situacao = lerSituacao(await chamarApi('checkin/situacao', token));
  if (situacao) {
    ultimaSituacao = situacao;
    bandeja?.setToolTip(`${NOME_DO_APP}\n${textoDoProximoCheckin(segundosAteOCheckin(situacao, Date.now()))}`);
  }
  const aberta = janelinha !== null && !janelinha.isDestroyed();
  if (aberta) {
    if (deveFecharJanelinha(principalMinimizada(), situacao)) fecharJanelinha();
    return;
  }
  if (!situacao || !principalMinimizada() || !situacao.disparado) return;
  const estadoDaIa = lerEstadoDaIa(await chamarApi('ia/disponibilidade', token));
  if (deveAbrirJanelinha({ principalMinimizada: principalMinimizada(), situacao, estadoDaIa, janelinhaAberta: false })) abrirJanelinha();
}

function agendarConferencia(): void {
  if (conferencia) clearTimeout(conferencia);
  const espera = janelinha && !janelinha.isDestroyed() ? CONFERENCIA_COM_JANELINHA_MS : CONFERENCIA_OCIOSA_MS;
  conferencia = setTimeout(() => {
    void conferirCheckin().finally(agendarConferencia);
  }, espera);
}

// ---------------------------------------------------------------------------
// Chat entre colaboradores (task 213)
// ---------------------------------------------------------------------------

function janelaDeChatViva(): BrowserWindow | null {
  return janelaDeChat && !janelaDeChat.isDestroyed() ? janelaDeChat : null;
}

/** Só aceita o que veio da janela esperada: a página do Project ou a de chat, nunca outra coisa que carregue a ponte. */
function veioDe(evento: IpcMainEvent | IpcMainInvokeEvent, alvo: BrowserWindow | null): boolean {
  return alvo !== null && !alvo.isDestroyed() && evento.sender === alvo.webContents;
}

/**
 * O atalho global (e o item da bandeja): com o Project à vista abre o popup interno, com ele fora da tela abre a janela de chat, e com a janela
 * aberta a fecha. A área de transferência é lida aqui, no instante do atalho, e só vai à página; quem decide se é código é o front.
 */
function acionarChat(): void {
  const acao = decidirAtalho({ janelaDeChatAberta: janelaDeChatViva() !== null, principalVisivel: !principalMinimizada() });
  if (acao === 'FECHAR_JANELA') {
    fecharJanelaDeChat();
    return;
  }
  const texto = prepararAreaDeTransferencia(clipboard.readText());
  if (acao === 'ABRIR_POPUP_INTERNO') {
    janela?.focus();
    janela?.webContents.send('chat:atalho', { areaDeTransferencia: texto });
    return;
  }
  rascunhoPendente = texto;
  abrirJanelaDeChat(null);
}

/** A janela flutuante do chat: pequena, sem moldura, sempre por cima, no canto do monitor onde está o cursor; carrega a rota `/chat-popup`. */
function abrirJanelaDeChat(conversa: ConversaDoChat | null): void {
  const existente = janelaDeChatViva();
  if (existente) {
    if (conversa) existente.webContents.send('chat:abrir-conversa', conversa);
    existente.show();
    existente.focus();
    return;
  }
  const lugar = posicaoDaJanelaDeChat(screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea, LARGURA_DO_CHAT, ALTURA_DO_CHAT);
  const nova = new BrowserWindow({
    ...lugar,
    title: 'Chat com colegas',
    icon: caminhoDoIcone,
    show: false,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#18181b' : '#ffffff',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: !app.isPackaged },
  });
  janelaDeChat = nova;
  // Acima de qualquer outra janela, inclusive de programas em tela cheia.
  nova.setAlwaysOnTop(true, 'screen-saver');
  nova.once('ready-to-show', () => {
    nova.show();
    nova.focus();
  });
  // Arrasta à vontade, mas sem sair do monitor.
  nova.on('moved', () => {
    if (nova.isDestroyed()) return;
    const atual = nova.getBounds();
    const dentro = limitarAoMonitor(atual, screen.getDisplayMatching(atual).workArea);
    if (dentro.x !== atual.x || dentro.y !== atual.y) nova.setBounds(dentro);
  });
  nova.webContents.setWindowOpenHandler(({ url }) => {
    if (destinoDaNavegacao(url, urlDoProject) === 'navegador') void shell.openExternal(url);
    return { action: 'deny' };
  });
  nova.webContents.on('will-navigate', (evento, url) => {
    evento.preventDefault();
    if (destinoDaNavegacao(url, urlDoProject) === 'navegador') void shell.openExternal(url);
  });
  // Com o front fora do ar a janela ficaria em branco e sem moldura: fecha, e o atalho abre de novo quando ele voltar.
  nova.webContents.on('did-fail-load', (_evento, _codigo, _descricao, _url, principal) => {
    if (principal) fecharJanelaDeChat();
  });
  nova.on('closed', () => {
    janelaDeChat = null;
    rascunhoPendente = null;
    conversaDaJanelaDeChat = null;
  });
  void nova.loadURL(enderecoDaJanelaDeChat(urlDoProject, conversa));
}

/** Destrói a janela de chat: ela não fica escondida com uma sessão do chat aberta. */
function fecharJanelaDeChat(): void {
  const viva = janelaDeChatViva();
  if (viva) viva.destroy();
  janelaDeChat = null;
  rascunhoPendente = null;
  conversaDaJanelaDeChat = null;
}

/** Notificação do sistema de uma mensagem nova com o Project oculto; o clique abre a janela de chat naquela conversa. */
function mostrarNotificacao(aviso: AvisoDoChat): void {
  if (!Notification.isSupported()) return;
  const notificacao = new Notification({
    title: aviso.mencionaVoce ? `${aviso.usuarioNome} mencionou você` : aviso.usuarioNome,
    body: aviso.texto,
    icon: caminhoDoIcone,
    silent: !aviso.som,
  });
  notificacoesNaTela.add(notificacao);
  const soltar = () => notificacoesNaTela.delete(notificacao);
  notificacao.on('click', () => {
    soltar();
    abrirJanelaDeChat({ usuarioId: aviso.usuarioId, usuarioNome: aviso.usuarioNome });
  });
  notificacao.on('close', soltar);
  notificacao.on('failed', soltar);
  notificacao.show();
}

/** Põe o atalho global como a preferência manda; o que o sistema recusa (em uso por outro programa) fica "indisponível" e é tentado de novo na próxima conferência. */
function sincronizarAtalho(desejado: string | null): void {
  atalhoDesejado = desejado;
  const plano = planoDoAtalho(atalhoRegistrado, desejado);
  if (plano.soltar) {
    globalShortcut.unregister(plano.soltar);
    atalhoRegistrado = null;
  }
  if (!plano.registrar) return;
  try {
    if (globalShortcut.register(plano.registrar, acionarChat)) atalhoRegistrado = plano.registrar;
  } catch {
    // Combinação que o Electron não entende: fica indisponível.
  }
}

/** Lê a preferência do usuário no backend e ajusta o atalho; sem login o atalho sai e a janela de chat fecha (outro usuário pode entrar). */
async function conferirChat(): Promise<void> {
  // Sem o Project carregado (página de falha, recarregando) não dá para saber se há login: nada muda até ele voltar.
  if (!janela || janela.isDestroyed() || janela.webContents.getURL() === '' || janela.webContents.getURL().startsWith('data:')) return;
  const token = await lerTokenDoLogin();
  if (!token) {
    sincronizarAtalho(null);
    fecharJanelaDeChat();
    return;
  }
  const preferencia = lerPreferenciaDoChat(await chamarApi('mensagem-direta/preferencia', token));
  if (preferencia) sincronizarAtalho(preferencia.atalhoGlobal);
}

function agendarConferenciaDoChat(espera: number): void {
  if (conferenciaDoChat) clearTimeout(conferenciaDoChat);
  conferenciaDoChat = setTimeout(() => {
    void conferirChat().finally(() => agendarConferenciaDoChat(CONFERENCIA_DO_CHAT_MS));
  }, espera);
}

ipcMain.on('chat:avisar', (evento, corpo) => {
  if (!veioDe(evento, janela)) return;
  const aviso = lerAvisoDoChat(corpo);
  if (!aviso) return;
  if (janelaDeChatViva() && conversaDaJanelaDeChat === aviso.usuarioId) return;
  mostrarNotificacao(aviso);
});
ipcMain.on('chat:conversa', (evento, valor) => {
  if (!veioDe(evento, janelaDeChat)) return;
  conversaDaJanelaDeChat = lerConversaAbertaDoChat(valor);
});
ipcMain.handle('chat:pegar-rascunho', (evento) => {
  if (!veioDe(evento, janelaDeChat)) return null;
  const rascunho = rascunhoPendente;
  rascunhoPendente = null;
  return rascunho;
});
ipcMain.on('chat:fechar', (evento) => {
  if (veioDe(evento, janelaDeChat)) fecharJanelaDeChat();
});
ipcMain.on('chat:abrir-no-project', (evento, valor) => {
  if (!veioDe(evento, janelaDeChat)) return;
  const caminho = lerCaminhoDoProject(valor);
  if (!caminho) return;
  fecharJanelaDeChat();
  trazerParaAFrente();
  janela?.webContents.send('chat:navegar', { caminho });
});
ipcMain.handle('chat:situacao-do-atalho', (evento) => (veioDe(evento, janela) ? { atalho: atalhoDesejado, registrado: atalhoRegistrado !== null } : { atalho: null, registrado: false }));

ipcMain.on('checkin:encerrar', (evento) => {
  if (janelinha && !janelinha.isDestroyed() && evento.sender === janelinha.webContents) fecharJanelinha();
});

app.on('second-instance', trazerParaAFrente);
app.on('will-quit', () => globalShortcut.unregisterAll());

app.setAppUserModelId('br.com.project20.desktop');

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  criarJanela();
  criarBandeja();
  avisarSeAtualizou();
  agendarConferencia();
  agendarConferenciaDoChat(PRIMEIRA_CONFERENCIA_DO_CHAT_MS);
});

// Fechar a janela não encerra o app: ele fica na bandeja até "Fechar completamente".
app.on('window-all-closed', () => {
  if (encerramento.saidaConfirmada || encerramento.encerramentoDoSistema) app.quit();
});
