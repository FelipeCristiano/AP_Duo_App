import { useState, useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator, Platform,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Image } from 'expo-image'
import { theme } from '@/constants/theme'
import { getProjectById, getProjectTotal, Project } from '@/services/db/projects'
import {
  getCategoriesByProject, getProductsByCategory,
  deleteProduct, Category, Product, parseVariations,
} from '@/services/db/products'
import { showConfirm } from '@/components/Dialog'
import Svg, { Path, Line, Circle, Polyline, Rect } from 'react-native-svg'

// ── Ícones ─────────────────────────────────────────────
function IconBack() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.ink} strokeWidth={2}>
      <Path d="M19 12H5M12 5l-7 7 7 7" />
    </Svg>
  )
}
function IconPlus() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.ink} strokeWidth={2.5}>
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Line x1={5} y1={12} x2={19} y2={12} />
    </Svg>
  )
}
function IconPDF() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.white} strokeWidth={2}>
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <Polyline points="14 2 14 8 20 8" />
      <Line x1={16} y1={13} x2={8} y2={13} />
      <Line x1={16} y1={17} x2={8} y2={17} />
    </Svg>
  )
}
function IconEdit() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.inkLight} strokeWidth={2}>
      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  )
}
function IconTrash() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.danger} strokeWidth={2}>
      <Polyline points="3 6 5 6 21 6" />
      <Path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <Path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </Svg>
  )
}
function IconLink() {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.inkLight} strokeWidth={2}>
      <Path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <Path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </Svg>
  )
}

// ── Card de produto (grid 2 colunas) ──────────────────
function ProductCard({
  product, onEdit, onDelete,
}: {
  product:  Product
  onEdit:   () => void
  onDelete: () => void
}) {
  const variations = parseVariations(product.variations)
  const unit  = product.price
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const total = (product.price * product.quantity)
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <View style={styles.productCard}>

      {/* Imagem */}
      {product.image_uri ? (
        <Image
          source={{ uri: product.image_uri }}
          style={styles.productImg}
          contentFit="cover"
        />
      ) : (
        <View style={styles.productImgEmpty}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
            stroke={theme.colors.inkXLight} strokeWidth={1.2}>
            <Rect x={3} y={3} width={18} height={18} rx={2} />
            <Circle cx={8.5} cy={8.5} r={1.5} />
            <Polyline points="21 15 16 10 5 21" />
          </Svg>
        </View>
      )}

      {/* Info */}
      <View style={styles.productCardBody}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        {product.store && (
          <View style={styles.storeRow}>
            <IconLink />
            <Text style={styles.productStore} numberOfLines={1}>{product.store}</Text>
          </View>
        )}
        {product.description ? (
          <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
        ) : null}
        {variations.map((v, i) => (
          <Text key={i} style={styles.productVariation}>{v.label}: {v.value}</Text>
        ))}
      </View>

      {/* Preços + ações */}
      <View style={styles.productCardFooter}>
        <View style={styles.productPriceRow}>
          <Text style={styles.productQtyLabel}>Qtd {product.quantity}</Text>
          <Text style={styles.productPrice}>{unit}</Text>
        </View>
        <View style={styles.productTotalRow}>
          <Text style={styles.productTotalLabel}>Total</Text>
          <Text style={styles.productTotal}>{total}</Text>
        </View>
        <View style={styles.productActions}>
          <TouchableOpacity style={styles.rowAction} onPress={onEdit}>
            <IconEdit />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowAction} onPress={onDelete}>
            <IconTrash />
          </TouchableOpacity>
        </View>
      </View>

    </View>
  )
}

// ── Bloco de cômodo ────────────────────────────────────
function RoomBlock({
  category, products, onAddProduct, onEditProduct, onDeleteProduct,
}: {
  category:        Category
  products:        Product[]
  onAddProduct:    () => void
  onEditProduct:   (p: Product) => void
  onDeleteProduct: (id: number) => void
}) {
  const subtotal = products
    .reduce((acc, p) => acc + p.price * p.quantity, 0)
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <View style={styles.roomBlock}>

      {/* Header do cômodo */}
      <View style={styles.roomHeader}>
        <Text style={styles.roomName}>{category.name}</Text>
        <TouchableOpacity style={styles.addProductBtn} onPress={onAddProduct}>
          <IconPlus />
          <Text style={styles.addProductBtnText}>Adicionar produto</Text>
        </TouchableOpacity>
      </View>

      {/* Grid de produtos */}
      {products.length > 0 ? (
        <View style={styles.productGrid}>
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => onEditProduct(product)}
              onDelete={() => onDeleteProduct(product.id)}
            />
          ))}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal — {category.name}</Text>
            <Text style={styles.subtotalValue}>{subtotal}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.roomEmpty}>
          <Text style={styles.roomEmptyText}>
            Nenhum produto ainda. Toque em "Adicionar produto".
          </Text>
        </View>
      )}

    </View>
  )
}

