import { Platform } from 'react-native'

export interface ScrapedProduct {
  name:        string
  price:       number
  image_uri:   string | null
  description: string | null
  store:       string
  link:        string
}

// ── Extrai o nome da loja pela URL ─────────────────────
function extractStore(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    const known: Record<string, string> = {
      'tokstok.com.br':        'Tok&Stok',
      'madeiramadeira.com.br': 'MadeiraMadeira',
      'leroymerlin.com.br':    'Leroy Merlin',
      'etna.com.br':           'Etna',
      'westwing.com.br':       'Westwing',
      'mobly.com.br':          'Mobly',
      'amazon.com.br':         'Amazon',
      'ikea.com':              'IKEA',
      'camicado.com.br':       'Camicado',
      'lojanathalia.com.br':   'Nathalia',
    }
    return known[host] ?? host
  } catch {
    return 'Loja'
  }
}

// ── Extrai preço de string ─────────────────────────────
function parsePrice(text: string): number {
  if (!text) return 0
  // Remove tudo exceto números e separadores
  const cleaned = text
    .replace(/[^\d.,]/g, '')
    .replace(/\.(\d{3})/g, '$1') // remove ponto de milhar
    .replace(',', '.')            // vírgula → ponto decimal
  return parseFloat(cleaned) || 0
}

// ── Seletores por loja ─────────────────────────────────
interface Selectors {
  name:        string[]
  price:       string[]
  image:       string[]
  description: string[]
}

function getSelectors(url: string): Selectors {
  const host = new URL(url).hostname

  if (host.includes('tokstok')) return {
    name:        ['h1.product-name', 'h1[class*="name"]', 'h1'],
    price:       ['[class*="price"] [class*="value"]', '[class*="Price"]', '.price'],
    image:       ['[class*="gallery"] img', '.product-image img', 'img[class*="product"]'],
    description: ['[class*="description"]', '[class*="detail"]', '.description'],
  }

  if (host.includes('madeiramadeira')) return {
    name:        ['h1[class*="Title"]', 'h1[class*="title"]', 'h1'],
    price:       ['[class*="Price__value"]', '[class*="price"]', '[data-testid*="price"]'],
    image:       ['[class*="Carousel"] img', '[class*="gallery"] img', 'img[class*="Product"]'],
    description: ['[class*="Description"]', '[class*="description"]'],
  }

  if (host.includes('leroymerlin')) return {
    name:        ['h1[class*="product"]', 'h1[class*="heading"]', 'h1'],
    price:       ['[class*="price__value"]', '[class*="Price"]', '.price'],
    image:       ['[class*="carousel"] img', '.product-media img', 'img[class*="product"]'],
    description: ['[class*="description"]', '[class*="tab-content"]'],
  }

  if (host.includes('westwing')) return {
    name:        ['h1[class*="ProductTitle"]', 'h1[class*="title"]', 'h1'],
    price:       ['[class*="Price__amount"]', '[class*="price"]'],
    image:       ['[class*="Carousel__image"]', '[class*="gallery"] img', 'img[class*="product"]'],
    description: ['[class*="Description"]', '[class*="description"]'],
  }

  if (host.includes('mobly')) return {
    name:        ['h1[class*="product-name"]', 'h1'],
    price:       ['[class*="best-price"]', '[class*="price"]'],
    image:       ['[class*="gallery-image"] img', 'img[class*="product"]'],
    description: ['[class*="description"]'],
  }

  // Seletores genéricos para qualquer loja
  return {
    name: [
      'h1[class*="product"]', 'h1[class*="title"]',
      'h1[class*="name"]', 'h1',
    ],
    price: [
      '[class*="price"][class*="value"]', '[class*="Price"][class*="value"]',
      '[itemprop="price"]', '[class*="price"]', '[class*="Price"]',
    ],
    image: [
      '[class*="gallery"] img[src*="product"]',
      '[class*="carousel"] img',
      'img[class*="product"]',
      'img[class*="main"]',
      'main img',
    ],
    description: [
      '[class*="description"]', '[class*="Description"]',
      '[itemprop="description"]', '[class*="detail"]',
    ],
  }
}

// ── Extrai valor de um seletor numa lista ──────────────
function extractText(doc: Document, selectors: string[]): string | null {
  for (const sel of selectors) {
    try {
      const el = doc.querySelector(sel)
      const text = el?.textContent?.trim()
      if (text && text.length > 1) return text
    } catch { continue }
  }
  return null
}

function extractImage(doc: Document, selectors: string[]): string | null {
  for (const sel of selectors) {
    try {
      const el = doc.querySelector(sel) as HTMLImageElement | null
      const src = el?.src || el?.getAttribute('data-src') || el?.getAttribute('data-lazy-src')
      if (src && src.startsWith('http')) return src
    } catch { continue }
  }
  return null
}

// ── Scraping via fetch (tentativa rápida) ──────────────
async function scrapeViaFetch(url: string): Promise<ScrapedProduct | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) return null

    const html = await response.text()

    // Usa DOMParser apenas no Web
    if (Platform.OS !== 'web') return null
    if (typeof window === 'undefined' || !window.DOMParser) return null

    const parser = new DOMParser()
    const doc    = parser.parseFromString(html, 'text/html')
    const sels   = getSelectors(url)
    const store  = extractStore(url)

    // Tenta extrair via Open Graph (mais confiável)
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
    const ogDesc  = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
    const ogPrice = doc.querySelector('meta[property="product:price:amount"]')?.getAttribute('content')
      ?? doc.querySelector('meta[property="og:price:amount"]')?.getAttribute('content')

    const name        = ogTitle        ?? extractText(doc, sels.name)
    const image_uri   = ogImage        ?? extractImage(doc, sels.image)
    const description = ogDesc         ?? extractText(doc, sels.description)
    const priceRaw    = ogPrice        ?? extractText(doc, sels.price)
    const price       = parsePrice(priceRaw ?? '')

    if (!name) return null

    return { name, price, image_uri, description, store, link: url }
  } catch {
    return null
  }
}

// ── Scraping via JSON-LD (dados estruturados) ──────────
async function scrapeViaJsonLd(url: string): Promise<ScrapedProduct | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const html = await response.text()
    if (Platform.OS !== 'web') return null

    const parser  = new DOMParser()
    const doc     = parser.parseFromString(html, 'text/html')
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]')
    const store   = extractStore(url)

    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent ?? '')
        const product = Array.isArray(data)
          ? data.find((d: any) => d['@type'] === 'Product')
          : data['@type'] === 'Product' ? data : null

        if (!product) continue

        const name      = product.name
        const image_uri = Array.isArray(product.image)
          ? product.image[0]
          : product.image ?? null
        const description = product.description ?? null
        const priceSpec   = product.offers?.price
          ?? product.offers?.lowPrice
          ?? null
        const price = priceSpec ? parseFloat(String(priceSpec)) : 0

        if (name) return { name, price, image_uri, description, store, link: url }
      } catch { continue }
    }
    return null
  } catch {
    return null
  }
}

// ── Função principal exportada ─────────────────────────
export async function scrapeProduct(url: string): Promise<ScrapedProduct | null> {
  if (!url || !url.startsWith('http')) return null

  // 1. Tenta JSON-LD (mais confiável e rápido)
  const jsonLd = await scrapeViaJsonLd(url)
  if (jsonLd?.name) return jsonLd

  // 2. Fallback: Open Graph + seletores CSS
  const fetched = await scrapeViaFetch(url)
  if (fetched?.name) return fetched

  return null
}

// ── Validação de URL ───────────────────────────────────
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}