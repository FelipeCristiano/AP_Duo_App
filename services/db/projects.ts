import { getDb, isWeb } from './database'

export type ProjectStatus = 'draft' | 'active' | 'sent' | 'done'

export interface Project {
  id:           number
  name:         string
  client:       string
  client_email: string | null
  description:  string
  type:         string
  status:       ProjectStatus
  accent:       string
  logo_uri:     string | null
  cover_uri:    string | null
  pdf_uri:      string | null
  created_at:   string
  updated_at:   string
}

// ── Web storage helpers ────────────────────────────────
function webGetProjects(): Project[] {
  try {
    return JSON.parse(localStorage.getItem('apduo_projects') || '[]')
  } catch { return [] }
}

function webSaveProjects(projects: Project[]) {
  localStorage.setItem('apduo_projects', JSON.stringify(projects))
}

function webNextId(items: { id: number }[]): number {
  return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1
}

// ── CRUD ──────────────────────────────────────────────
export async function getAllProjects(): Promise<Project[]> {
  if (isWeb) return webGetProjects().sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
  return await getDb().getAllAsync<Project>(
    `SELECT * FROM projects ORDER BY updated_at DESC`
  )
}

export async function getProjectById(id: number): Promise<Project | null> {
  if (isWeb) return webGetProjects().find(p => p.id === id) ?? null
  return await getDb().getFirstAsync<Project>(
    `SELECT * FROM projects WHERE id = ?`, [id]
  )
}

export async function createProject(
  data: Omit<Project, 'id' | 'created_at' | 'updated_at'>
): Promise<number> {
  if (isWeb) {
    const projects = webGetProjects()
    const id = webNextId(projects)
    const now = new Date().toISOString()
    projects.push({ ...data, id, created_at: now, updated_at: now })
    webSaveProjects(projects)
    return id
  }
  const result = await getDb().runAsync(
    `INSERT INTO projects
       (name, client, client_email, description, type, status, accent, logo_uri, cover_uri, pdf_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.client,
      data.client_email  ?? null,
      data.description   ?? null,
      data.type          ?? null,
      data.status        ?? 'draft',
      data.accent        ?? '#1A1A1A',
      data.logo_uri      ?? null,
      data.cover_uri     ?? null,
      data.pdf_uri       ?? null,
    ]
  )
  return result.lastInsertRowId
}

export async function updateProject(
  id: number,
  data: Partial<Project>
): Promise<void> {
  if (isWeb) {
    const projects = webGetProjects()
    const idx = projects.findIndex(p => p.id === id)
    if (idx === -1) return
    projects[idx] = {
      ...projects[idx],
      ...data,
      updated_at: new Date().toISOString(),
    }
    webSaveProjects(projects)
    return
  }
  await getDb().runAsync(
    `UPDATE projects SET
       name         = COALESCE(?, name),
       client       = COALESCE(?, client),
       client_email = COALESCE(?, client_email),
       description  = COALESCE(?, description),
       type         = COALESCE(?, type),
       status       = COALESCE(?, status),
       accent       = COALESCE(?, accent),
       logo_uri     = COALESCE(?, logo_uri),
       cover_uri    = COALESCE(?, cover_uri),
       pdf_uri      = COALESCE(?, pdf_uri),
       updated_at   = datetime('now')
     WHERE id = ?`,
    [
      data.name         ?? null,
      data.client       ?? null,
      data.client_email ?? null,
      data.description  ?? null,
      data.type         ?? null,
      data.status       ?? null,
      data.accent       ?? null,
      data.logo_uri     ?? null,
      data.cover_uri    ?? null,
      data.pdf_uri      ?? null,
      id,
    ]
  )
}

export async function deleteProject(id: number): Promise<void> {
  if (isWeb) {
    webSaveProjects(webGetProjects().filter(p => p.id !== id))
    return
  }
  await getDb().runAsync(`DELETE FROM projects WHERE id = ?`, [id])
}

export async function getProjectStats(
  id: number
): Promise<{ categories: number; products: number }> {
  if (isWeb) {
    const cats = JSON.parse(localStorage.getItem('apduo_categories') || '[]')
      .filter((c: any) => c.project_id === id)
    const prods = JSON.parse(localStorage.getItem('apduo_products') || '[]')
      .filter((p: any) => cats.some((c: any) => c.id === p.category_id))
    return { categories: cats.length, products: prods.length }
  }
  const cats = await getDb().getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM categories WHERE project_id = ?`, [id]
  )
  const prods = await getDb().getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM products p
     JOIN categories c ON p.category_id = c.id
     WHERE c.project_id = ?`, [id]
  )
  return {
    categories: cats?.count  ?? 0,
    products:   prods?.count ?? 0,
  }
}

export async function getProjectTotal(projectId: number): Promise<number> {
  if (isWeb) {
    const cats = JSON.parse(localStorage.getItem('apduo_categories') || '[]')
      .filter((c: any) => c.project_id === projectId)
    const prods = JSON.parse(localStorage.getItem('apduo_products') || '[]')
      .filter((p: any) => cats.some((c: any) => c.id === p.category_id))
    return prods.reduce((acc: number, p: any) => acc + p.price * p.quantity, 0)
  }
  const result = await getDb().getFirstAsync<{ total: number }>(
    `SELECT SUM(p.price * p.quantity) as total
     FROM products p
     JOIN categories c ON p.category_id = c.id
     WHERE c.project_id = ?`, [projectId]
  )
  return result?.total ?? 0
}