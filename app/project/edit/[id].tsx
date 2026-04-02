// app/project/edit/[id].tsx
import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { theme } from '@/constants/theme'
import { getProjectById, updateProject, ProjectStatus } from '@/services/db/projects'
import { showAlert } from '@/components/Dialog'
import Svg, { Path, Circle, Polyline } from 'react-native-svg'

// ── Ícones ─────────────────────────────────────────────
function IconArrowLeft() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={theme.colors.ink} strokeWidth={2}>
      <Path d="M19 12H5M12 5l-7 7 7 7" />
    </Svg>
  )
}
function IconCamera({ color = theme.colors.inkLight }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6}>
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <Circle cx={12} cy={13} r={4} />
    </Svg>
  )
}
function IconCheck({ color = theme.colors.white, size = 14 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  )
}

// ── Tipos ──────────────────────────────────────────────
const STATUS_OPTIONS: { key: ProjectStatus; label: string }[] = [
  { key: 'draft',  label: 'Rascunho'      },
  { key: 'active', label: 'Em andamento'  },
  { key: 'sent',   label: 'Enviado'       },
  { key: 'done',   label: 'Finalizado'    },
]

const ROOM_TYPES = [
  'Sala de Estar', 'Quarto', 'Cozinha',
  'Home Office', 'Área Gourmet', 'Banheiro',
  'Área Externa', 'Projeto Completo',
]

// ── Step indicator ─────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const steps = ['Informações', 'Visual']
  return (
    <View style={styles.stepBar}>
      {steps.map((label, i) => {
        const idx    = i + 1
        const done   = idx < current
        const active = idx === current
        return (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepCircle, active && styles.stepCircleActive, done && styles.stepCircleDone]}>
              {done
                ? <IconCheck size={12} />
                : <Text style={[styles.stepNum, active && styles.stepNumActive]}>{idx}</Text>}
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
            {i < steps.length - 1 && (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            )}
          </View>
        )
      })}
    </View>
  )
}

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}{required && <Text style={styles.fieldRequired}> *</Text>}
      </Text>
      {children}
    </View>
  )
}

