// services/pdfService.ts
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import { getProjectById } from './db/projects'
import { getCategoriesByProject, getProductsByCategory } from './db/products'
import { buildPdfHtml, RoomSection } from './pdfTemplate'
import { getOfficeInfo } from './settings'

export interface PdfGenerationResult {
  uri:      string
  fileName: string
}

async function toBase64(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null
  try {
    if (uri.startsWith('data:')) return uri
    const response = await fetch(uri)
    if (!response.ok) return null
    const blob = await response.blob()
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

async function buildRooms(projectId: number): Promise<RoomSection[]> {
  const categories = await getCategoriesByProject(projectId)
  const sections: RoomSection[] = []
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
    sections.push({ name: category.name, products: mappedProducts })
  }
  return sections
}

export async function generateProjectPdf(
  projectId: number
): Promise<PdfGenerationResult> {
  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Projeto ${projectId} não encontrado`)
  const rooms = await buildRooms(projectId)
  if (rooms.length === 0) throw new Error('Nenhum produto encontrado nos cômodos')
  const coverBase64 = await toBase64(project.cover_uri)
  const total = rooms.reduce(
    (sum, r) => sum + r.products.reduce((s, p) => s + p.price * p.quantity, 0), 0
  )
  const office = await getOfficeInfo()
  const html = buildPdfHtml({
    project: {
      name:         project.name,
      client:       project.client,
      client_email: project.client_email ?? null,
      description:  project.description  ?? null,
      type:         project.type         ?? null,
    },
    rooms,
    coverBase64,
    logoBase64: null,
    total,
    office,
  })
  let uri: string
  if (Platform.OS === 'web') {
    const w = window as any
    if (!w.electron?.printToPDF) throw new Error('Geração de PDF não disponível neste ambiente')
    uri = await w.electron.printToPDF(html)
  } else {
    const result = await Print.printToFileAsync({ html, base64: false })
    uri = result.uri
  }
  const safeName = project.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase()
  const date = new Date()
    .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '-')
  return { uri, fileName: `APduo_${safeName}_${date}.pdf` }
}

export async function shareProjectPdf(projectId: number): Promise<void> {
  const { uri, fileName } = await generateProjectPdf(projectId)
  if (Platform.OS === 'web') {
    const w = window as any
    if (w.electron?.openFile) await w.electron.openFile(uri)
    return
  }
  const canShare = await Sharing.isAvailableAsync()
  if (!canShare) throw new Error('Compartilhamento não disponível neste dispositivo')
  await Sharing.shareAsync(uri, {
    mimeType:    'application/pdf',
    dialogTitle: `Compartilhar ${fileName}`,
    UTI:         'com.adobe.pdf',
  })
}

export async function printProjectPdf(projectId: number): Promise<void> {
  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Projeto ${projectId} não encontrado`)
  const rooms       = await buildRooms(projectId)
  const coverBase64 = await toBase64(project.cover_uri)
  const total       = rooms.reduce(
    (sum, r) => sum + r.products.reduce((s, p) => s + p.price * p.quantity, 0), 0
  )
  const office = await getOfficeInfo()
  const html = buildPdfHtml({
    project: {
      name:         project.name,
      client:       project.client,
      client_email: project.client_email ?? null,
      description:  project.description  ?? null,
      type:         project.type         ?? null,
    },
    rooms,
    coverBase64,
    logoBase64: null,
    total,
    office,
  })
  await Print.printAsync({ html })
}