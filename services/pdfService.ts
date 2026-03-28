// services/pdfService.ts
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { getProjectById } from './db/projects'
import { getCategoriesByProject, getProductsByCategory } from './db/products'
import { buildPdfHtml, RoomSection } from './pdfTemplate'

export interface PdfGenerationResult {
  uri:      string
  fileName: string
}

// ── Converte URI para base64 sem expo-file-system ─────
async function toBase64(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null
  try {
    if (uri.startsWith('data:')) return uri

    const response = await fetch(uri)
    if (!response.ok) return null

    const blob   = await response.blob()
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror   = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ── Gera o PDF completo ───────────────────────────────
export async function generateProjectPdf(
  projectId: number
): Promise<PdfGenerationResult> {

  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Projeto ${projectId} não encontrado`)

  const categories = await getCategoriesByProject(projectId)
  if (categories.length === 0) throw new Error('Projeto sem cômodos cadastrados')

  const coverBase64 = await toBase64(project.cover_uri)

  const roomSections: RoomSection[] = []

  for (const category of categories) {
    const products = await getProductsByCategory(category.id)
    if (products.length === 0) continue

    const mappedProducts = await Promise.all(
      products.slice(0, 8).map(async p => ({
        name:        p.name,
        store:       p.store       ?? null,
        description: p.description ?? null,
        variations:  p.variations  ?? null,
        notes:       p.notes       ?? null,
        quantity:    p.quantity    ?? 1,
        price:       p.price       ?? 0,
        imageBase64: await toBase64(p.image_uri),
      }))
    )

    roomSections.push({ name: category.name, products: mappedProducts })
  }

  if (roomSections.length === 0) {
    throw new Error('Nenhum produto encontrado nos cômodos')
  }

  const total = roomSections.reduce(
    (sum, r) => sum + r.products.reduce((s, p) => s + p.price * p.quantity, 0),
    0
  )

  const html = buildPdfHtml({
    project: {
      name:         project.name,
      client:       project.client,
      client_email: project.client_email ?? null,
      description:  project.description  ?? null,
      type:         project.type         ?? null,
    },
    rooms:      roomSections,
    coverBase64,
    logoBase64: null,
    total,
  })

  const { uri } = await Print.printToFileAsync({ html, base64: false })

  const safeName = project.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()

  const date = new Date()
    .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '-')

  const fileName = `APduo_${safeName}_${date}.pdf`

  return { uri, fileName }
}

// ── Compartilha o PDF ─────────────────────────────────
export async function shareProjectPdf(projectId: number): Promise<void> {
  const { uri, fileName } = await generateProjectPdf(projectId)

  const canShare = await Sharing.isAvailableAsync()
  if (!canShare) throw new Error('Compartilhamento não disponível neste dispositivo')

  await Sharing.shareAsync(uri, {
    mimeType:    'application/pdf',
    dialogTitle: `Compartilhar ${fileName}`,
    UTI:         'com.adobe.pdf',
  })
}

// ── Apenas imprime ────────────────────────────────────
export async function printProjectPdf(projectId: number): Promise<void> {
  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Projeto ${projectId} não encontrado`)

  const categories  = await getCategoriesByProject(projectId)
  const coverBase64 = await toBase64(project.cover_uri)
  const roomSections: RoomSection[] = []

  for (const category of categories) {
    const products = await getProductsByCategory(category.id)
    if (products.length === 0) continue

    const mappedProducts = await Promise.all(
      products.slice(0, 8).map(async p => ({
        name:        p.name,
        store:       p.store       ?? null,
        description: p.description ?? null,
        variations:  p.variations  ?? null,
        notes:       p.notes       ?? null,
        quantity:    p.quantity    ?? 1,
        price:       p.price       ?? 0,
        imageBase64: await toBase64(p.image_uri),
      }))
    )

    roomSections.push({ name: category.name, products: mappedProducts })
  }

  const total = roomSections.reduce(
    (sum, r) => sum + r.products.reduce((s, p) => s + p.price * p.quantity, 0),
    0
  )

  const html = buildPdfHtml({
    project: {
      name:         project.name,
      client:       project.client,
      client_email: project.client_email ?? null,
      description:  project.description  ?? null,
      type:         project.type         ?? null,
    },
    rooms:      roomSections,
    coverBase64,
    logoBase64: null,
    total,
  })

  await Print.printAsync({ html })
}