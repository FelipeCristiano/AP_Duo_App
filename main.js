const { app, BrowserWindow, session, protocol, ipcMain, shell, Menu, dialog } = require('electron')
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

// ── Settings & Data file management ──────────────────
const SETTINGS_PATH = path.join(app.getPath('userData'), 'apduo_settings.json')

function readSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')) }
  catch { return {} }
}

function writeSettings(s) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2), 'utf-8')
}

function getDataFilePath() {
  const s = readSettings()
  const dir = s.dataPath || app.getPath('userData')
  return path.join(dir, 'apduo_data.json')
}

ipcMain.handle('get-data-path', () => getDataFilePath())

ipcMain.handle('read-data', () => {
  const p = getDataFilePath()
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')) }
  catch { return null }
})

ipcMain.handle('write-data', (_e, data) => {
  const p = getDataFilePath()
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')
})

ipcMain.handle('pick-data-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Escolher pasta de dados',
    properties: ['openDirectory', 'createDirectory'],
  })
  return result.canceled ? null : (result.filePaths[0] ?? null)
})

ipcMain.handle('set-data-path', (_e, folderPath) => {
  const oldFile = getDataFilePath()
  const s = readSettings()
  if (folderPath === null) delete s.dataPath
  else s.dataPath = folderPath
  writeSettings(s)
  // Copy existing data file to new location
  const newFile = getDataFilePath()
  if (oldFile !== newFile && fs.existsSync(oldFile)) {
    try { fs.copyFileSync(oldFile, newFile) } catch (e) {
      console.error('Falha ao copiar dados:', e)
    }
  }
})

ipcMain.handle('open-data-folder', () => {
  const p = getDataFilePath()
  if (fs.existsSync(p)) {
    shell.showItemInFolder(p)
  } else {
    shell.openPath(path.dirname(p))
  }
})

// ── IPC existentes ────────────────────────────────────
function getPdfDir() {
  const s = readSettings()
  return s.pdfPath || app.getPath('documents')
}

ipcMain.handle('get-pdf-path', () => getPdfDir())

ipcMain.handle('set-pdf-path', (_e, folderPath) => {
  const s = readSettings()
  if (folderPath === null) delete s.pdfPath
  else s.pdfPath = folderPath
  writeSettings(s)
})

ipcMain.handle('pick-pdf-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Escolher pasta para PDFs',
    properties: ['openDirectory', 'createDirectory'],
  })
  return result.canceled ? null : (result.filePaths[0] ?? null)
})

