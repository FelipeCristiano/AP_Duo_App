// app/project/pdf-preview.tsx
import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { theme } from '@/constants/theme'
import { getProjectById, Project } from '@/services/db/projects'
import { generateProjectPdf, shareProjectPdf } from '@/services/pdfService'
import Svg, { Path, Line, Polyline, Circle } from 'react-native-svg'

// ── Ícones ─────────────────────────────────────────────
function IconBack() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.ink} strokeWidth={2}>
      <Path d="M19 12H5M12 5l-7 7 7 7" />
    </Svg>
  )
}
function IconShare() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.white} strokeWidth={2}>
      <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <Polyline points="16 6 12 2 8 6" />
      <Line x1={12} y1={2} x2={12} y2={15} />
    </Svg>
  )
}
function IconPDF() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.inkLight} strokeWidth={1.2}>
      <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <Polyline points="14 2 14 8 20 8" />
      <Line x1={16} y1={13} x2={8} y2={13} />
      <Line x1={16} y1={17} x2={8} y2={17} />
      <Polyline points="10 9 9 9 8 9" />
    </Svg>
  )
}
function IconCheck() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.success} strokeWidth={1.5}>
      <Circle cx={12} cy={12} r={10} />
      <Polyline points="9 12 11 14 15 10" />
    </Svg>
  )
}

// ── Estados da geração ─────────────────────────────────
type Stage =
  | 'idle'       // aguardando o usuário iniciar
  | 'loading'    // buscando dados e convertendo imagens
  | 'generating' // expo-print gerando o PDF
  | 'done'       // PDF gerado com sucesso
  | 'error'      // falha em alguma etapa

// ── Mensagens de progresso por etapa ──────────────────
const STAGE_MESSAGES: Record<Stage, string> = {
  idle:       'Pronto para gerar o PDF.',
  loading:    'Buscando dados e preparando imagens...',
  generating: 'Gerando o documento PDF...',
  done:       'PDF gerado com sucesso!',
  error:      'Ocorreu um erro ao gerar o PDF.',
}

// ══════════════════════════════════════════════════════
//  TELA PRINCIPAL
// ══════════════════════════════════════════════════════
export default function PdfPreviewScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>()
  const id = Number(projectId)

  const [project,  setProject]  = useState<Project | null>(null)
  const [stage,    setStage]    = useState<Stage>('idle')
  const [pdfUri,   setPdfUri]   = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Carrega dados básicos do projeto para exibir na tela
  useEffect(() => {
    getProjectById(id).then(setProject)
  }, [id])

  // ── Gera o PDF ─────────────────────────────────────
  const handleGenerate = async () => {
    if (stage === 'loading' || stage === 'generating') return

    try {
      setPdfUri(null)
      setErrorMsg(null)
      setStage('loading')

      // A geração é assíncrona em duas etapas:
      // 1. busca dados + converte imagens para base64
      // 2. expo-print monta o PDF
      // O pdfService cuida disso internamente, mas separamos
      // o feedback visual em dois momentos com um pequeno delay
      const result = await new Promise<{ uri: string; fileName: string }>(
        (resolve, reject) => {
          // Dá um tick para a UI atualizar antes de começar o processamento pesado
          setTimeout(async () => {
            try {
              setStage('generating')
              const r = await generateProjectPdf(id)
              resolve(r)
            } catch (e) {
              reject(e)
            }
          }, 300)
        }
      )

      setPdfUri(result.uri)
      setStage('done')
    } catch (e: any) {
      setStage('error')
      setErrorMsg(e?.message ?? 'Erro desconhecido')
      console.error('[PdfPreview] Erro ao gerar PDF:', e)
    }
  }

  // ── Compartilha o PDF já gerado ────────────────────
  const handleShare = async () => {
    if (!pdfUri) return
    try {
      await shareProjectPdf(id)
    } catch (e: any) {
      Alert.alert('Erro ao compartilhar', e?.message ?? 'Tente novamente.')
    }
  }

  // ── Gera e compartilha em uma etapa só ────────────
  const handleGenerateAndShare = async () => {
    if (stage === 'loading' || stage === 'generating') return
    try {
      setPdfUri(null)
      setErrorMsg(null)
      setStage('loading')
      setTimeout(async () => {
        try {
          setStage('generating')
          await shareProjectPdf(id)
          setStage('done')
        } catch (e: any) {
          setStage('error')
          setErrorMsg(e?.message ?? 'Erro desconhecido')
        }
      }, 300)
    } catch (e: any) {
      setStage('error')
      setErrorMsg(e?.message ?? 'Erro desconhecido')
    }
  }

  const isProcessing = stage === 'loading' || stage === 'generating'

  // ── Render ─────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconBack />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Exportar PDF</Text>
          {project && (
            <Text style={styles.headerSub} numberOfLines={1}>
              {project.name}
            </Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Corpo ── */}
      <View style={styles.body}>

        {/* Ícone de status */}
        <View style={styles.iconArea}>
          {isProcessing ? (
            <ActivityIndicator
              size="large"
              color={theme.colors.accent}
              style={styles.spinner}
            />
          ) : stage === 'done' ? (
            <IconCheck />
          ) : (
            <IconPDF />
          )}
        </View>

        {/* Mensagem de status */}
        <Text style={styles.stageMessage}>
          {STAGE_MESSAGES[stage]}
        </Text>

        {/* Detalhe da etapa em processamento */}
        {isProcessing && (
          <Text style={styles.stageDetail}>
            {stage === 'loading'
              ? 'Isso pode levar alguns segundos dependendo do número de produtos e imagens.'
              : 'Renderizando o documento com capa e tabelas...'}
          </Text>
        )}

        {/* Mensagem de erro */}
        {stage === 'error' && errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Info do projeto */}
        {project && stage === 'idle' && (
          <View style={styles.projectCard}>
            <View style={[styles.projectCardAccent, { backgroundColor: project.accent }]} />
            <View style={styles.projectCardBody}>
              <Text style={styles.projectCardName}>{project.name}</Text>
              <Text style={styles.projectCardClient}>{project.client}</Text>
              <Text style={styles.projectCardHint}>
                O PDF incluirá capa, todos os cômodos e produtos com subtotais e total geral.
              </Text>
            </View>
          </View>
        )}

        {/* URI do PDF gerado */}
        {stage === 'done' && pdfUri && (
          <View style={styles.successCard}>
            <Text style={styles.successLabel}>Arquivo gerado</Text>
            <Text style={styles.successUri} numberOfLines={2}>{pdfUri}</Text>
          </View>
        )}

      </View>

      {/* ── Footer com ações ── */}
      <View style={styles.footer}>

        {/* Idle: dois botões */}
        {stage === 'idle' && (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.btnSecondary, { flex: 1 }]}
              onPress={handleGenerate}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSecondaryText}>Só gerar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, { flex: 2 }]}
              onPress={handleGenerateAndShare}
              activeOpacity={0.85}
            >
              <IconShare />
              <Text style={styles.btnPrimaryText}>Gerar e compartilhar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Processando: desabilitado */}
        {isProcessing && (
          <View style={[styles.btnPrimary, styles.btnDisabled]}>
            <Text style={styles.btnPrimaryText}>Processando...</Text>
          </View>
        )}

        {/* Done: compartilhar ou tentar novamente */}
        {stage === 'done' && (
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.btnSecondary, { flex: 1 }]}
              onPress={() => setStage('idle')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnSecondaryText}>Regerar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, { flex: 2 }]}
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <IconShare />
              <Text style={styles.btnPrimaryText}>Compartilhar PDF</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error: tentar novamente */}
        {stage === 'error' && (
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => setStage('idle')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Tentar novamente</Text>
          </TouchableOpacity>
        )}

      </View>
    </View>
  )
}

