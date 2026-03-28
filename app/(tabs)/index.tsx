// app/(tabs)/index.tsx
import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, Alert, ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import { useFocusEffect, router } from 'expo-router'
import { theme } from '@/constants/theme'
import { getAllProjects, deleteProject, Project } from '@/services/db/projects'
import { shareProjectPdf } from '@/services/pdfService'
import Svg, { Path, Line, Circle, Polyline, Rect } from 'react-native-svg'

// ── Ícones ─────────────────────────────────────────────
function IconPlus() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.white} strokeWidth={2}>
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Line x1={5} y1={12} x2={19} y2={12} />
    </Svg>
  )
}

function IconDownload({ color = theme.colors.inkLight }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8}>
      <Path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <Polyline points="7 10 12 15 17 10" />
      <Line x1={12} y1={15} x2={12} y2={3} />
    </Svg>
  )
}

function IconEdit({ color = theme.colors.inkLight }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8}>
      <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  )
}

function IconTrash({ color = theme.colors.danger }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8}>
      <Polyline points="3 6 5 6 21 6" />
      <Path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <Path d="M10 11v6M14 11v6" />
      <Path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </Svg>
  )
}

function IconFolder({ color = theme.colors.inkXLight }: { color?: string }) {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1}>
      <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </Svg>
  )
}

