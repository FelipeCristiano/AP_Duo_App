// services/pdfTemplate.ts
import { Project } from './db/projects'
import { Product, Category, parseVariations } from './db/products'

export interface RoomSection {
  category: Category
  products: Product[]
  subtotal: number
}

// ── Converte URL remota → base64 ───────────────────────
export async function urlToBase64(url: string | null): Promise<string> {
  if (!url) return ''
  try {
    const res = await fetch(url)
    if (!res.ok) return ''
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror   = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

// ── Formata valor em BRL ───────────────────────────────
function brl(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// ── Data formatada ─────────────────────────────────────
function formatDate(): string {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

// ── CSS completo ───────────────────────────────────────
function buildCSS(accent: string): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'DM Sans', sans-serif;
      background: #FAFAF8;
      color: #1A1A1A;
      font-size: 12px;
      line-height: 1.5;
    }

    /* ── Capa ── */
    .cover {
      width: 100%;
      height: 100vh;
      min-height: 800px;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 56px;
      page-break-after: always;
      background: #1A1A1A;
      overflow: hidden;
    }
    .cover-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.45;
    }
    .cover-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to top,
        rgba(0,0,0,0.85) 0%,
        rgba(0,0,0,0.2)  60%,
        transparent      100%
      );
    }
    .cover-content {
      position: relative;
      z-index: 2;
      color: #FAFAF8;
    }
    .cover-logo {
      position: absolute;
      top: 48px;
      left: 56px;
      z-index: 2;
      height: 48px;
      object-fit: contain;
    }
    .cover-accent-line {
      width: 48px;
      height: 2px;
      background: ${accent};
      margin-bottom: 20px;
    }
    .cover-label {
      font-family: 'DM Sans', sans-serif;
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(250,250,248,0.6);
      margin-bottom: 12px;
    }
    .cover-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 44px;
      font-weight: 300;
      line-height: 1.1;
      margin-bottom: 10px;
      color: #FAFAF8;
    }
    .cover-client {
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      color: rgba(250,250,248,0.75);
      margin-bottom: 32px;
    }
    .cover-meta {
      display: flex;
      gap: 32px;
      border-top: 1px solid rgba(250,250,248,0.15);
      padding-top: 24px;
    }
    .cover-meta-item { display: flex; flex-direction: column; gap: 4px; }
    .cover-meta-label {
      font-size: 9px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: rgba(250,250,248,0.45);
    }
    .cover-meta-value {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px;
      color: #FAFAF8;
    }

    /* ── Conteúdo ── */
    .content {
      padding: 48px 56px;
      max-width: 900px;
      margin: 0 auto;
    }

    /* Cabeçalho interno */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 1px solid #E8E3DC;
      margin-bottom: 40px;
    }
    .doc-header-left h2 {
      font-family: 'Cormorant Garamond', serif;
      font-size: 26px;
      font-weight: 400;
      margin-bottom: 4px;
    }
    .doc-header-left p {
      font-size: 11px;
      color: #8A8070;
    }
    .doc-header-right {
      text-align: right;
      font-size: 10px;
      color: #8A8070;
      line-height: 1.8;
    }

    /* ── Seção de cômodo ── */
    .room-section {
      margin-bottom: 48px;
      page-break-inside: avoid;
    }
    .room-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 16px;
    }
    .room-accent {
      width: 3px;
      height: 22px;
      background: ${accent};
      border-radius: 2px;
      flex-shrink: 0;
    }
    .room-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 20px;
      font-weight: 400;
      color: #1A1A1A;
    }

    /* ── Tabela de produtos ── */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead th {
      font-family: 'DM Sans', sans-serif;
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #8A8070;
      padding: 8px 12px;
      border-bottom: 1px solid #E8E3DC;
      text-align: left;
    }
    thead th:last-child { text-align: right; }

    tbody tr {
      border-bottom: 1px solid #F0ECE6;
    }
    tbody tr:last-child { border-bottom: none; }

    td {
      padding: 14px 12px;
      vertical-align: top;
    }

    /* Coluna imagem */
    .col-image { width: 76px; }
    .product-thumb {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 4px;
      background: #F0ECE6;
    }
    .product-thumb-placeholder {
      width: 64px;
      height: 64px;
      background: #F0ECE6;
      border-radius: 4px;
    }

    /* Coluna nome/descrição */
    .col-info { width: 40%; }
    .product-name {
      font-family: 'DM Sans', sans-serif;
      font-size: 12.5px;
      font-weight: 500;
      color: #1A1A1A;
      margin-bottom: 4px;
    }
    .product-store {
      font-size: 9.5px;
      color: #8A8070;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .product-description {
      font-size: 10.5px;
      color: #6B6355;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .product-variations {
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .variation-tag {
      font-size: 9px;
      background: #F5F0EB;
      border: 1px solid #E8E3DC;
      border-radius: 3px;
      padding: 2px 6px;
      color: #6B6355;
    }
    .product-link {
      font-size: 9px;
      color: ${accent};
      text-decoration: none;
      display: block;
      margin-top: 6px;
      word-break: break-all;
    }

    /* Colunas numéricas */
    .col-qty   { width: 60px; text-align: center; }
    .col-price { width: 100px; text-align: right; }
    .col-total { width: 110px; text-align: right; }

    td.col-qty   { text-align: center; }
    td.col-price, td.col-total {
      text-align: right;
      font-family: 'Cormorant Garamond', serif;
      font-size: 15px;
    }
    td.col-total {
      font-weight: 500;
    }

    /* Subtotal de cômodo */
    .room-subtotal {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 16px;
      padding: 12px 12px;
      background: #F5F0EB;
      border-radius: 0 0 4px 4px;
      margin-top: 4px;
    }
    .room-subtotal-label {
      font-size: 10px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #8A8070;
    }
    .room-subtotal-value {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px;
      color: #1A1A1A;
    }

    /* ── Total geral ── */
    .grand-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px 20px;
      background: #1A1A1A;
      border-radius: 6px;
      margin-top: 48px;
      margin-bottom: 48px;
    }
    .grand-total-label {
      font-family: 'DM Sans', sans-serif;
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(250,250,248,0.6);
    }
    .grand-total-value {
      font-family: 'Cormorant Garamond', serif;
      font-size: 28px;
      color: #FAFAF8;
    }

    /* ── Rodapé ── */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 24px;
      border-top: 1px solid #E8E3DC;
    }
    .footer-brand {
      font-family: 'Cormorant Garamond', serif;
      font-size: 18px;
      color: #1A1A1A;
    }
    .footer-note {
      font-size: 9px;
      color: #8A8070;
      text-align: right;
      line-height: 1.8;
    }
  `
}

// ── Página de capa ─────────────────────────────────────
function buildCoverPage(
  project: Project,
  logoBase64: string,
  coverBase64: string,
  total: number,
  date: string,
): string {
  const coverBg = coverBase64
    ? `<img class="cover-image" src="${coverBase64}" />`
    : ''

  const logo = logoBase64
    ? `<img class="cover-logo" src="${logoBase64}" />`
    : `<div class="cover-logo" style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#FAFAF8;">APduo</div>`

  return `
    <div class="cover">
      ${logo}
      ${coverBg}
      <div class="cover-overlay"></div>
      <div class="cover-content">
        <div class="cover-accent-line"></div>
        <div class="cover-label">Proposta de Interiores</div>
        <div class="cover-title">${project.name}</div>
        <div class="cover-client">${project.client}</div>
        <div class="cover-meta">
          <div class="cover-meta-item">
            <span class="cover-meta-label">Total estimado</span>
            <span class="cover-meta-value">${brl(total)}</span>
          </div>
          <div class="cover-meta-item">
            <span class="cover-meta-label">Data</span>
            <span class="cover-meta-value">${date}</span>
          </div>
          <div class="cover-meta-item">
            <span class="cover-meta-label">Escritório</span>
            <span class="cover-meta-value">APduo</span>
          </div>
        </div>
      </div>
    </div>
  `
}

