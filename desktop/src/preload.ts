import { contextBridge, ipcRenderer } from 'electron';

/**
 * A ponte mínima entre a página do Project e o desktop. A página `/checkin` chama `encerrarCheckin()` quando terminou (descrição
 * registrada, check-ins suspensos ou nada a fazer) para o desktop fechar a janelinha; no navegador `projectDesktop` não existe.
 */
contextBridge.exposeInMainWorld('projectDesktop', {
  encerrarCheckin: () => ipcRenderer.send('checkin:encerrar'),
});