// ── Estilos ────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },

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

  // Corpo
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: 20,
  },

  iconArea: {
    width: 96, height: 96,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.bgPanel,
    borderRadius: 24,
    marginBottom: 8,
  },
  spinner: { transform: [{ scale: 1.4 }] },

  stageMessage: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 22, color: theme.colors.ink,
    textAlign: 'center',
  },
  stageDetail: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13, color: theme.colors.inkLight,
    textAlign: 'center', lineHeight: 20,
    paddingHorizontal: 24,
  },

  // Erro
  errorBox: {
    backgroundColor: theme.colors.danger + '15',
    borderWidth: 1, borderColor: theme.colors.danger + '40',
    borderRadius: theme.radius.md,
    padding: 14, width: '100%',
  },
  errorText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13, color: theme.colors.danger,
    textAlign: 'center',
  },

  // Card do projeto
  projectCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 460,
  },
  projectCardAccent: { width: 4 },
  projectCardBody:   { flex: 1, padding: 16, gap: 4 },
  projectCardName: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 18, color: theme.colors.ink,
  },
  projectCardClient: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12, color: theme.colors.inkLight,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  projectCardHint: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12, color: theme.colors.inkMid,
    lineHeight: 18, marginTop: 4,
  },

  // Card de sucesso
  successCard: {
    backgroundColor: theme.colors.white,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 14, width: '100%', maxWidth: 460,
  },
  successLabel: {
    fontFamily: 'DMSans_500Medium', fontSize: 10,
    letterSpacing: 1, textTransform: 'uppercase',
    color: theme.colors.inkLight, marginBottom: 6,
  },
  successUri: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11, color: theme.colors.inkMid,
    lineHeight: 16,
  },

  // Footer
  footer: {
    padding: theme.spacing.lg, paddingBottom: 32,
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  footerRow: { flexDirection: 'row', gap: 10 },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.ink,
    paddingVertical: 16, borderRadius: theme.radius.sm,
  },
  btnPrimaryText: {
    fontFamily: 'DMSans_500Medium', fontSize: 15, color: theme.colors.white,
  },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.white,
    borderWidth: 1, borderColor: theme.colors.borderDk,
    paddingVertical: 16, borderRadius: theme.radius.sm,
  },
  btnSecondaryText: {
    fontFamily: 'DMSans_500Medium', fontSize: 15, color: theme.colors.ink,
  },
  btnDisabled: {
    opacity: 0.5,
  },
})