// ── Card de projeto ────────────────────────────────────
function ProjectCard({
  project,
  onPress,
  onEdit,
  onDelete,
  onDownload,
  downloading,
}: {
  project:     Project
  onPress:     () => void
  onEdit:      () => void
  onDelete:    () => void
  onDownload:  () => void
  downloading: boolean
}) {
  const formattedDate = new Date(project.created_at ?? Date.now())
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Capa */}
      <View style={styles.cardCover}>
        {project.cover_uri ? (
          <Image
            source={{ uri: project.cover_uri }}
            style={styles.cardCoverImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.cardCoverPlaceholder}>
            <IconFolder />
          </View>
        )}
        <View style={styles.cardCoverOverlay} />
      </View>

      {/* Conteúdo */}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {project.name}
            </Text>
            <Text style={styles.cardClient} numberOfLines={1}>
              {project.client}
            </Text>
          </View>
          {project.type && (
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>{project.type}</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardDate}>{formattedDate}</Text>

        {/* Ações */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconEdit />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cardActionBtn}
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconTrash />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cardActionBtn, styles.cardActionDownload]}
            onPress={onDownload}
            disabled={downloading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {downloading
              ? <ActivityIndicator size="small" color={theme.colors.white} />
              : <IconDownload color={theme.colors.white} />
            }
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ══════════════════════════════════════════════════════
//  TELA PRINCIPAL
// ══════════════════════════════════════════════════════
export default function HomeScreen() {
  const [projects,     setProjects]     = useState<Project[]>([])
  const [loading,      setLoading]      = useState(true)
  const [refreshing,   setRefreshing]   = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const loadProjects = useCallback(async () => {
    try {
      const data = await getAllProjects()
      setProjects(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => { loadProjects() }, [loadProjects])
  )

  const handleRefresh = () => {
    setRefreshing(true)
    loadProjects()
  }

  const handleDelete = (project: Project) => {
    Alert.alert(
      'Excluir projeto',
      `Tem certeza que deseja excluir "${project.name}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProject(project.id)
              setProjects(prev => prev.filter(p => p.id !== project.id))
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir o projeto.')
            }
          },
        },
      ]
    )
  }

  const handleDownload = async (project: Project) => {
    setDownloadingId(project.id)
    try {
      await shareProjectPdf(project.id)
    } catch (e: any) {
      Alert.alert('Erro ao gerar PDF', e?.message ?? 'Tente novamente.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleEdit = (project: Project) => {
    router.push(`/project/edit/${project.id}`)
  }

  // ── Render ─────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.ink} />
      </View>
    )
  }

  return (
    <View style={styles.container}>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <Image
          source={require('@/assets/images/Logo-Horizontal-edit-1.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <TouchableOpacity
          style={styles.btnNew}
          onPress={() => router.push('/(tabs)/new-project')}
          activeOpacity={0.85}
        >
          <IconPlus />
          <Text style={styles.btnNewText}>Novo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          projects.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.inkLight}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {projects.length === 0 ? (
          <View style={styles.emptyState}>
            <IconFolder />
            <Text style={styles.emptyTitle}>Nenhum projeto ainda</Text>
            <Text style={styles.emptySub}>
              Toque em "Novo" para criar seu primeiro projeto.
            </Text>
          </View>
        ) : (
          projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onPress={() => router.push(`/project/${project.id}`)}
              onEdit={() => handleEdit(project)}
              onDelete={() => handleDelete(project)}
              onDownload={() => handleDownload(project)}
              downloading={downloadingId === project.id}
            />
          ))
        )}
      </ScrollView>

    </View>
  )
}

// ── Estilos ────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: theme.colors.bg },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop:        56,
    paddingBottom:     16,
    backgroundColor:   theme.colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  logo: {
    height: 36,
    width:  180,
  },
  btnNew: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            6,
    backgroundColor: theme.colors.ink,
    paddingHorizontal: 16,
    paddingVertical:    10,
    borderRadius:   theme.radius.sm,
  },
  btnNewText: {
    fontFamily: theme.font.sansMedium,
    fontSize:   13,
    color:      theme.colors.white,
  },

  list:      { padding: theme.spacing.lg, gap: 16 },
  listEmpty: { flex: 1 },

  // Empty state
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingTop: 80,
  },
  emptyTitle: {
    fontFamily: theme.font.serif,
    fontSize:   24,
    color:      theme.colors.inkMid,
  },
  emptySub: {
    fontFamily: theme.font.sans,
    fontSize:   14,
    color:      theme.colors.inkLight,
    textAlign:  'center',
    lineHeight: 22,
  },

  // Card
  card: {
    backgroundColor: theme.colors.white,
    borderRadius:    theme.radius.md,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     theme.colors.border,
  },
  cardCover: {
    height:   160,
    position: 'relative',
  },
  cardCoverImage: {
    width:  '100%',
    height: '100%',
  },
  cardCoverPlaceholder: {
    flex:            1,
    backgroundColor: theme.colors.bgPanel,
    alignItems:      'center',
    justifyContent:  'center',
  },
  cardCoverOverlay: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          60,
    backgroundColor: 'transparent',
  },

  cardBody: {
    padding: theme.spacing.md,
    gap:     8,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           8,
  },
  cardTitle: {
    fontFamily: theme.font.serif,
    fontSize:   20,
    color:      theme.colors.ink,
    lineHeight: 26,
  },
  cardClient: {
    fontFamily: theme.font.sans,
    fontSize:   13,
    color:      theme.colors.inkMid,
  },
  cardBadge: {
    backgroundColor: theme.colors.bgPanel,
    borderRadius:    theme.radius.xs,
    paddingHorizontal: 8,
    paddingVertical:   4,
    borderWidth:     1,
    borderColor:     theme.colors.border,
  },
  cardBadgeText: {
    fontFamily: theme.font.sans,
    fontSize:   10,
    color:      theme.colors.inkMid,
    letterSpacing: 0.5,
  },
  cardDate: {
    fontFamily: theme.font.sans,
    fontSize:   11,
    color:      theme.colors.inkLight,
  },

  // Ações do card
  cardActions: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    marginTop:      4,
    justifyContent: 'flex-end',
  },
  cardActionBtn: {
    width:           40,
    height:          40,
    borderRadius:    theme.radius.sm,
    backgroundColor: theme.colors.bgPanel,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     theme.colors.border,
  },
  cardActionDownload: {
    backgroundColor: theme.colors.ink,
    borderColor:     theme.colors.ink,
  },
})