// ── Linha de produto ───────────────────────────────────
function buildProductRow(product: Product, thumbBase64: string): string {
  const variations = parseVariations(product.variations)
  const varTags = variations
    .map(v => `<span class="variation-tag">${v.label}: ${v.value}</span>`)
    .join('')

  const thumb = thumbBase64
    ? `<img class="product-thumb" src="${thumbBase64}" />`
    : `<div class="product-thumb-placeholder"></div>`

  const unitPrice = product.price ?? 0
  const qty       = product.quantity ?? 1
  const lineTotal = unitPrice * qty

  const link = product.link
    ? `<a class="product-link" href="${product.link}">${product.store ?? new URL(product.link).hostname}</a>`
    : ''

  const descEl = product.description
    ? `<div class="product-description">${product.description}</div>`
    : ''

  const varEl = varTags
    ? `<div class="product-variations">${varTags}</div>`
    : ''

  return `
    <tr>
      <td class="col-image">${thumb}</td>
      <td class="col-info">
        <div class="product-name">${product.name}</div>
        ${product.store ? `<div class="product-store">${product.store}</div>` : ''}
        ${descEl}
        ${varEl}
        ${link}
      </td>
      <td class="col-qty">${qty}</td>
      <td class="col-price">${brl(unitPrice)}</td>
      <td class="col-total">${brl(lineTotal)}</td>
    </tr>
  `
}