function ImageUpload({ uri, label, onPick }: {
  uri: string | null; label: string; onPick: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.uploadZone, uri && styles.uploadZoneActive]}
      onPress={onPick}
      activeOpacity={0.8}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.uploadPreview} contentFit="cover" />
      ) : (
        <View style={styles.uploadPlaceholder}>
          <IconCamera />
          <Text style={styles.uploadLabel}>{label}</Text>
          <Text style={styles.uploadSub}>Toque para selecionar</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ══════════════════════════════════════════════════════
//  TELA PRINCIPAL
// ══════════════════════════════════════════════════════
export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const projectId = Number(id)

  const [loading,  setSaving]   = useState(true)
  const [step,     setStep]     = useState(1)
  const [saving,   setIsSaving] = useState(false)

  const [name,        setName]        = useState('')
  const [client,      setClient]      = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [description, setDescription] = useState('')
  const [roomType,    setRoomType]    = useState('')
  const [status,      setStatus]      = useState<ProjectStatus>('draft')
  const [logoUri,     setLogoUri]     = useState<string | null>(null)
  const [coverUri,    setCoverUri]    = useState<string | null>(null)

  useEffect(() => {
    getProjectById(projectId).then(async p => {
      if (!p) {
        await showAlert('Projeto não encontrado.', 'Erro')
        router.back()
        return
      }
      setName(p.name)
      setClient(p.client)
      setClientEmail(p.client_email ?? '')
      setDescription(p.description ?? '')
      setRoomType(p.type ?? '')
      setStatus(p.status)
      setLogoUri(p.logo_uri)
      setCoverUri(p.cover_uri)
      setSaving(false)
    })
  }, [projectId])

  const pickImage = useCallback(async (setter: (uri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      await showAlert('Permita o acesso à galeria.', 'Permissão necessária')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: true,
    })
    if (!result.canceled && result.assets[0]) setter(result.assets[0].uri)
  }, [])

  const canAdvance = () => {
    if (step === 1) return name.trim().length > 0 && client.trim().length > 0
    return true
  }

  const handleNext = () => {
    if (step < 2) { setStep(2); return }
    handleSave()
  }

  const handleSave = async () => {
    if (saving) return
    setIsSaving(true)
    try {
      await updateProject(projectId, {
        name:         name.trim(),
        client:       client.trim(),
        client_email: clientEmail.trim() || null,
        description:  description.trim(),
        type:         roomType,
        status,
        logo_uri:     logoUri,
        cover_uri:    coverUri,
      })
      router.replace(`/project/${projectId}`)
    } catch {
      await showAlert('Não foi possível salvar as alterações.', 'Erro')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => step > 1 ? setStep(1) : (router.canGoBack() ? router.back() : router.replace(`/project/${projectId}`))}
        >
          <IconArrowLeft />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Editar Projeto</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{name || 'APduo'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <StepBar current={step} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ════ STEP 1 — Informações ════ */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Informações do projeto</Text>
            <Text style={styles.stepDesc}>Edite os dados básicos deste projeto.</Text>

            <Field label="Nome do projeto" required>
              <TextInput
                style={styles.input}
                placeholder="Ex: Apartamento Jardins"
                placeholderTextColor={theme.colors.inkXLight}
                value={name}
                onChangeText={setName}
              />
            </Field>

            <Field label="Cliente" required>
              <TextInput
                style={styles.input}
                placeholder="Nome do cliente"
                placeholderTextColor={theme.colors.inkXLight}
                value={client}
                onChangeText={setClient}
              />
            </Field>

            <Field label="Email do cliente">
              <TextInput
                style={styles.input}
                placeholder="email@cliente.com.br"
                placeholderTextColor={theme.colors.inkXLight}
                value={clientEmail}
                onChangeText={setClientEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Field>

            <Field label="Descrição">
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Breve descrição do escopo..."
                placeholderTextColor={theme.colors.inkXLight}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Field>

            <Field label="Tipo de ambiente">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                {ROOM_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.pill, roomType === type && styles.pillActive]}
                    onPress={() => setRoomType(prev => prev === type ? '' : type)}
                  >
                    <Text style={[styles.pillText, roomType === type && styles.pillTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Field>

            <Field label="Status">
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.statusBtn, status === opt.key && styles.statusBtnActive]}
                    onPress={() => setStatus(opt.key)}
                  >
                    <Text style={[styles.statusBtnText, status === opt.key && styles.statusBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
          </View>
        )}

        {/* ════ STEP 2 — Visual ════ */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Identidade visual</Text>
            <Text style={styles.stepDesc}>Imagens que aparecem na capa do PDF gerado.</Text>

            <Field label="Logo do escritório">
              <ImageUpload uri={logoUri} label="Logo APduo" onPick={() => pickImage(setLogoUri)} />
              {logoUri && (
                <TouchableOpacity style={styles.removeImg} onPress={() => setLogoUri(null)}>
                  <Text style={styles.removeImgText}>Remover logo</Text>
                </TouchableOpacity>
              )}
            </Field>

            <Field label="Imagem de capa">
              <ImageUpload uri={coverUri} label="Foto de capa do projeto" onPick={() => pickImage(setCoverUri)} />
              {coverUri && (
                <TouchableOpacity style={styles.removeImg} onPress={() => setCoverUri(null)}>
                  <Text style={styles.removeImgText}>Remover capa</Text>
                </TouchableOpacity>
              )}
            </Field>
          </View>
        )}

      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnNext, (!canAdvance() || saving) && styles.btnNextDisabled]}
          onPress={handleNext}
          disabled={!canAdvance() || saving}
          activeOpacity={0.85}
        >
          <Text style={styles.btnNextText}>
            {saving ? 'Salvando...' : step < 2 ? 'Próximo  1/2' : 'Salvar alterações'}
          </Text>
          {!saving && step === 2 && <IconCheck />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ── Estilos ────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.bg,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontFamily: 'CormorantGaramond_400Regular', fontSize: 20, color: theme.colors.ink },
  headerSub: {
    fontFamily: 'DMSans_400Regular', fontSize: 11,
    color: theme.colors.inkLight, letterSpacing: 0.8, textTransform: 'uppercase',
  },

  stepBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  stepItem:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepCircle: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: theme.colors.borderDk,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  stepCircleActive: { borderColor: theme.colors.ink, backgroundColor: theme.colors.ink },
  stepCircleDone:   { borderColor: theme.colors.ink, backgroundColor: theme.colors.ink },
  stepNum:          { fontFamily: 'DMSans_400Regular', fontSize: 11, color: theme.colors.inkLight },
  stepNumActive:    { color: theme.colors.white },
  stepLabel:        { fontFamily: 'DMSans_400Regular', fontSize: 12, color: theme.colors.inkLight },
  stepLabelActive:  { color: theme.colors.ink, fontFamily: 'DMSans_500Medium' },
  stepLine:         { width: 28, height: 1.5, backgroundColor: theme.colors.border, marginHorizontal: 6 },
  stepLineDone:     { backgroundColor: theme.colors.ink },

  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  stepContent:   { padding: theme.spacing.lg },

  stepTitle: { fontFamily: 'CormorantGaramond_400Regular', fontSize: 26, color: theme.colors.ink, marginBottom: 6 },
  stepDesc:  { fontFamily: 'DMSans_400Regular', fontSize: 13.5, color: theme.colors.inkLight, marginBottom: 28, lineHeight: 20 },

  field:      { marginBottom: 22 },
  fieldLabel: {
    fontFamily: 'DMSans_500Medium', fontSize: 11,
    letterSpacing: 0.8, textTransform: 'uppercase',
    color: theme.colors.inkMid, marginBottom: 8,
  },
  fieldRequired: { color: theme.colors.danger },

  input: {
    backgroundColor: theme.colors.white,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'DMSans_400Regular', fontSize: 14, color: theme.colors.ink,
  },
  inputMultiline: { minHeight: 90, paddingTop: 12 },

  pillsRow:      { gap: 8, paddingBottom: 4 },
  pill:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  pillActive:    { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  pillText:      { fontFamily: 'DMSans_400Regular', fontSize: 13, color: theme.colors.inkMid },
  pillTextActive:{ color: theme.colors.white },

  statusRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn:           { paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radius.sm, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.white },
  statusBtnActive:     { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  statusBtnText:       { fontFamily: 'DMSans_400Regular', fontSize: 13, color: theme.colors.inkMid },
  statusBtnTextActive: { color: theme.colors.white },

  uploadZone:        { height: 140, borderRadius: theme.radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.borderDk, backgroundColor: theme.colors.bgCard, overflow: 'hidden' },
  uploadZoneActive:  { borderStyle: 'solid', borderColor: theme.colors.ink },
  uploadPreview:     { width: '100%', height: '100%' },
  uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  uploadLabel:       { fontFamily: 'DMSans_500Medium', fontSize: 13, color: theme.colors.inkMid },
  uploadSub:         { fontFamily: 'DMSans_400Regular', fontSize: 11, color: theme.colors.inkXLight },
  removeImg:         { marginTop: 8, alignSelf: 'flex-end' },
  removeImgText:     { fontFamily: 'DMSans_400Regular', fontSize: 12, color: theme.colors.danger },

  footer:          { padding: theme.spacing.lg, paddingBottom: 32, backgroundColor: theme.colors.bg, borderTopWidth: 1, borderTopColor: theme.colors.border },
  btnNext:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: theme.colors.ink, paddingVertical: 16, borderRadius: theme.radius.sm },
  btnNextDisabled: { backgroundColor: theme.colors.inkXLight },
  btnNextText:     { fontFamily: 'DMSans_500Medium', fontSize: 15, color: theme.colors.white },
})