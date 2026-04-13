const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  printToPDF:     (html, fileName) => ipcRenderer.invoke('print-to-pdf', html, fileName),
  openFile:       (filePath) => ipcRenderer.invoke('open-file', filePath),
  clearCache:     ()         => ipcRenderer.invoke('clear-cache'),
  getTempDir:     ()         => ipcRenderer.invoke('get-temp-dir'),
  // PDFs
  getPdfPath:     ()         => ipcRenderer.invoke('get-pdf-path'),
  setPdfPath:     (folder)   => ipcRenderer.invoke('set-pdf-path', folder),
  pickPdfFolder:  ()         => ipcRenderer.invoke('pick-pdf-folder'),
  // Dados persistentes
  getDataPath:    ()         => ipcRenderer.invoke('get-data-path'),
  readData:       ()         => ipcRenderer.invoke('read-data'),
  writeData:      (data)     => ipcRenderer.invoke('write-data', data),
  pickDataFolder: ()         => ipcRenderer.invoke('pick-data-folder'),
  setDataPath:    (folder)   => ipcRenderer.invoke('set-data-path', folder),
  openDataFolder:  ()        => ipcRenderer.invoke('open-data-folder'),
  // Scraping com JS
  scrapeProduct:   (url)     => ipcRenderer.invoke('scrape-product', url),
})

// ── Drag region + estilos globais ─────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Elemento que permite arrastar a janela pelo topo
  const drag = document.createElement('div')
  drag.id = '__drag'
  document.body.appendChild(drag)

  const style = document.createElement('style')
  style.textContent = `
    #__drag {
      position: fixed;
      top: 0;
      left: 0;
      /* A direita fica livre para os botões nativos (~150px) */
      width: calc(100% - 150px);
      height: 40px;
      -webkit-app-region: drag;
      z-index: 10000;
    }

    /* Elementos interativos nunca bloqueiam cliques por causa do drag */
    button, a, input, select, textarea,
    [role="button"], [role="link"], [role="menuitem"],
    [role="tab"], [role="checkbox"], [role="radio"],
    [role="slider"], [role="switch"] {
      -webkit-app-region: no-drag;
    }
  `
  document.head.appendChild(style)
})