ipcMain.handle('print-to-pdf', async (_event, html, fileName) => {
  const tmpHtml = path.join(os.tmpdir(), `apduo_print_${Date.now()}.html`)

  // Salva na pasta configurada com o nome definitivo
  const pdfDir = getPdfDir()
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true })
  const outFile = fileName
    ? path.join(pdfDir, fileName)
    : path.join(pdfDir, `APduo_${Date.now()}.pdf`)

  fs.writeFileSync(tmpHtml, html, 'utf-8')

  const win = new BrowserWindow({
    show: false,
    width: 794,
    height: 1200,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  })

  await win.loadFile(tmpHtml)

  // Aguarda document.readyState === 'complete' + todas as imagens carregadas
  await win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      function waitForImages() {
        const imgs = Array.from(document.images)
        const pending = imgs.filter(img => !img.complete)
        if (pending.length === 0) { resolve(); return }
        let done = 0
        pending.forEach(img => {
          img.addEventListener('load',  () => { if (++done >= pending.length) resolve() })
          img.addEventListener('error', () => { if (++done >= pending.length) resolve() })
        })
        setTimeout(resolve, 8000) // timeout máximo de 8s
      }
      if (document.readyState === 'complete') {
        waitForImages()
      } else {
        window.addEventListener('load', waitForImages, { once: true })
        setTimeout(resolve, 10000)
      }
    })
  `)

  // Margem adicional para fontes e layout estabilizarem
  await new Promise(r => setTimeout(r, 600))

  const pdfData = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: { marginType: 'none' },
  })

  win.close()
  fs.unlinkSync(tmpHtml)
  fs.writeFileSync(outFile, pdfData)

  return outFile
})

// ── Scraping com JS (BrowserWindow oculto) ────────────
ipcMain.handle('scrape-product', async (_event, url) => {
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: false, javascript: true },
  })

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout')), 15000)
      win.webContents.once('did-finish-load', () => {
        clearTimeout(timeout)
        resolve()
      })
      win.loadURL(url, {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }).catch(reject)
    })

    // Aguarda JS da página renderizar preços/variantes
    await new Promise(r => setTimeout(r, 2500))

    const result = await win.webContents.executeJavaScript(`
      (async () => {
        try {
          const variantId = new URLSearchParams(window.location.search).get('variant')
          const pathname  = window.location.pathname.replace(/\\/$/, '')

          // 1. Same-origin Shopify JSON API — mais confiável, sem CORS, retorna só o produto da página
          const shopifyPaths = [
            pathname,
            pathname.replace('/produtos/', '/products/'),
            pathname.replace('/products/', '/produtos/'),
          ]
          for (const p of shopifyPaths) {
            try {
              const r = await fetch(p + '.json', { headers: { Accept: 'application/json' } })
              if (!r.ok) continue
              const d = await r.json()
              const prod = d.product
              if (!prod?.title) continue

              const v = variantId
                ? prod.variants?.find(v => String(v.id) === variantId)
                : prod.variants?.[0]

              const price  = v?.price ? parseFloat(v.price) : 0
              const suffix = v?.title && v.title !== 'Default Title' ? ' — ' + v.title : ''
              const imgId  = v?.image_id
              const img    = imgId
                ? prod.images?.find(i => i.id === imgId)?.src
                : prod.images?.[0]?.src

              return { name: prod.title + suffix, price, image_uri: img || null }
            } catch {}
          }

          // 2. Shopify estado global (fallback)
          try {
            const meta = window.meta || window.__st?.a || window.ShopifyAnalytics?.meta
            if (meta?.product) {
              const variants = meta.product.variants || []
              const v = variantId
                ? variants.find(v => String(v.id) === variantId)
                : variants[0]
              if (v) {
                const price  = (v.price || 0) / 100
                const suffix = v.title && v.title !== 'Default Title' ? ' — ' + v.title : ''
                const img    = document.querySelector('meta[property="og:image"]')?.content || null
                return { name: (meta.product.title || document.title) + suffix, price, image_uri: img }
              }
            }
          } catch {}

          // 3. og:title + seletores de preço do DOM (genérico)
          const title = document.querySelector('meta[property="og:title"]')?.content?.trim() || document.title
          const image = document.querySelector('meta[property="og:image"]')?.content || null

          const priceSelectors = [
            '[data-variant-price]', '[data-product-price]',
            '.price--main .money', '.product-price__price',
            '[itemprop="price"]', '.current-price', '.sale-price',
            '.product__price', '.price-item--sale', '.price-item--regular',
            '.preco-por', '.preco-avista', '.actual-price',
          ]
          let priceRaw = ''
          for (const sel of priceSelectors) {
            const el = document.querySelector(sel)
            if (el) {
              priceRaw = el.getAttribute('content') || el.getAttribute('data-price') || el.textContent || ''
              if (/\\d/.test(priceRaw)) break
            }
          }

          return { name: title || null, price: priceRaw.trim(), image_uri: image }
        } catch (e) {
          return { error: e.message }
        }
      })()
    `)

    return result ?? null
  } catch {
    return null
  } finally {
    win.destroy()
  }
})

ipcMain.handle('open-file', async (_event, filePath) => {
  await shell.openPath(filePath)
})

ipcMain.handle('clear-cache', async () => {
  await session.defaultSession.clearCache()
})

ipcMain.handle('get-temp-dir', () => os.tmpdir())

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
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color:       '#F5F2ED',  // bg do app
      symbolColor: '#1A1A1A',  // ink do app
      height: 40,
    },
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
  Menu.setApplicationMenu(null)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (server) server.close()
  if (process.platform !== 'darwin') app.quit()
})