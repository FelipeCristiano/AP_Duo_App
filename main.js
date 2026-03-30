const { app, BrowserWindow, session, protocol, ipcMain, shell } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const os = require('os')

let mainWindow
let server

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const types = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf':  'font/ttf',
    '.webp': 'image/webp',
  }
  return types[ext] || 'application/octet-stream'
}

function startServer() {
  const distPath = path.join(__dirname, 'dist')

  server = http.createServer((req, res) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    res.setHeader('Access-Control-Allow-Origin', '*')

    let filePath = path.join(distPath, new URL(req.url, 'http://localhost').pathname)

    if (!path.extname(filePath) || !fs.existsSync(filePath)) {
      filePath = path.join(distPath, 'index.html')
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404)
        res.end('Not found')
        return
      }
      res.writeHead(200, { 'Content-Type': getMimeType(filePath) })
      res.end(data)
    })
  })

  server.listen(0, '127.0.0.1')

  return new Promise(resolve => {
    server.on('listening', () => {
      const { port } = server.address()
      resolve(port)
    })
  })
}

function setSecurityHeaders() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy':  ['same-origin'],
        'Access-Control-Allow-Origin': ['*'],
      },
    })
  })
}

ipcMain.handle('print-to-pdf', async (_event, html) => {
  const tmpHtml = path.join(os.tmpdir(), `apduo_print_${Date.now()}.html`)
  const tmpPdf  = path.join(os.tmpdir(), `APduo_${Date.now()}.pdf`)

  fs.writeFileSync(tmpHtml, html, 'utf-8')

  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })

  await win.loadFile(tmpHtml)
  await new Promise(r => setTimeout(r, 600))

  const pdfData = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: { marginType: 'none' },
  })

  win.close()
  fs.unlinkSync(tmpHtml)
  fs.writeFileSync(tmpPdf, pdfData)

  return tmpPdf
})

ipcMain.handle('open-file', async (_event, filePath) => {
  await shell.openPath(filePath)
})

async function createWindow() {
  const isDev = !app.isPackaged

  setSecurityHeaders()

  // Permite carregar imagens locais (galeria do usuário)
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      callback(true)
    }
  )

  let startUrl

  if (isDev) {
    startUrl = 'http://localhost:8081'
  } else {
    const port = await startServer()
    startUrl = `http://127.0.0.1:${port}`
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    resizable: true,
    title: 'APduo',
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,        // ← permite carregar imagens locais
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  mainWindow.loadURL(startUrl)
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (server) server.close()
  if (process.platform !== 'darwin') app.quit()
})