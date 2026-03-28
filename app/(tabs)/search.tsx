// app/(tabs)/search.tsx
import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { theme } from '@/constants/theme'
import { getAllProjects, Project } from '@/services/db/projects'
import { getProductsByCategory, getCategoriesByProject } from '@/services/db/products'
import Svg, { Path, Line, Circle } from 'react-native-svg'

// ── Ícones ─────────────────────────────────────────────
function IconSearch({ color = theme.colors.inkLight }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2}>
      <Circle cx={11} cy={11} r={8} />
      <Line x1={21} y1={21} x2={16.65} y2={16.65} />
    </Svg>
  )
}

function IconX({ color = theme.colors.inkLight }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.5}>
      <Line x1={18} y1={6} x2={6} y2={18} />
      <Line x1={6} y1={6} x2={18} y2={18} />
    </Svg>
  )
}

function IconArrow() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.inkLight} strokeWidth={2}>
      <Path d="M9 18l6-6-6-6" />
    </Svg>
  )
}

// ── Tipos ──────────────────────────────────────────────
interface ProductResult {
  productId:    number
  productName:  string
  store:        string | null
  price:        number
  quantity:     number
  imageUri:     string | null
  categoryName: string
  projectId:    number
  projectName:  string
  projectClient: string
}

// ── Card de resultado ──────────────────────────────────
function ResultCard({ item }: { item: ProductResult }) {
  const total = item.price * item.quantity

  return (
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.85}
      onPress={() => router.push(`/project/${item.projectId}`)}
    >
      {/* Imagem */}
      {item.imageUri ? (
        <Image
          source={{ uri: item.imageUri }}
          style={styles.resultImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.resultImageEmpty} />
      )}

      {/* Conteúdo */}
      <View style={styles.resultBody}>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.productName}
        </Text>
        {item.store && (
          <Text style={styles.resultStore} numberOfLines={1}>
            {item.store}
          </Text>
        )}

        {/* Projeto + cômodo */}
        <View style={styles.resultMeta}>
          <View style={styles.resultBadge}>
            <Text style={styles.resultBadgeText} numberOfLines={1}>
              {item.projectName}
            </Text>
          </View>
          <Text style={styles.resultCategory} numberOfLines={1}>
            {item.categoryName}
          </Text>
        </View>

        {/* Preço */}
        <Text style={styles.resultPrice}>
          {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          {item.quantity > 1 && (
            <Text style={styles.resultQty}> ({item.quantity}x)</Text>
          )}
        </Text>
      </View>

      <IconArrow />
    </TouchableOpacity>
  )
}

// ══════════════════════════════════════════════════════
//  TELA PRINCIPAL
// ══════════════════════════════════════════════════════
export default function SearchScreen() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<ProductResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // ── Busca global em todos os projetos ──────────────
  const handleSearch = useCallback(async (text: string) => {
    const q = text.trim().toLowerCase()
    setQuery(text)

    if (q.length < 2) {
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)

    try {
      const projects = await getAllProjects()
      const found: ProductResult[] = []

      for (const project of projects) {
        const categories = await getCategoriesByProject(project.id)

        for (const category of categories) {
          const products = await getProductsByCategory(category.id)

          for (const product of products) {
            const nameMatch  = product.name.toLowerCase().includes(q)
            const storeMatch = product.store?.toLowerCase().includes(q)
            const descMatch  = product.description?.toLowerCase().includes(q)

            if (nameMatch || storeMatch || descMatch) {
              found.push({
                productId:     product.id,
                productName:   product.name,
                store:         product.store   ?? null,
                price:         product.price   ?? 0,
                quantity:      product.quantity ?? 1,
                imageUri:      product.image_uri ?? null,
                categoryName:  category.name,
                projectId:     project.id,
                projectName:   project.name,
                projectClient: project.client,
              })
            }
          }
        }
      }

      // Ordena por nome do projeto depois nome do produto
      found.sort((a, b) =>
        a.projectName.localeCompare(b.projectName) ||
        a.productName.localeCompare(b.productName)
      )

      setResults(found)
    } catch (e) {
      console.error('[Search] Erro:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleClear = () => {
    setQuery('')
    setResults([])
    setSearched(false)
  }

  // ── Render ─────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Buscar</Text>
      </View>

      {/* Campo de busca */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <IconSearch />
          <TextInput
            style={styles.searchInput}
            placeholder="Nome do produto, loja, descrição..."
            placeholderTextColor={theme.colors.inkXLight}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconX />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Resultados */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Carregando */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.ink} />
          </View>
        )}

        {/* Resultados encontrados */}
        {!loading && searched && results.length > 0 && (
          <>
            <Text style={styles.resultCount}>
              {results.length} produto{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </Text>
            {results.map(item => (
              <ResultCard key={`${item.projectId}-${item.productId}`} item={item} />
            ))}
          </>
        )}

        {/* Nenhum resultado */}
        {!loading && searched && results.length === 0 && (
          <View style={styles.centered}>
            <IconSearch color={theme.colors.inkXLight} />
            <Text style={styles.emptyTitle}>Nenhum produto encontrado</Text>
            <Text style={styles.emptySub}>
              Tente buscar por outro nome, loja ou descrição.
            </Text>
          </View>
        )}

        {/* Estado inicial */}
        {!loading && !searched && (
          <View style={styles.centered}>
            <IconSearch color={theme.colors.inkXLight} />
            <Text style={styles.emptyTitle}>Busca global</Text>
            <Text style={styles.emptySub}>
              Encontre produtos em todos os projetos pelo nome, loja ou descrição.
            </Text>
          </View>
        )}
      </ScrollView>

    </View>
  )
}

