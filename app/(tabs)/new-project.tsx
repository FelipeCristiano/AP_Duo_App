import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { theme } from '@/constants/theme'
import { useProjectStore } from '@/stores/projectStore'
import { createCategory } from '@/services/db/products'
import { showAlert } from '@/components/Dialog'
import Svg, { Path, Line, Circle, Polyline } from 'react-native-svg'

// ── Ícones ─────────────────────────────────────────────
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
function IconPlus({ color = theme.colors.white, size = 16 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Line x1={5} y1={12} x2={19} y2={12} />
    </Svg>
  )
}
function IconX({ color = theme.colors.inkLight, size = 12 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
      <Line x1={18} y1={6} x2={6} y2={18} />
      <Line x1={6} y1={6} x2={18} y2={18} />
    </Svg>
  )
}
function IconArrowLeft() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={theme.colors.ink} strokeWidth={2}>
      <Path d="M19 12H5M12 5l-7 7 7 7" />
    </Svg>
  )
}

// ── Tipos ──────────────────────────────────────────────
type Status = 'draft' | 'active' | 'sent' | 'done'

const STATUS_OPTIONS: { key: Status; label: string }[] = [
  { key: 'draft',  label: 'Rascunho'     },
  { key: 'active', label: 'Em andamento' },
  { key: 'sent',   label: 'Enviado'      },
  { key: 'done',   label: 'Finalizado'   },
]

const ROOM_TYPES = [
  'Sala de Estar', 'Quarto', 'Cozinha',
  'Home Office', 'Área Gourmet', 'Banheiro',
  'Área Externa', 'Projeto Completo',
]

const ROOM_SUGGESTIONS = [
  'Sala de Estar', 'Sala de Jantar', 'Cozinha',
  'Quarto Casal', 'Quarto Filho', 'Banheiro',
  'Varanda', 'Home Office', 'Área Gourmet',
  'Lavanderia', 'Hall de Entrada',
]

// ── Step indicator ─────────────────────────────────────
function StepBar({ current }: { current: number }) {
  const steps = ['Informações', 'Visual', 'Cômodos']
  return (
    <View style={styles.stepBar}>
      {steps.map((label, i) => {
        const idx    = i + 1
        const done   = idx < current
        const active = idx === current
        return (
          <View key={label} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              active && styles.stepCircleActive,
              done   && styles.stepCircleDone,
            ]}>
              {done
                ? <IconCheck size={12} />
                : <Text style={[styles.stepNum, active && styles.stepNumActive]}>{idx}</Text>
              }
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
              {label}
            </Text>
            {i < steps.length - 1 && (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            )}
          </View>
        )
      })}
    </View>
  )
}

// ── Campo de formulário ────────────────────────────────
function Field({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={styles.fieldRequired}> *</Text>}
      </Text>
      {children}
    </View>
  )
}

