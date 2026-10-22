import { contextBridge, ipcRenderer } from 'electron';

/** Registra um ouvinte de um canal do desktop e devolve a função que o remove. */
function ouvir<T>(canal: string, ouvinte: (dados: T) => void): () => void {
  const encaminhar = (_evento: unknown, dados: T) => ouvinte(dados);
  ipcRenderer.on(canal, encaminhar);
  return () => ipcRenderer.removeListener(canal, encaminhar);
}

/**
 * A ponte mínima entre a página do Project e o desktop; no navegador `projectDesktop` não existe. Só funções nomeadas: a página nunca recebe o
 * `ipcRenderer`, e o `main` valida o formato e quem enviou.
 *
 * - Check-in (task 160): `encerrarCheckin()` avisa que terminou, para o desktop fechar a janelinha.
 * - Chat entre colaboradores (task 213): `aoPedirChat` (o atalho foi apertado com o Project à vista), `aoPedirNavegacao` (a janela de chat pediu uma
 *   rota no Project), `avisarMensagem` (notificação do sistema), `pegarRascunho` / `aoPedirConversa` / `fecharChat` / `abrirNoProject` (janela de chat)
 *   e `aoMudarVisibilidade` (a janela do Project foi oculta ou voltou), `informarConversa` (a conversa à vista na janela de chat) e
 *   `situacaoDoAtalho` (para o menu de notificações mostrar se o atalho foi registrado).
 */
contextBridge.exposeInMainWorld('projectDesktop', {
  encerrarCheckin: () => ipcRenderer.send('checkin:encerrar'),
  aoPedirChat: (ouvinte: (pedido: { areaDeTransferencia: string | null }) => void) => ouvir('chat:atalho', ouvinte),
  aoPedirNavegacao: (ouvinte: (pedido: { caminho: string }) => void) => ouvir('chat:navegar', ouvinte),
  aoPedirConversa: (ouvinte: (pedido: { usuarioId: number; usuarioNome: string }) => void) => ouvir('chat:abrir-conversa', ouvinte),
  aoMudarVisibilidade: (ouvinte: (estado: { oculta: boolean }) => void) => ouvir('janela:visibilidade', ouvinte),
  informarConversa: (usuarioId: number | null) => ipcRenderer.send('chat:conversa', usuarioId),
  avisarMensagem: (aviso: { usuarioId: number; usuarioNome: string; texto: string; mencionaVoce: boolean; som: boolean }) => ipcRenderer.send('chat:avisar', aviso),
  pegarRascunho: (): Promise<string | null> => ipcRenderer.invoke('chat:pegar-rascunho'),
  fecharChat: () => ipcRenderer.send('chat:fechar'),
  abrirNoProject: (caminho: string) => ipcRenderer.send('chat:abrir-no-project', caminho),
  situacaoDoAtalho: (): Promise<{ atalho: string | null; registrado: boolean }> => ipcRenderer.invoke('chat:situacao-do-atalho'),
});
