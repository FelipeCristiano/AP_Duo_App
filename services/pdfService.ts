// services/pdfService.ts
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { getProjectById, Project } from './db/projects'
import { getCategoriesByProject, getProductsByCategory, parseVariations } from './db/products'
import { buildPdfHtml, urlToBase64, RoomSection } from './pdfTemplate'

export interface PdfGenerationResult {
  uri:      string
  fileName: string
}

// ── Orquestra a geração completa do PDF ───────────────
export async function generateProjectPdf(
  projectId: number
): Promise<PdfGenerationResult> {

  // 1. Busca o projeto
  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Projeto ${projectId} não encontrado`)

  // 2. Busca categorias (cômodos)
  const categories = await getCategoriesByProject(projectId)
  if (categories.length === 0) throw new Error('Projeto sem cômodos cadastrados')

  // 3. Busca produtos de cada cômodo e monta sections
  const roomSections: RoomSection[] = []

  for (const category of categories) {
    const products = await getProductsByCategory(category.id)

    if (products.length === 0) continue

    const subtotal = products.reduce((sum, p) => {
      return sum + (p.price ?? 0) * (p.quantity ?? 1)
    }, 0)

    roomSections.push({ category, products, subtotal })
  }

  if (roomSections.length === 0) {
    throw new Error('Nenhum produto encontrado nos cômodos')
  }

  // 4. Converte imagens remotas para base64 em paralelo
  //    (logo, cover e thumbs dos produtos)
  const [logoBase64, coverBase64] = await Promise.all([
    urlToBase64(project.logo_uri),
    urlToBase64(project.cover_uri),
  ])

  // Converte thumbs de cada produto (limita a 8 por cômodo para não travar)
  const thumbsMap = new Map<number, string>()

  await Promise.all(
    roomSections.flatMap(section =>
      section.products.slice(0, 8).map(async product => {
        if (product.image_uri) {
          const b64 = await urlToBase64(product.image_uri)
          if (b64) thumbsMap.set(product.id, b64)
        }
      })
    )
  )

  // 5. Monta o HTML
  const total = roomSections.reduce((sum, r) => sum + r.subtotal, 0)
  const html = buildPdfHtml({
    project,
    rooms: roomSections,
    logoBase64,
    coverBase64,
    thumbsMap,
    total,
  })

  // 6. Gera o PDF via expo-print
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  })

  // 7. Retorna o URI e um nome amigável
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

// ── Compartilha o PDF gerado ──────────────────────────
export async function shareProjectPdf(projectId: number): Promise<void> {
  const { uri, fileName } = await generateProjectPdf(projectId)

  const canShare = await Sharing.isAvailableAsync()
  if (!canShare) {
    throw new Error('Compartilhamento não disponível neste dispositivo')
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Compartilhar ${fileName}`,
    UTI: 'com.adobe.pdf',
  })
}

// ── Apenas imprime (útil no web/desktop) ─────────────
export async function printProjectPdf(projectId: number): Promise<void> {
  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Projeto ${projectId} não encontrado`)

  const categories = await getCategoriesByProject(projectId)
  const roomSections: RoomSection[] = []

  for (const category of categories) {
    const products = await getProductsByCategory(category.id)
    if (products.length === 0) continue
    const subtotal = products.reduce((sum, p) => sum + (p.price ?? 0) * (p.quantity ?? 1), 0)
    roomSections.push({ category, products, subtotal })
  }

  const [logoBase64, coverBase64] = await Promise.all([
    urlToBase64(project.logo_uri),
    urlToBase64(project.cover_uri),
  ])

  const thumbsMap = new Map<number, string>()
  await Promise.all(
    roomSections.flatMap(section =>
      section.products.slice(0, 8).map(async product => {
        if (product.image_uri) {
          const b64 = await urlToBase64(product.image_uri)
          if (b64) thumbsMap.set(product.id, b64)
        }
      })
    )
  )

  const total = roomSections.reduce((sum, r) => sum + r.subtotal, 0)

  const html = buildPdfHtml({ project, rooms: roomSections, logoBase64, coverBase64, thumbsMap, total })

  await Print.printAsync({ html })
}