// ══════════════════════════════════════════════════════
//  TELA PRINCIPAL
// ══════════════════════════════════════════════════════
interface RoomData {
  category: Category
  products: Product[]
}

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = Number(id)

  const [project, setProject] = useState<Project | null>(null)
  const [rooms,   setRooms]   = useState<RoomData[]>([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)

  const loadProject = useCallback(async () => {
    try {
      const [proj, cats] = await Promise.all([
        getProjectById(projectId),
        getCategoriesByProject(projectId),
      ])
      setProject(proj)

      const roomsData = await Promise.all(
        cats.map(async cat => ({
          category: cat,
          products: await getProductsByCategory(cat.id),
        }))
      )
      setRooms(roomsData)
      setTotal(await getProjectTotal(projectId))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [projectId])

 useFocusEffect(
  useCallback(() => {
    loadProject()
  }, [loadProject])
)

  const handleDeleteProduct = useCallback(async (productId: number) => {
    const ok = await showConfirm(
      'Deseja remover este produto?',
      'Remover produto',
      { confirmText: 'Remover', danger: true },
    )
    if (!ok) return
    await deleteProduct(productId)
    loadProject()
  }, [loadProject])

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    )
  }

  if (!project) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Projeto não encontrado.</Text>
      </View>
    )
  }

  const totalFormatted = total.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
  })

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
          <IconBack />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {project.name}
          </Text>
          <Text style={styles.headerSub}>{project.client}</Text>
        </View>
        <TouchableOpacity
          style={styles.pdfBtn}
          onPress={() => router.push(
            `/project/pdf-preview?projectId=${projectId}`
          )}
        >
          <IconPDF />
          <Text style={styles.pdfBtnText}>PDF</Text>
        </TouchableOpacity>
      </View>

      {/* ── Info do projeto ── */}
      <View style={styles.projectInfo}>
        <View style={styles.projectInfoItem}>
          <Text style={styles.projectInfoLabel}>Cliente</Text>
          <Text style={styles.projectInfoValue}>{project.client}</Text>
        </View>
        {project.client_email ? (
          <View style={styles.projectInfoItem}>
            <Text style={styles.projectInfoLabel}>Email</Text>
            <Text style={styles.projectInfoValue}>{project.client_email}</Text>
          </View>
        ) : null}
        <View style={styles.projectInfoItem}>
          <Text style={styles.projectInfoLabel}>Total geral</Text>
          <Text style={styles.projectTotal}>{totalFormatted}</Text>
        </View>
      </View>

      {/* ── Cômodos e produtos ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.roomsContainer}>

          {rooms.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nenhum cômodo cadastrado</Text>
              <Text style={styles.emptySub}>
                Edite o projeto para adicionar cômodos.
              </Text>
            </View>
          ) : (
            rooms.map(({ category, products }) => (
              <RoomBlock
                key={category.id}
                category={category}
                products={products}
                onAddProduct={() => router.push(
                  `/project/add-product?projectId=${projectId}&categoryId=${category.id}`
                )}
                onEditProduct={(p) => router.push(
                  `/project/add-product?projectId=${projectId}&categoryId=${p.category_id}&productId=${p.id}`
                )}
                onDeleteProduct={handleDeleteProduct}
              />
            ))
          )}

            {/* Total geral */}
            {rooms.length > 0 && (
              <View style={styles.grandTotal}>
                <Text style={styles.grandTotalLabel}>
                  TOTAL GERAL DO PROJETO
                </Text>
                <Text style={styles.grandTotalValue}>{totalFormatted}</Text>
              </View>
            )}

        </View>
      </ScrollView>

    </View>
  )
}


