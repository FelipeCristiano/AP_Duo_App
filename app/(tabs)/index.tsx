import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { theme } from '@/constants/theme'
import { useProjectStore } from '@/stores/projectStore'
import { getProjectStats, getProjectTotal, Project } from '@/services/db/projects'
import Svg, { Path, Line, Rect, Circle, Polyline } from 'react-native-svg'

// ── Tipos ──────────────────────────────────────────────
interface ProjectCardData extends Project {
  productCount:  number
  categoryCount: number
  total:         number
}

// ── Ícones ─────────────────────────────────────────────
function IconGrid({ size = 13, color = theme.colors.inkLight }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Rect x={3} y={3} width={7} height={7} /><Rect x={14} y={3} width={7} height={7} />
      <Rect x={14} y={14} width={7} height={7} /><Rect x={3} y={14} width={7} height={7} />
    </Svg>
  )
}

function IconList({ size = 13, color = theme.colors.inkLight }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Line x1={4} y1={6} x2={20} y2={6} /><Line x1={4} y1={12} x2={20} y2={12} />
      <Line x1={4} y1={18} x2={12} y2={18} />
    </Svg>
  )
}

function IconPlus({ size = 16, color = theme.colors.white }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
      <Line x1={12} y1={5} x2={12} y2={19} /><Line x1={5} y1={12} x2={19} y2={12} />
    </Svg>
  )
}

function IconDownload({ size = 14, color = theme.colors.inkLight }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <Polyline points="7 10 12 15 17 10" /><Line x1={12} y1={15} x2={12} y2={3} />
    </Svg>
  )
}

function IconEdit({ size = 14, color = theme.colors.inkLight }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  )
}

// ── Badge de status ────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  draft:  'Rascunho',
  active: 'Ativo',
  sent:   'Enviado',
  done:   'Finalizado',
}
const STATUS_COLOR: Record<string, string> = {
  draft:  theme.colors.inkLight,
  active: theme.colors.success,
  sent:   theme.colors.accent,
  done:   theme.colors.inkMid,
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? theme.colors.inkLight
  return (
    <View style={[styles.badge, { borderColor: color + '44', backgroundColor: color + '18' }]}>
      <Text style={[styles.badgeText, { color }]}>
        {status === 'active' ? '● ' : ''}{STATUS_LABEL[status] ?? status}
      </Text>
    </View>
  )
}

// ── Card de projeto ────────────────────────────────────
function ProjectCard({ project, onPress }: { project: ProjectCardData; onPress: () => void }) {
  const total = project.total > 0
    ? project.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Capa */}
      <View style={[styles.cardCover, { backgroundColor: project.accent + '22' }]}>
        <View style={[styles.cardCoverAccent, { backgroundColor: project.accent }]} />
        <View style={styles.cardCoverPattern} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardClient} numberOfLines={1}>{project.client}</Text>
          <StatusBadge status={project.status} />
        </View>

        <Text style={styles.cardName} numberOfLines={2}>{project.name}</Text>

        <View style={styles.cardMeta}>
          <View style={styles.cardMetaItem}>
            <IconGrid />
            <Text style={styles.cardMetaText}>{project.productCount} produtos</Text>
          </View>
          <View style={styles.cardMetaItem}>
            <IconList />
            <Text style={styles.cardMetaText}>{project.categoryCount} categorias</Text>
          </View>
          {total && (
            <Text style={styles.cardTotal}>{total}</Text>
          )}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>
          {new Date(project.updated_at).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'short', year: 'numeric'
          })}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <IconDownload />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <IconEdit />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ── Tela principal ─────────────────────────────────────
type FilterType = 'all' | 'active' | 'sent' | 'draft'

