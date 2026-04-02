// services/db/fileStore.ts
// Armazenamento persistente via arquivo JSON (Electron) com cache em memória.
// Migra automaticamente dados do localStorage na primeira execução.

export interface AppStore {
  projects:   any[]
  categories: any[]
  products:   any[]
}

let _cache: AppStore | null = null

function el(): any {
  return (window as any).electron
}

function safeJsonParse(key: string): any[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') }
  catch { return [] }
}

export async function readStore(): Promise<AppStore> {
  if (_cache) return _cache

  const data: AppStore | null = await el()?.readData?.() ?? null

  if (data && Array.isArray(data.projects)) {
    _cache = {
      projects:   data.projects   ?? [],
      categories: data.categories ?? [],
      products:   data.products   ?? [],
    }
    return _cache
  }

  // Primeira execução ou arquivo ausente: migrar do localStorage
  _cache = {
    projects:   safeJsonParse('apduo_projects'),
    categories: safeJsonParse('apduo_categories'),
    products:   safeJsonParse('apduo_products'),
  }
  await writeStore(_cache)
  localStorage.removeItem('apduo_projects')
  localStorage.removeItem('apduo_categories')
  localStorage.removeItem('apduo_products')
  return _cache
}

export async function writeStore(store: AppStore): Promise<void> {
  _cache = { ...store }
  await el()?.writeData?.(store)
}

/** Invalida o cache em memória (usar após trocar a pasta de dados). */
export function invalidateCache(): void {
  _cache = null
}