const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: theme.colors.bg },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:  { fontFamily: 'DMSans_400Regular', color: theme.colors.inkLight },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitle: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 20, color: theme.colors.ink,
  },
  headerSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11, color: theme.colors.inkLight,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.ink,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: theme.radius.sm,
  },
  pdfBtnText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13, color: theme.colors.white,
  },

  // Info do projeto
  projectInfo: {
    flexDirection: 'row', gap: 28,
    paddingHorizontal: theme.spacing.lg, paddingVertical: 14,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  projectInfoItem:  {},
  projectInfoLabel: {
    fontFamily: 'DMSans_400Regular', fontSize: 10,
    letterSpacing: 0.8, textTransform: 'uppercase',
    color: theme.colors.inkLight, marginBottom: 2,
  },
  projectInfoValue: {
    fontFamily: 'DMSans_500Medium', fontSize: 13, color: theme.colors.ink,
  },
  projectTotal: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 18, color: theme.colors.ink,
  },

  // Scroll
  scroll:          { flex: 1 },
  scrollContent:   { paddingBottom: 48 },
  roomsContainer:  { padding: theme.spacing.lg, gap: 28 },

  // Room block
  roomBlock: {
    backgroundColor: theme.colors.white,
    borderRadius:    theme.radius.lg,
    borderWidth:     1, borderColor: theme.colors.border,
    overflow:        'hidden',
  },
  roomHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.bgPanel,
  },
  roomName: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 18, color: theme.colors.ink,
  },
  addProductBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: theme.radius.sm,
    borderWidth: 1, borderColor: theme.colors.borderDk,
    backgroundColor: theme.colors.white,
  },
  addProductBtnText: {
    fontFamily: 'DMSans_500Medium', fontSize: 12, color: theme.colors.ink,
  },

  // Product grid
  productGrid: {
    padding: theme.spacing.md,
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           12,
    alignItems:    'flex-start',
  },

  // Product card
  productCard: {
    width:           '48%',
    backgroundColor: theme.colors.bgCard,
    borderRadius:    theme.radius.md,
    borderWidth:     1, borderColor: theme.colors.border,
    overflow:        'hidden',
  },
  productImg: {
    width: '100%', height: 140,
  },
  productImgEmpty: {
    width: '100%', height: 140,
    backgroundColor: theme.colors.bgPanel,
    alignItems: 'center', justifyContent: 'center',
  },
  productCardBody: {
    padding: 12, gap: 3,
  },
  productName: {
    fontFamily: 'DMSans_500Medium', fontSize: 13,
    color: theme.colors.ink,
  },
  storeRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productStore:   { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 11, color: theme.colors.inkLight },
  productDesc: {
    fontFamily: 'DMSans_400Regular', fontSize: 12,
    color: theme.colors.inkMid, lineHeight: 17,
  },
  productVariation: {
    fontFamily: 'DMSans_400Regular', fontSize: 11, color: theme.colors.inkLight,
  },
  productNotes: {
    fontFamily: 'DMSans_400Regular', fontSize: 11,
    color: theme.colors.inkLight, fontStyle: 'italic',
  },

  productCardFooter: {
    padding: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    gap: 4,
  },
  productPriceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  productTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  productQtyLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: theme.colors.inkLight },
  productPrice:    { fontFamily: 'DMSans_400Regular', fontSize: 12, color: theme.colors.inkMid },
  productTotalLabel: { fontFamily: 'DMSans_400Regular', fontSize: 11, color: theme.colors.inkLight },
  productTotal:    { fontFamily: 'CormorantGaramond_400Regular', fontSize: 16, color: theme.colors.ink },
  productActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 4,
  },

  rowAction: {
    width: 30, height: 30, borderRadius: 7,
    borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    alignItems: 'center', justifyContent: 'center',
  },

  // Subtotal
  subtotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14,
    backgroundColor: theme.colors.bgCard,
    borderTopWidth: 1, borderTopColor: theme.colors.borderDk,
  },
  subtotalLabel: {
    fontFamily: 'DMSans_500Medium', fontSize: 12,
    color: theme.colors.inkMid, letterSpacing: 0.4,
  },
  subtotalValue: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 18, color: theme.colors.ink,
  },

  // Empty room
  roomEmpty: { padding: 28, alignItems: 'center' },
  roomEmptyText: {
    fontFamily: 'DMSans_400Regular', fontSize: 13,
    color: theme.colors.inkLight, textAlign: 'center',
  },

  // Grand total
  grandTotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 24, paddingVertical: 20,
  },
  grandTotalLabel: {
    fontFamily: 'DMSans_500Medium', fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  grandTotalValue: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 28, color: theme.colors.white,
  },

  // Empty state
  emptyState:  { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 22, color: theme.colors.inkMid, marginBottom: 8,
  },
  emptySub: {
    fontFamily: 'DMSans_400Regular', fontSize: 13,
    color: theme.colors.inkLight, textAlign: 'center',
  },
})