// ── Estilos ────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },

  topBar: {
    paddingTop:        56,
    paddingBottom:     16,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor:   theme.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  topBarTitle: {
    fontFamily: theme.font.serif,
    fontSize:   28,
    color:      theme.colors.ink,
  },

  searchRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical:   12,
    backgroundColor:   theme.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBox: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
    backgroundColor: theme.colors.white,
    borderWidth:     1,
    borderColor:     theme.colors.border,
    borderRadius:    theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical:   10,
  },
  searchInput: {
    flex:       1,
    fontFamily: theme.font.sans,
    fontSize:   14,
    color:      theme.colors.ink,
  },

  scroll:        { flex: 1 },
  scrollContent: { padding: theme.spacing.lg, gap: 10, flexGrow: 1 },

  centered: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            12,
    paddingTop:     60,
    paddingBottom:  40,
  },
  emptyTitle: {
    fontFamily: theme.font.serif,
    fontSize:   22,
    color:      theme.colors.inkMid,
  },
  emptySub: {
    fontFamily: theme.font.sans,
    fontSize:   13,
    color:      theme.colors.inkLight,
    textAlign:  'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },

  resultCount: {
    fontFamily: theme.font.sans,
    fontSize:   11,
    color:      theme.colors.inkLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  // Card
  resultCard: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    backgroundColor: theme.colors.white,
    borderWidth:     1,
    borderColor:     theme.colors.border,
    borderRadius:    theme.radius.md,
    padding:         12,
  },
  resultImage: {
    width:        56,
    height:       56,
    borderRadius: theme.radius.sm,
  },
  resultImageEmpty: {
    width:           56,
    height:          56,
    borderRadius:    theme.radius.sm,
    backgroundColor: theme.colors.bgPanel,
  },
  resultBody: {
    flex: 1,
    gap:  3,
  },
  resultName: {
    fontFamily: theme.font.sansMedium,
    fontSize:   14,
    color:      theme.colors.ink,
  },
  resultStore: {
    fontFamily: theme.font.sans,
    fontSize:   11,
    color:      theme.colors.inkLight,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    marginTop:     2,
  },
  resultBadge: {
    backgroundColor:   theme.colors.bgPanel,
    borderRadius:      theme.radius.xs,
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderWidth:       1,
    borderColor:       theme.colors.border,
  },
  resultBadgeText: {
    fontFamily: theme.font.sans,
    fontSize:   10,
    color:      theme.colors.inkMid,
  },
  resultCategory: {
    fontFamily: theme.font.sans,
    fontSize:   10,
    color:      theme.colors.inkLight,
  },
  resultPrice: {
    fontFamily: theme.font.serif,
    fontSize:   16,
    color:      theme.colors.ink,
    marginTop:  2,
  },
  resultQty: {
    fontFamily: theme.font.sans,
    fontSize:   12,
    color:      theme.colors.inkLight,
  },
})