// ── Seção de cômodo ────────────────────────────────────
function buildRoomSection(room: RoomSection, thumbsMap: Map<number, string>): string {
  const rows = room.products
    .map(p => buildProductRow(p, thumbsMap.get(p.id) ?? ''))
    .join('')

  return `
    <div class="room-section">
      <div class="room-header">
        <div class="room-accent"></div>
        <div class="room-title">${room.category.name}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Produto</th>
            <th style="text-align:center">Qtd</th>
            <th style="text-align:right">Unitário</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="room-subtotal">
        <span class="room-subtotal-label">Subtotal ${room.category.name}</span>
        <span class="room-subtotal-value">${brl(room.subtotal)}</span>
      </div>
    </div>
  `
}

// ── HTML completo ──────────────────────────────────────
export function buildPdfHtml(params: {
  project:    Project
  rooms:      RoomSection[]
  thumbsMap:  Map<number, string>
  logoBase64: string
  coverBase64: string
  total:      number
}): string {
  const { project, rooms, thumbsMap, logoBase64, coverBase64, total } = params
  const accent   = project.accent ?? '#1A1A1A'
  const date     = formatDate()
  const roomsHtml = rooms.map(r => buildRoomSection(r, thumbsMap)).join('')

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.name} — APduo</title>
  <style>${buildCSS(accent)}</style>
</head>
<body>

  ${buildCoverPage(project, logoBase64, coverBase64, total, date)}

  <div class="content">
    <div class="doc-header">
      <div class="doc-header-left">
        <h2>${project.name}</h2>
        <p>${project.client}${project.client_email ? ` · ${project.client_email}` : ''}</p>
      </div>
      <div class="doc-header-right">
        APduo Arquitetura<br/>
        ${date}<br/>
        apduo.com.br
      </div>
    </div>

    ${roomsHtml}

    <div class="grand-total">
      <span class="grand-total-label">Total geral do projeto</span>
      <span class="grand-total-value">${brl(total)}</span>
    </div>

    <div class="footer">
      <span class="footer-brand">APduo Arquitetura</span>
      <span class="footer-note">
        Proposta gerada em ${date}<br/>
        Os valores estão sujeitos a alteração sem aviso prévio.
      </span>
    </div>
  </div>

</body>
</html>
  `
}