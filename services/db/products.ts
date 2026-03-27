import db from './database'

export interface Category {
  id:         number
  project_id: number
  name:       string
  order_idx:  number
}

export interface ProductVariation {
  label: string   // ex: "Cor"
  value: string   // ex: "Cinza Chumbo"
}

export interface Product {
  id:          number
  category_id: number
  name:        string
  description: string | null
  variations:  string | null  // JSON stringificado de ProductVariation[]
  notes:       string | null
  image_uri:   string | null
  link:        string | null
  price:       number
  quantity:    number
  store:       string | null
  created_at:  string
}

// ── Helpers de variações ───────────────────────────────
export function parseVariations(json: string | null): ProductVariation[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

export function stringifyVariations(variations: ProductVariation[]): string {
  return JSON.stringify(variations)
}

// ── CATEGORIES ────────────────────────────────────────
export async function getCategoriesByProject(
  projectId: number
): Promise<Category[]> {
  return await db.getAllAsync<Category>(
    `SELECT * FROM categories WHERE project_id = ? ORDER BY order_idx ASC`,
    [projectId]
  )
}

export async function createCategory(
  projectId: number,
  name: string,
  order: number
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO categories (project_id, name, order_idx) VALUES (?, ?, ?)`,
    [projectId, name, order]
  )
  return result.lastInsertRowId
}

export async function updateCategory(
  id: number,
  name: string
): Promise<void> {
  await db.runAsync(
    `UPDATE categories SET name = ? WHERE id = ?`,
    [name, id]
  )
}

export async function reorderCategories(
  ids: number[]
): Promise<void> {
  await Promise.all(
    ids.map((id, idx) =>
      db.runAsync(
        `UPDATE categories SET order_idx = ? WHERE id = ?`,
        [idx, id]
      )
    )
  )
}

export async function deleteCategory(id: number): Promise<void> {
  await db.runAsync(`DELETE FROM categories WHERE id = ?`, [id])
}

// ── PRODUCTS ──────────────────────────────────────────
export async function getProductsByCategory(
  categoryId: number
): Promise<Product[]> {
  return await db.getAllAsync<Product>(
    `SELECT * FROM products WHERE category_id = ? ORDER BY created_at ASC`,
    [categoryId]
  )
}

export async function getProductsByProject(
  projectId: number
): Promise<Product[]> {
  return await db.getAllAsync<Product>(
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
  const result = await db.runAsync(
    `INSERT INTO products
       (category_id, name, description, variations, notes, image_uri, link, price, quantity, store)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.category_id,
      data.name,
      data.description ?? null,
      data.variations  ?? null,
      data.notes       ?? null,
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
  await db.runAsync(
    `UPDATE products SET
       name        = COALESCE(?, name),
       description = COALESCE(?, description),
       variations  = COALESCE(?, variations),
       notes       = COALESCE(?, notes),
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
      data.notes       ?? null,
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
  await db.runAsync(`DELETE FROM products WHERE id = ?`, [id])
}

export async function getCategoryTotal(categoryId: number): Promise<number> {
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT SUM(price * quantity) as total FROM products WHERE category_id = ?`,
    [categoryId]
  )
  return result?.total ?? 0
}