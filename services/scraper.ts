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
      // Lojas
      'tokstok.com.br':        'Tok&Stok',
      'madeiramadeira.com.br': 'MadeiraMadeira',
      'leroymerlin.com.br':    'Leroy Merlin',
      'etna.com.br':           'Etna',
      'westwing.com.br':       'Westwing',
      'mobly.com.br':          'Mobly',
      'amazon.com.br':         'Amazon',
      'ikea.com':              'IKEA',
      'camicado.com.br':       'Camicado',
      'lojanathalia.com.br':   'Loja Nathalia',
      'atelierclassico.com.br': 'Atelier Clássico',
      'casavee.com.br':         'Casavee',
      'decovie.com.br':         'DécoVie',
      'ideastore.com.br':       'Idea Store',
      'abracasa.com.br':        'Abra Casa',
      'pingoo.com.br':          'Pingoo',
      'tramontina.com.br':      'Tramontina',
      'electrolux.com.br':      'Electrolux',
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

// ── Scraping via JSON-LD + Open Graph (funciona no nativo) ──
async function scrapeViaJsonLd(url: string): Promise<ScrapedProduct | null> {
  try {
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    clearTimeout(timeout)

    if (!response.ok) return null

    const html  = await response.text()
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

            const priceRaw = product.offers?.price
              ?? product.offers?.lowPrice
              ?? product.offers?.offers?.[0]?.price
              ?? null

            const price = priceRaw ? parseFloat(String(priceRaw)) : 0

            return {
              name:        product.name,
              price,
              image_uri,
              description: product.description ?? null,
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

    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)?.[1]

    const ogPrice = html.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([^"']+)["']/i)?.[1]

    if (ogTitle) {
      return {
        name:        ogTitle.trim(),
        price:       ogPrice ? parsePrice(ogPrice) : 0,
        image_uri:   ogImage ?? null,
        description: ogDesc  ?? null,
        store,
        link:        url,
      }
    }

    // ── Último recurso: título da página ───────────────
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch?.[1]) {
      return {
        name:        titleMatch[1].trim(),
        price:       0,
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

// ── Função principal exportada ─────────────────────────
export async function scrapeProduct(url: string): Promise<ScrapedProduct | null> {
  if (!url || !url.startsWith('http')) return null
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