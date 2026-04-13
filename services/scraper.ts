// services/scraper.ts

export interface ScrapedProduct {
  name:        string
  price:       number
  image_uri:   string | null
  description: string | null
  store:       string
  link:        string
}

// ── Extrai o nome da loja pela URL ─────────────────────
export function extractStore(url: string): string {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    const known: Record<string, string> = {
      'tokstok.com.br':         'Tok&Stok',
      'madeiramadeira.com.br':  'MadeiraMadeira',
      'leroymerlin.com.br':     'Leroy Merlin',
      'etna.com.br':            'Etna',
      'westwing.com.br':        'Westwing',
      'mobly.com.br':           'Mobly',
      'amazon.com.br':          'Amazon',
      'ikea.com':               'IKEA',
      'camicado.com.br':        'Camicado',
      'lojanathalia.com.br':    'Loja Nathalia',
      'atelierclassico.com.br': 'Atelier Clássico',
      'casavee.com.br':         'Casavee',
      'decovie.com.br':         'DécoVie',
      'ideastore.com.br':       'Idea Store',
      'abracasa.com.br':        'Abra Casa',
      'pingoo.com.br':          'Pingoo',
      'tramontina.com.br':      'Tramontina',
      'electrolux.com.br':      'Electrolux',
      'fastshop.com.br':        'Fast Shop',
      'americanas.com.br':      'Americanas',
      'magazineluiza.com.br':   'Magazine Luiza',
      'mercadolivre.com.br':    'Mercado Livre',
      'shoptime.com.br':        'Shoptime',
      'casasbahia.com.br':      'Casas Bahia',
      'extra.com.br':           'Extra',
    }
    return known[host] ?? host
  } catch {
    return 'Loja'
  }
}

// ── Extrai preço de string ─────────────────────────────
function parsePrice(text: string): number {
  if (!text) return 0
  const cleaned = text
    .replace(/[^\d.,]/g, '')
    .replace(/\.(\d{3})/g, '$1')
    .replace(',', '.')
  return parseFloat(cleaned) || 0
}

// ── Extrai preço de objeto offers do JSON-LD ───────────
function extractPriceFromOffers(offers: any): number {
  if (!offers) return 0
  const o = Array.isArray(offers) ? offers[0] : offers
  if (!o) return 0
  const raw = o.price
    ?? o.lowPrice
    ?? o.priceSpecification?.[0]?.price
    ?? o.offers?.[0]?.price
    ?? null
  return raw ? parseFloat(String(raw)) : 0
}

// ── Decodifica resposta respeitando charset ────────────
async function decodeResponse(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''
  const charsetMatch = contentType.match(/charset=([^\s;]+)/i)
  const charset = charsetMatch?.[1]?.replace(/"/g, '') ?? 'utf-8'

  // Charset aliases comuns
  const normalized = charset.toLowerCase().replace(/[-_]/g, '')
  if (normalized === 'utf8' || normalized === 'utf8bom') {
    return response.text()
  }

  // ISO-8859-1 e windows-1252 são comuns em sites BR antigos
  try {
    const buffer = await response.arrayBuffer()
    return new TextDecoder(charset).decode(buffer)
  } catch {
    // Fallback: tenta ler do HTML (pode ter <meta charset>)
    const buffer = await response.clone().arrayBuffer()
    const raw = new TextDecoder('utf-8').decode(buffer)
    const metaCharset = raw.match(/<meta[^>]+charset=["']?([^"';\s>]+)/i)?.[1]
    if (metaCharset && metaCharset.toLowerCase() !== 'utf-8') {
      try {
        return new TextDecoder(metaCharset).decode(buffer)
      } catch { /* ignora */ }
    }
    return raw
  }
}

// ── Extrai preço do HTML (fallback) ───────────────────
function extractPriceFromHtml(html: string): number {
  // itemprop="price" — padrão microdata
  const itemprop = html.match(/<[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<[^>]+content=["']([^"']+)["'][^>]+itemprop=["']price["']/i)?.[1]
  if (itemprop) return parsePrice(itemprop)

  // JSON em script tags: "price": 299.90 ou "price":"299,90"
  const jsonPrice = html.match(/"price"\s*:\s*"?(\d{1,6}(?:[.,]\d{1,2})?)"?/)?.[1]
  if (jsonPrice) return parsePrice(jsonPrice)

  // data-price="299.90"
  const dataPrice = html.match(/data-price=["'](\d[^"']*)/i)?.[1]
  if (dataPrice) return parsePrice(dataPrice)

  return 0
}

// ── Scraping via JSON-LD + Open Graph ──────────────────
async function scrapeViaJsonLd(url: string): Promise<ScrapedProduct | null> {
  try {
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 12000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Encoding': 'identity',
      },
    })
    clearTimeout(timeout)

    if (!response.ok) return null

    const html  = await decodeResponse(response)
    const store = extractStore(url)

    // ── Tenta JSON-LD ──────────────────────────────────
    const jsonLdMatches = html.match(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )

    if (jsonLdMatches) {
      for (const block of jsonLdMatches) {
        try {
          const content = block
            .replace(/<script[^>]*>/i, '')
            .replace(/<\/script>/i, '')
            .trim()

          const data    = JSON.parse(content)
          const entries = Array.isArray(data) ? data : [data]

          for (const entry of entries) {
            const product = entry['@type'] === 'Product'
              ? entry
              : entry['@graph']?.find?.((g: any) => g['@type'] === 'Product')

            if (!product?.name) continue

            const image_uri = Array.isArray(product.image)
              ? product.image[0]
              : typeof product.image === 'string'
                ? product.image
                : product.image?.url ?? null

            const price = extractPriceFromOffers(product.offers)

            return {
              name:        product.name,
              price,
              image_uri,
              description: null,
              store,
              link:        url,
            }
          }
        } catch { continue }
      }
    }

    // ── Fallback: Open Graph ───────────────────────────
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]

    const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]

    const ogPrice = html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']product:price:amount["']/i)?.[1]

    if (ogTitle) {
      const priceFromMeta = ogPrice ? parsePrice(ogPrice) : 0
      const price = priceFromMeta > 0 ? priceFromMeta : extractPriceFromHtml(html)
      return {
        name:        ogTitle.trim(),
        price,
        image_uri:   ogImage ?? null,
        description: null,
        store,
        link:        url,
      }
    }

    // ── Último recurso: título da página ───────────────
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch?.[1]) {
      return {
        name:        titleMatch[1].trim(),
        price:       extractPriceFromHtml(html),
        image_uri:   null,
        description: null,
        store,
        link:        url,
      }
    }

    return null
  } catch (e: any) {
    if (e?.name === 'AbortError') return null
    return null
  }
}

