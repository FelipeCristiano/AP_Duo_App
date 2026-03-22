import db from './database'

export interface Category {
  id:         number
  project_id: number
  name:       string
  order_idx:  number
}

export interface Product {
  id:          number
  category_id: number
  name:        string
  description: string
  image_uri:   string | null
  link:        string | null
  price:       number
  quantity:    number
  store:       string | null
  created_at:  string
}

// ── CATEGORIES ──────────────────────────────────────
export async function getCategoriesByProject(projectId: number): Promise<Category[]> {
  return await db.getAllAsync<Category>(
    `SELECT * FROM categories WHERE project_id = ? ORDER BY order_idx ASC`, [projectId]
  )
}

export async function createCategory(projectId: number, name: string, order: number): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO categories (project_id, name, order_idx) VALUES (?, ?, ?)`,
    [projectId, name, order]
  )
  return result.lastInsertRowId
}

export async function deleteCategory(id: number): Promise<void> {
  await db.runAsync(`DELETE FROM categories WHERE id = ?`, [id])
}

// ── PRODUCTS ─────────────────────────────────────────
export async function getProductsByCategory(categoryId: number): Promise<Product[]> {
  return await db.getAllAsync<Product>(
    `SELECT * FROM products WHERE category_id = ? ORDER BY created_at ASC`, [categoryId]
  )
}

export async function getProductsByProject(projectId: number): Promise<Product[]> {
  return await db.getAllAsync<Product>(
    `SELECT p.* FROM products p
     JOIN categories c ON p.category_id = c.id
     WHERE c.project_id = ?
     ORDER BY c.order_idx ASC, p.created_at ASC`, [projectId]
  )
}

export async function createProduct(data: Omit<Product, 'id' | 'created_at'>): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO products (category_id, name, description, image_uri, link, price, quantity, store)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.category_id, data.name, data.description,
     data.image_uri, data.link, data.price, data.quantity, data.store]
  )
  return result.lastInsertRowId
}

export async function updateProduct(id: number, data: Partial<Product>): Promise<void> {
  await db.runAsync(
    `UPDATE products SET
       name        = COALESCE(?, name),
       description = COALESCE(?, description),
       image_uri   = COALESCE(?, image_uri),
       link        = COALESCE(?, link),
       price       = COALESCE(?, price),
       quantity    = COALESCE(?, quantity),
       store       = COALESCE(?, store)
     WHERE id = ?`,
    [
      data.name        ?? null,
      data.description ?? null,
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

export async function getProjectTotal(projectId: number): Promise<number> {
  const result = await db.getFirstAsync<{ total: number }>(
    `SELECT SUM(p.price * p.quantity) as total
     FROM products p
     JOIN categories c ON p.category_id = c.id
     WHERE c.project_id = ?`, [projectId]
  )
  return result?.total ?? 0
}