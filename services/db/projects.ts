import db from './database'

export type ProjectStatus = 'draft' | 'active' | 'sent' | 'done'

export interface Project {
  id:          number
  name:        string
  client:      string
  description: string
  type:        string
  status:      ProjectStatus
  accent:      string
  logo_uri:    string | null
  cover_uri:   string | null
  created_at:  string
  updated_at:  string
}

export async function getAllProjects(): Promise<Project[]> {
  return await db.getAllAsync<Project>(
    `SELECT * FROM projects ORDER BY updated_at DESC`
  )
}

export async function getProjectById(id: number): Promise<Project | null> {
  return await db.getFirstAsync<Project>(
    `SELECT * FROM projects WHERE id = ?`, [id]
  )
}

export async function createProject(data: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO projects (name, client, description, type, status, accent, logo_uri, cover_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.client, data.description, data.type,
     data.status, data.accent, data.logo_uri, data.cover_uri]
  )
  return result.lastInsertRowId
}

export async function updateProject(id: number, data: Partial<Project>): Promise<void> {
  await db.runAsync(
    `UPDATE projects SET
       name        = COALESCE(?, name),
       client      = COALESCE(?, client),
       description = COALESCE(?, description),
       type        = COALESCE(?, type),
       status      = COALESCE(?, status),
       accent      = COALESCE(?, accent),
       logo_uri    = COALESCE(?, logo_uri),
       cover_uri   = COALESCE(?, cover_uri),
       updated_at  = datetime('now')
     WHERE id = ?`,
    [
      data.name        ?? null,
      data.client      ?? null,
      data.description ?? null,
      data.type        ?? null,
      data.status      ?? null,
      data.accent      ?? null,
      data.logo_uri    ?? null,
      data.cover_uri   ?? null,
      id,
    ]
  )
}

export async function deleteProject(id: number): Promise<void> {
  await db.runAsync(`DELETE FROM projects WHERE id = ?`, [id])
}

export async function getProjectStats(id: number): Promise<{ categories: number, products: number }> {
  const cats = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM categories WHERE project_id = ?`, [id]
  )
  const prods = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM products p
     JOIN categories c ON p.category_id = c.id
     WHERE c.project_id = ?`, [id]
  )
  return {
    categories: cats?.count ?? 0,
    products:   prods?.count ?? 0,
  }
}