// ── Shopify JSON API (para URLs com ?variant=) ────────
async function scrapeShopifyVariant(url: string): Promise<ScrapedProduct | null> {
  try {
    const parsed   = new URL(url)
    const variantId = parsed.searchParams.get('variant')
    if (!variantId) return null

    // Shopify expõe /<path>.json para qualquer produto
    const productPath = parsed.pathname.replace(/\/$/, '')
    const jsonUrl     = `${parsed.origin}${productPath}.json`

    const res = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'application/json',
      },
    })
    if (!res.ok) return null

    const data    = await res.json()
    const product = data.product
    if (!product?.title) return null

    const store   = extractStore(url)
    const variant = product.variants?.find((v: any) => String(v.id) === variantId)

    // Preço: Shopify retorna como string "29900" (centavos) ou "299.00" (reais)
    let price = 0
    if (variant?.price) {
      const num = parseFloat(variant.price)
      // Se for inteiro > 500, provavelmente está em centavos
      price = Number.isInteger(num) && num > 500 ? num / 100 : num
    }

    // Nome: produto + título da variante (ex: "30x40cm")
    let name = product.title
    if (variant?.title && variant.title !== 'Default Title') {
      name += ' — ' + variant.title
    }

    // Imagem: tenta a imagem da variante primeiro
    let image_uri: string | null = null
    if (variant?.image_id) {
      const img = product.images?.find((i: any) => i.id === variant.image_id)
      image_uri = img?.src ?? null
    }
    if (!image_uri) image_uri = product.images?.[0]?.src ?? null

    return { name, price, image_uri, description: null, store, link: url }
  } catch {
    return null
  }
}

// ── Scraping via Electron BrowserWindow (executa JS) ──
async function scrapeViaElectron(url: string): Promise<ScrapedProduct | null> {
  const electron = (window as any).electron
  if (!electron?.scrapeProduct) return null

  try {
    const raw = await electron.scrapeProduct(url)
    if (!raw || raw.error) return null

    const store = extractStore(url)

    // Normaliza preço: pode vir como número ou string com "R$ 1.234,56"
    let price = 0
    if (typeof raw.price === 'number') {
      price = raw.price
    } else if (typeof raw.price === 'string' && raw.price) {
      price = parsePrice(raw.price)
    }

    if (!raw.name) return null

    return {
      name:        raw.name,
      price,
      image_uri:   raw.image_uri ?? null,
      description: null,
      store,
      link:        url,
    }
  } catch {
    return null
  }
}

// ── Função principal exportada ─────────────────────────
export async function scrapeProduct(url: string): Promise<ScrapedProduct | null> {
  if (!url || !url.startsWith('http')) return null

  // 1. Shopify JSON API — rápido e preciso para URLs com ?variant=
  const hasVariant = new URL(url).searchParams.has('variant')
  if (hasVariant) {
    const shopify = await scrapeShopifyVariant(url)
    if (shopify) return shopify
  }

  // 2. Electron BrowserWindow — executa JS, respeita variantes dinâmicas
  const electron = (window as any).electron
  if (electron?.scrapeProduct) {
    const result = await scrapeViaElectron(url)
    if (result) return result
  }

  // 3. Fallback: fetch estático (sem JS)
  return await scrapeViaJsonLd(url)
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