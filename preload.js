const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  printToPDF: (html) => ipcRenderer.invoke('print-to-pdf', html),
  openFile:   (filePath) => ipcRenderer.invoke('open-file', filePath),
})