export default function HomeScreen() {
  const { projects, loading, fetchProjects } = useProjectStore()
  const [cards, setCards]         = useState<ProjectCardData[]>([])
  const [filter, setFilter]       = useState<FilterType>('all')
  const [refreshing, setRefreshing] = useState(false)

  // Recarrega toda vez que a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      fetchProjects()
    }, [])
  )

  // Carrega stats de cada projeto
  useEffect(() => {
    async function loadStats() {
      const enriched = await Promise.all(
        projects.map(async (p) => {
          const stats = await getProjectStats(p.id)
          const total = await getProjectTotal(p.id)
          return {
            ...p,
            productCount:  stats.products,
            categoryCount: stats.categories,
            total,
          }
        })
      )
      setCards(enriched)
    }
    if (projects.length > 0) loadStats()
    else setCards([])
  }, [projects])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchProjects()
    setRefreshing(false)
  }, [])

  const filtered = filter === 'all'
    ? cards
    : cards.filter(p => p.status === filter)

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: 'all',    label: 'Todos' },
    { key: 'active', label: 'Ativos' },
    { key: 'sent',   label: 'Enviados' },
    { key: 'draft',  label: 'Rascunhos' },
  ]

  return (
    <View style={styles.container}>

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>AP Duo</Text>
          <Text style={styles.topBarSub}>
            {cards.length === 0 ? 'Nenhum projeto' : `${cards.length} projeto${cards.length > 1 ? 's' : ''}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/(tabs)/new-project')}
          activeOpacity={0.85}
        >
          <IconPlus />
          <Text style={styles.btnPrimaryText}>Novo</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stats ── */}
      {cards.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Projetos</Text>
            <Text style={styles.statValue}>{cards.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Produtos</Text>
            <Text style={styles.statValue}>{cards.reduce((a, c) => a + c.productCount, 0)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total geral</Text>
            <Text style={styles.statValue}>
              {cards.reduce((a, c) => a + c.total, 0)
                .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>
      )}

      {/* ── Filtros ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Lista ── */}
      {loading && cards.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            filtered.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.accent}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nenhum projeto ainda</Text>
              <Text style={styles.emptySub}>
                Toque em "Novo" para criar sua primeira proposta
              </Text>
              <TouchableOpacity
                style={styles.btnAccent}
                onPress={() => router.push('/(tabs)/new-project')}
              >
                <IconPlus color={theme.colors.white} />
                <Text style={styles.btnAccentText}>Criar projeto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onPress={() => router.push(`/project/${project.id}`)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  )
}

// ── Estilos ────────────────────────────────────────────
const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: theme.colors.bg },

  // Top bar
  topBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   paddingHorizontal: theme.spacing.lg, paddingTop: 56, paddingBottom: 16,
                   backgroundColor: theme.colors.bg },
  topBarTitle:   { fontFamily: 'CormorantGaramond_400Regular', fontSize: 28, color: theme.colors.ink },
  topBarSub:     { fontFamily: 'DMSans_400Regular', fontSize: 12, color: theme.colors.inkLight, marginTop: 2 },

  // Botão primário
  btnPrimary:    { flexDirection: 'row', alignItems: 'center', gap: 6,
                   backgroundColor: theme.colors.ink, paddingHorizontal: 16, paddingVertical: 10,
                   borderRadius: theme.radius.sm },
  btnPrimaryText:{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: theme.colors.white },

  // Stats
  statsRow:      { flexDirection: 'row', gap: 10, paddingHorizontal: theme.spacing.lg, marginBottom: 8 },
  statCard:      { flex: 1, backgroundColor: theme.colors.white, borderWidth: 1,
                   borderColor: theme.colors.border, borderRadius: theme.radius.md,
                   padding: 14, alignItems: 'center' },
  statLabel:     { fontFamily: 'DMSans_400Regular', fontSize: 10, letterSpacing: 0.8,
                   textTransform: 'uppercase', color: theme.colors.inkLight, marginBottom: 4 },
  statValue:     { fontFamily: 'CormorantGaramond_400Regular', fontSize: 22, color: theme.colors.ink },

  // Filtros
  filtersScroll:   { flexGrow: 0, marginBottom: 8 },
  filtersContent:  { paddingHorizontal: theme.spacing.lg, gap: 8, paddingVertical: 8 },
  filterTab:       { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
                     borderWidth: 1, borderColor: theme.colors.border,
                     backgroundColor: theme.colors.white },
  filterTabActive: { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  filterTabText:   { fontFamily: 'DMSans_400Regular', fontSize: 12.5, color: theme.colors.inkMid },
  filterTabTextActive: { color: theme.colors.white },

  // Lista
  list:          { flex: 1 },
  listContent:   { paddingHorizontal: theme.spacing.lg, paddingBottom: 32, gap: 14 },
  listEmpty:     { flex: 1 },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Card
  card:          { backgroundColor: theme.colors.white, borderWidth: 1,
                   borderColor: theme.colors.border, borderRadius: theme.radius.lg,
                   overflow: 'hidden' },
  cardCover:     { height: 10, position: 'relative' },
  cardCoverAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardCoverPattern: { flex: 1 },
  cardBody:      { padding: 18 },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between',
                   alignItems: 'center', marginBottom: 6 },
  cardClient:    { fontFamily: 'DMSans_400Regular', fontSize: 11, letterSpacing: 0.8,
                   textTransform: 'uppercase', color: theme.colors.inkLight, flex: 1, marginRight: 8 },
  cardName:      { fontFamily: 'CormorantGaramond_400Regular', fontSize: 20,
                   color: theme.colors.ink, marginBottom: 12, lineHeight: 26 },
  cardMeta:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardMetaItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaText:  { fontFamily: 'DMSans_400Regular', fontSize: 12, color: theme.colors.inkLight },
  cardTotal:     { marginLeft: 'auto', fontFamily: 'CormorantGaramond_400Regular',
                   fontSize: 16, color: theme.colors.accent },

  // Badge
  badge:         { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText:     { fontFamily: 'DMSans_500Medium', fontSize: 10.5 },

  // Footer do card
  cardFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   paddingHorizontal: 18, paddingVertical: 12,
                   borderTopWidth: 1, borderTopColor: theme.colors.border },
  cardDate:      { fontFamily: 'DMSans_400Regular', fontSize: 11, color: theme.colors.inkXLight },
  cardActions:   { flexDirection: 'row', gap: 8 },
  iconBtn:       { width: 32, height: 32, borderRadius: 8, borderWidth: 1,
                   borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },

  // Empty state
  emptyState:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle:    { fontFamily: 'CormorantGaramond_300Light', fontSize: 24,
                   color: theme.colors.inkMid, marginBottom: 8 },
  emptySub:      { fontFamily: 'DMSans_400Regular', fontSize: 13, color: theme.colors.inkLight,
                   textAlign: 'center', marginBottom: 28, paddingHorizontal: 32 },
  btnAccent:     { flexDirection: 'row', alignItems: 'center', gap: 8,
                   backgroundColor: theme.colors.accent, paddingHorizontal: 20,
                   paddingVertical: 12, borderRadius: theme.radius.sm },
  btnAccentText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: theme.colors.white },
})