// ── Upload de imagem ───────────────────────────────────
function ImageUpload({ uri, label, onPick }: {
  uri:    string | null
  label:  string
  onPick: () => void
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
export default function NewProjectScreen() {
  const { addProject } = useProjectStore()

  const [step, setStep] = useState(1)

  // Step 1 — Informações
  const [name,          setName]          = useState('')
  const [client,        setClient]        = useState('')
  const [clientEmail,   setClientEmail]   = useState('')
  const [description,   setDescription]   = useState('')
  const [roomType,      setRoomType]      = useState('')
  const [roomTypeInput, setRoomTypeInput] = useState('')
  const [status,        setStatus]        = useState<Status>('draft')

  // Step 2 — Visual
  const [logoUri,  setLogoUri]  = useState<string | null>(null)
  const [coverUri, setCoverUri] = useState<string | null>(null)

  // Step 3 — Cômodos
  const [rooms,        setRooms]        = useState<string[]>([])
  const [newRoomInput, setNewRoomInput] = useState('')

  const [saving, setSaving] = useState(false)

  // ── Image picker ───────────────────────────────────
  const pickImage = useCallback(async (setter: (uri: string) => void) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      await showAlert('Permita o acesso à galeria nas configurações.', 'Permissão necessária')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    })
    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].uri)
    }
  }, [])

  // ── Cômodos ────────────────────────────────────────
  const addRoom = () => {
    const val = newRoomInput.trim()
    if (!val || rooms.includes(val)) return
    setRooms(prev => [...prev, val])
    setNewRoomInput('')
  }

  const addRoomSuggestion = (sug: string) => {
    if (rooms.includes(sug)) return
    setRooms(prev => [...prev, sug])
  }

  const removeRoom = (room: string) => {
    setRooms(prev => prev.filter(r => r !== room))
  }

  // ── Validação ──────────────────────────────────────
  const canAdvance = () => {
    if (step === 1) return name.trim().length > 0 && client.trim().length > 0
    if (step === 2) return true
    return rooms.length > 0
  }

  const handleNext = () => {
    if (step < 3) setStep(s => s + 1)
    else handleSave()
  }

  // ── Salvar ─────────────────────────────────────────
  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    try {
      const projectId = await addProject({
        name:         name.trim(),
        client:       client.trim(),
        client_email: clientEmail.trim() || null,
        description:  description.trim(),
        type:         roomType,
        status,
        accent:       theme.colors.ink,
        logo_uri:     logoUri,
        cover_uri:    coverUri,
        pdf_uri:      null,
      })

      await Promise.all(
        rooms.map((room, i) => createCategory(projectId, room, i))
      )

      router.replace(`/project/${projectId}`)
    } catch (e) {
      await showAlert('Não foi possível salvar o projeto.', 'Erro')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => step > 1 ? setStep(s => s - 1) : router.back()}
        >
          <IconArrowLeft />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Novo Projeto</Text>
          <Text style={styles.headerSub}>APduo</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Steps */}
      <StepBar current={step} />

      {/* Conteúdo */}
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
            <Text style={styles.stepDesc}>
              Dados básicos que identificam este projeto e seu cliente.
            </Text>

            <Field label="Nome do projeto" required>
              <TextInput
                style={styles.input}
                placeholder="Ex: Apartamento Jardins"
                placeholderTextColor={theme.colors.inkXLight}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
              />
            </Field>

            <Field label="Cliente" required>
              <TextInput
                style={styles.input}
                placeholder="Nome do cliente"
                placeholderTextColor={theme.colors.inkXLight}
                value={client}
                onChangeText={setClient}
                returnKeyType="next"
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
                returnKeyType="next"
              />
            </Field>

            <Field label="Descrição">
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Breve descrição do escopo ou observações..."
                placeholderTextColor={theme.colors.inkXLight}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Field>

            <Field label="Tipo de ambiente">
              <View style={styles.addRoomRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Ex: Projeto Completo, Escritório..."
                  placeholderTextColor={theme.colors.inkXLight}
                  value={roomTypeInput}
                  onChangeText={setRoomTypeInput}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    const val = roomTypeInput.trim()
                    if (val) { setRoomType(val); setRoomTypeInput('') }
                  }}
                />
                <TouchableOpacity
                  style={styles.addRoomBtn}
                  onPress={() => {
                    const val = roomTypeInput.trim()
                    if (val) { setRoomType(val); setRoomTypeInput('') }
                  }}
                >
                  <IconPlus />
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.pillsRow, { marginTop: 12 }]}
              >
                {ROOM_TYPES.filter(t => t !== roomType).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={styles.pill}
                    onPress={() => setRoomType(type)}
                  >
                    <Text style={styles.pillText}>+ {type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {roomType !== '' && (
                <View style={[styles.roomsList, { marginTop: 12 }]}>
                  <View style={styles.roomItem}>
                    <Text style={styles.roomName}>{roomType}</Text>
                    <TouchableOpacity
                      onPress={() => setRoomType('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.roomRemove}
                    >
                      <IconX />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Field>

            <Field label="Status inicial">
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
            <Text style={styles.stepDesc}>
              Estas imagens aparecerão na capa do PDF gerado.
            </Text>

            <Field label="Logo do escritório">
              <ImageUpload
                uri={logoUri}
                label="Logo APduo"
                onPick={() => pickImage(setLogoUri)}
              />
              {logoUri && (
                <TouchableOpacity style={styles.removeImg} onPress={() => setLogoUri(null)}>
                  <Text style={styles.removeImgText}>Remover logo</Text>
                </TouchableOpacity>
              )}
            </Field>

            <Field label="Imagem de capa">
              <ImageUpload
                uri={coverUri}
                label="Foto de capa do projeto"
                onPick={() => pickImage(setCoverUri)}
              />
              {coverUri && (
                <TouchableOpacity style={styles.removeImg} onPress={() => setCoverUri(null)}>
                  <Text style={styles.removeImgText}>Remover capa</Text>
                </TouchableOpacity>
              )}
            </Field>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                Você pode pular esta etapa e adicionar as imagens depois nas configurações do projeto.
              </Text>
            </View>
          </View>
        )}

        {/* ════ STEP 3 — Cômodos ════ */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Cômodos do projeto</Text>
            <Text style={styles.stepDesc}>
              Crie os ambientes deste projeto. Os produtos serão organizados por cômodo no PDF.
            </Text>

            <Field label="Adicionar cômodo">
              <View style={styles.addRoomRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Ex: Quarto Casal, Sala de Estar..."
                  placeholderTextColor={theme.colors.inkXLight}
                  value={newRoomInput}
                  onChangeText={setNewRoomInput}
                  onSubmitEditing={addRoom}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.addRoomBtn} onPress={addRoom}>
                  <IconPlus />
                </TouchableOpacity>
              </View>
            </Field>

            <Field label="Sugestões rápidas">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillsRow}
              >
                {ROOM_SUGGESTIONS
                  .filter(s => !rooms.includes(s))
                  .map(sug => (
                    <TouchableOpacity
                      key={sug}
                      style={styles.pill}
                      onPress={() => addRoomSuggestion(sug)}
                    >
                      <Text style={styles.pillText}>+ {sug}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </Field>

            {rooms.length > 0 && (
              <Field label={`Cômodos adicionados (${rooms.length})`}>
                <View style={styles.roomsList}>
                  {rooms.map((room, index) => (
                    <View key={room} style={styles.roomItem}>
                      <View style={styles.roomIndex}>
                        <Text style={styles.roomIndexText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.roomName}>{room}</Text>
                      <TouchableOpacity
                        onPress={() => removeRoom(room)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.roomRemove}
                      >
                        <IconX />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </Field>
            )}

            {rooms.length === 0 && (
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>
                  Adicione ao menos um cômodo para continuar.
                </Text>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Botão de ação */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnNext, !canAdvance() && styles.btnNextDisabled]}
          onPress={handleNext}
          disabled={!canAdvance() || saving}
          activeOpacity={0.85}
        >
          <Text style={styles.btnNextText}>
            {saving
              ? 'Salvando...'
              : step < 3
                ? `Próximo  ${step}/3`
                : 'Criar projeto'}
          </Text>
          {!saving && step === 3 && <IconCheck />}
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  )
}

// ── Estilos ────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.bg,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 20, color: theme.colors.ink,
  },
  headerSub: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11, color: theme.colors.inkLight,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  stepBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  stepItem:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
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

  stepTitle: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 26, color: theme.colors.ink, marginBottom: 6,
  },
  stepDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13.5, color: theme.colors.inkLight,
    marginBottom: 28, lineHeight: 20,
  },

  field:         { marginBottom: 22 },
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
    fontFamily: 'DMSans_400Regular',
    fontSize: 14, color: theme.colors.ink,
  },
  inputMultiline: { minHeight: 90, paddingTop: 12 },

  pillsRow: { gap: 8, paddingBottom: 4 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  pillActive:     { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  pillText:       { fontFamily: 'DMSans_400Regular', fontSize: 13, color: theme.colors.inkMid },
  pillTextActive: { color: theme.colors.white },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: theme.radius.sm, borderWidth: 1,
    borderColor: theme.colors.border, backgroundColor: theme.colors.white,
  },
  statusBtnActive:     { backgroundColor: theme.colors.ink, borderColor: theme.colors.ink },
  statusBtnText:       { fontFamily: 'DMSans_400Regular', fontSize: 13, color: theme.colors.inkMid },
  statusBtnTextActive: { color: theme.colors.white },

  uploadZone: {
    height: 140, borderRadius: theme.radius.md,
    borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: theme.colors.borderDk,
    backgroundColor: theme.colors.bgCard, overflow: 'hidden',
  },
  uploadZoneActive:   { borderStyle: 'solid', borderColor: theme.colors.ink },
  uploadPreview:      { width: '100%', height: '100%' },
  uploadPlaceholder:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  uploadLabel:        { fontFamily: 'DMSans_500Medium', fontSize: 13, color: theme.colors.inkMid },
  uploadSub:          { fontFamily: 'DMSans_400Regular', fontSize: 11, color: theme.colors.inkXLight },
  removeImg:          { marginTop: 8, alignSelf: 'flex-end' },
  removeImgText:      { fontFamily: 'DMSans_400Regular', fontSize: 12, color: theme.colors.danger },

  addRoomRow: { flexDirection: 'row', gap: 10 },
  addRoomBtn: {
    width: 48, height: 48,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },

  roomsList: { gap: 10 },
  roomItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.white,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  roomIndex: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: theme.colors.bgPanel,
    alignItems: 'center', justifyContent: 'center',
  },
  roomIndexText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: theme.colors.inkMid },
  roomName:      { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: theme.colors.ink },
  roomRemove:    { padding: 4 },

  infoBox: {
    backgroundColor: theme.colors.bgPanel,
    borderRadius: theme.radius.md,
    padding: 14, marginTop: 4,
  },
  infoBoxText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13, color: theme.colors.inkMid, lineHeight: 20,
  },

  footer: {
    padding: theme.spacing.lg, paddingBottom: 32,
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  btnNext: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: theme.colors.ink,
    paddingVertical: 16, borderRadius: theme.radius.sm,
  },
  btnNextDisabled: { backgroundColor: theme.colors.inkXLight },
  btnNextText:     { fontFamily: 'DMSans_500Medium', fontSize: 15, color: theme.colors.white },
})