import { getDb, isWeb } from './database'
import { readStore, writeStore } from './fileStore'

export interface Category {
  id:         number
  project_id: number
  name:       string
  order_idx:  number
}

export interface ProductVariation {
  label: string
  value: string
}

export interface Product {
  id:          number
  category_id: number
  name:        string
  description: string | null
  variations:  string | null
  image_uri:   string | null
  link:        string | null
  price:       number
  quantity:    number
  store:       string | null
  created_at:  string
}

// ── Helpers variações ──────────────────────────────────
export function parseVariations(json: string | null): ProductVariation[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

export function stringifyVariations(v: ProductVariation[]): string {
  return JSON.stringify(v)
}

// ── Web/Electron storage helpers ───────────────────────
async function webGetCategories(): Promise<Category[]> {
  return (await readStore()).categories as Category[]
}

async function webSaveCategories(cats: Category[]): Promise<void> {
  const store = await readStore()
  await writeStore({ ...store, categories: cats })
}

async function webGetProducts(): Promise<Product[]> {
  return (await readStore()).products as Product[]
}

async function webSaveProducts(prods: Product[]): Promise<void> {
  const store = await readStore()
  await writeStore({ ...store, products: prods })
}

function webNextId(items: { id: number }[]): number {
  return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1
}

// ── CATEGORIES ────────────────────────────────────────
export async function getCategoriesByProject(
  projectId: number
): Promise<Category[]> {
  if (isWeb) return (await webGetCategories())
    .filter(c => c.project_id === projectId)
    .sort((a, b) => a.order_idx - b.order_idx)
  return await getDb().getAllAsync<Category>(
    `SELECT * FROM categories WHERE project_id = ? ORDER BY order_idx ASC`,
    [projectId]
  )
}

export async function createCategory(
  projectId: number,
  name: string,
  order: number
): Promise<number> {
  if (isWeb) {
    const cats = await webGetCategories()
    const id = webNextId(cats)
    cats.push({ id, project_id: projectId, name, order_idx: order })
    await webSaveCategories(cats)
    return id
  }
  const result = await getDb().runAsync(
    `INSERT INTO categories (project_id, name, order_idx) VALUES (?, ?, ?)`,
    [projectId, name, order]
  )
  return result.lastInsertRowId
}

export async function updateCategory(
  id: number,
  name: string
): Promise<void> {
  if (isWeb) {
    const cats = await webGetCategories()
    const idx = cats.findIndex(c => c.id === id)
    if (idx !== -1) { cats[idx].name = name; await webSaveCategories(cats) }
    return
  }
  await getDb().runAsync(
    `UPDATE categories SET name = ? WHERE id = ?`, [name, id]
  )
}

export async function deleteCategory(id: number): Promise<void> {
  if (isWeb) {
    await webSaveCategories((await webGetCategories()).filter(c => c.id !== id))
    await webSaveProducts((await webGetProducts()).filter(p => p.category_id !== id))
    return
  }
  await getDb().runAsync(`DELETE FROM categories WHERE id = ?`, [id])
}

export async function reorderCategories(ids: number[]): Promise<void> {
  if (isWeb) {
    const cats = await webGetCategories()
    ids.forEach((id, idx) => {
      const cat = cats.find(c => c.id === id)
      if (cat) cat.order_idx = idx
    })
    await webSaveCategories(cats)
    return
  }
  await Promise.all(
    ids.map((id, idx) =>
      getDb().runAsync(
        `UPDATE categories SET order_idx = ? WHERE id = ?`, [idx, id]
      )
    )
  )
}

// ── PRODUCTS ──────────────────────────────────────────
export async function getProductById(id: number): Promise<Product | null> {
  if (isWeb) return (await webGetProducts()).find(p => p.id === id) ?? null
  return await getDb().getFirstAsync<Product>(
    `SELECT * FROM products WHERE id = ?`, [id]
  ) ?? null
}

export async function getProductsByCategory(
  categoryId: number
): Promise<Product[]> {
  if (isWeb) return (await webGetProducts())
    .filter(p => p.category_id === categoryId)
    .sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  return await getDb().getAllAsync<Product>(
    `SELECT * FROM products WHERE category_id = ? ORDER BY created_at ASC`,
    [categoryId]
  )
}

export async function getProductsByProject(
  projectId: number
): Promise<Product[]> {
  if (isWeb) {
    const cats = (await webGetCategories()).filter(c => c.project_id === projectId)
    return (await webGetProducts())
      .filter(p => cats.some(c => c.id === p.category_id))
  }
  return await getDb().getAllAsync<Product>(
    `SELECT p.* FROM products p
     JOIN categories c ON p.category_id = c.id
     WHERE c.project_id = ?
     ORDER BY c.order_idx ASC, p.created_at ASC`,
    [projectId]
  )
}

export async function createProduct(
  data: Omit<Product, 'id' | 'created_at'>
): Promise<number> {
  if (isWeb) {
    const prods = await webGetProducts()
    const id = webNextId(prods)
    prods.push({ ...data, id, created_at: new Date().toISOString() })
    await webSaveProducts(prods)
    return id
  }
  const result = await getDb().runAsync(
    `INSERT INTO products
       (category_id, name, description, variations,
        image_uri, link, price, quantity, store)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.category_id,
      data.name,
      data.description ?? null,
      data.variations  ?? null,
      data.image_uri   ?? null,
      data.link        ?? null,
      data.price       ?? 0,
      data.quantity    ?? 1,
      data.store       ?? null,
    ]
  )
  return result.lastInsertRowId
}

export async function updateProduct(
  id: number,
  data: Partial<Product>
): Promise<void> {
  if (isWeb) {
    const prods = await webGetProducts()
    const idx = prods.findIndex(p => p.id === id)
    if (idx !== -1) {
      prods[idx] = { ...prods[idx], ...data }
      await webSaveProducts(prods)
    }
    return
  }
  await getDb().runAsync(
    `UPDATE products SET
       name        = COALESCE(?, name),
       description = COALESCE(?, description),
       variations  = COALESCE(?, variations),
       image_uri   = COALESCE(?, image_uri),
       link        = COALESCE(?, link),
       price       = COALESCE(?, price),
       quantity    = COALESCE(?, quantity),
       store       = COALESCE(?, store)
     WHERE id = ?`,
    [
      data.name        ?? null,
      data.description ?? null,
      data.variations  ?? null,
      data.image_uri   ?? null,
      data.link        ?? null,
      data.price       ?? null,
      data.quantity    ?? null,
      data.store       ?? null,
      id,
    ]
  )
}

export async function deleteProduct(id: number): Promise<void> {
  if (isWeb) {
    await webSaveProducts((await webGetProducts()).filter(p => p.id !== id))
    return
  }
  await getDb().runAsync(`DELETE FROM products WHERE id = ?`, [id])
}

export async function getCategoryTotal(categoryId: number): Promise<number> {
  if (isWeb) {
    return (await webGetProducts())
      .filter(p => p.category_id === categoryId)
      .reduce((acc, p) => acc + p.price * p.quantity, 0)
  }
  const result = await getDb().getFirstAsync<{ total: number }>(
    `SELECT SUM(price * quantity) as total FROM products WHERE category_id = ?`,
    [categoryId]
  )
  return result?.total ?? 0
}