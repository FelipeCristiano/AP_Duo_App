// app/(tabs)/settings.tsx
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { theme } from '@/constants/theme'
import { getOfficeInfo, saveOfficeInfo, resetOfficeInfo, OfficeInfo } from '@/services/settings'
import Svg, { Path, Line, Circle, Polyline } from 'react-native-svg'

const APP_VERSION = '1.0.0'

// ── Ícones ─────────────────────────────────────────────
function IconBuilding({ color = theme.colors.inkLight }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8}>
      <Path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  )
}

function IconFolder({ color = theme.colors.inkLight }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8}>
      <Path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
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

function IconCheck({ color = theme.colors.white }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.5}>
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  )
}

function IconInfo({ color = theme.colors.inkLight }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8}>
      <Circle cx={12} cy={12} r={10} />
      <Line x1={12} y1={8} x2={12} y2={12} />
      <Line x1={12} y1={16} x2={12.01} y2={16} />
    </Svg>
  )
}

// ── Componentes auxiliares ─────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
    </View>
  )
}

function Field({
  label, value, onChangeText, placeholder, keyboardType,
}: {
  label:         string
  value:         string
  onChangeText:  (t: string) => void
  placeholder?:  string
  keyboardType?: 'default' | 'email-address' | 'phone-pad'
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inkXLight}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  )
}

function SettingRow({
  icon, label, subtitle, onPress, danger,
}: {
  icon:      React.ReactNode
  label:     string
  subtitle?: string
  onPress?:  () => void
  danger?:   boolean
}) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>{icon}</View>
      <View style={styles.settingBody}>
        <Text style={[styles.settingLabel, danger && { color: theme.colors.danger }]}>
          {label}
        </Text>
        {subtitle && (
          <Text style={styles.settingSub} numberOfLines={3}>{subtitle}</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ══════════════════════════════════════════════════════
//  TELA PRINCIPAL
// ══════════════════════════════════════════════════════
export default function SettingsScreen() {
  const [office,    setOffice]    = useState<OfficeInfo>({ name: '', email: '', phone: '', address: '' })
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [cacheSize, setCacheSize] = useState<string>('Calculando...')

  useEffect(() => {
    getOfficeInfo().then(setOffice)
    loadCacheSize()
  }, [])

  const loadCacheSize = async () => {
    try {
        const dir = FileSystem.cacheDirectory
        if (!dir) { setCacheSize('0 MB'); return }
        const info = await FileSystem.getInfoAsync(dir)
        if (info.exists && 'size' in info && info.size) {
        const mb = (info.size / 1024 / 1024).toFixed(1)
        setCacheSize(`${mb} MB`)
        } else {
        setCacheSize('0 MB')
        }
    } catch {
        setCacheSize('—')
      }
    }

  const handleSave = async () => {
    if (!office.name.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome do escritório.')
      return
    }
    setSaving(true)
    try {
      await saveOfficeInfo(office)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as configurações.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    Alert.alert(
      'Restaurar padrão',
      'As informações voltarão para os dados originais da APduo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            await resetOfficeInfo()
            const defaults = await getOfficeInfo()
            setOffice(defaults)
          },
        },
      ]
    )
  }

    const handleClearCache = () => {
    Alert.alert(
        'Limpar cache',
        'Apagará imagens temporárias. Projetos e produtos não serão afetados.',
        [
        { text: 'Cancelar', style: 'cancel' },
        {
            text: 'Limpar',
            style: 'destructive',
            onPress: async () => {
            try {
                const dir = FileSystem.cacheDirectory
                if (!dir) return
                const files = await FileSystem.readDirectoryAsync(dir)
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
                const toDelete = files.filter(f => {
                const lower = f.toLowerCase()
                return imageExtensions.some(ext => lower.endsWith(ext)) || f.startsWith('pdf_thumb_')
                })
                await Promise.all(
                toDelete.map(f => FileSystem.deleteAsync(dir + f, { idempotent: true }))
                )
                await loadCacheSize()
                Alert.alert('Cache limpo', 'Imagens temporárias removidas.')
            } catch {
                Alert.alert('Erro', 'Não foi possível limpar o cache.')
            }
            },
        },
        ]
    )
    }

    const handleShowPdfDir = () => {
    const dir = FileSystem.documentDirectory ?? 'Pasta padrão do sistema'
    Alert.alert('Localização dos PDFs', `Os PDFs são salvos em:\n\n${dir}`)
    }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Configurações</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Escritório ── */}
        <SectionHeader
          title="Escritório"
          subtitle="Aparece no rodapé de todos os PDFs gerados."
        />
        <View style={styles.card}>
          <Field
            label="Nome"
            value={office.name}
            onChangeText={v => setOffice(p => ({ ...p, name: v }))}
            placeholder="APduo Arquitetura"
          />
          <View style={styles.fieldDivider} />
          <Field
            label="E-mail"
            value={office.email}
            onChangeText={v => setOffice(p => ({ ...p, email: v }))}
            placeholder="contato@apduo.com.br"
            keyboardType="email-address"
          />
          <View style={styles.fieldDivider} />
          <Field
            label="Telefone"
            value={office.phone}
            onChangeText={v => setOffice(p => ({ ...p, phone: v }))}
            placeholder="+55 (21) 96730-0615"
            keyboardType="phone-pad"
          />
          <View style={styles.fieldDivider} />
          <Field
            label="Endereço"
            value={office.address}
            onChangeText={v => setOffice(p => ({ ...p, address: v }))}
            placeholder="Rua Jurupari, 31 - Tijuca - RJ"
          />
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.btnReset} onPress={handleReset}>
              <Text style={styles.btnResetText}>Restaurar padrão</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSave, saved && styles.btnSaved]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.white} size="small" />
              ) : saved ? (
                <>
                  <IconCheck />
                  <Text style={styles.btnSaveText}>Salvo!</Text>
                </>
              ) : (
                <Text style={styles.btnSaveText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── PDFs ── */}
        <SectionHeader
          title="PDFs"
          subtitle="Onde os documentos gerados são armazenados."
        />
        <View style={styles.card}>
          <SettingRow
            icon={<IconFolder />}
            label="Pasta de destino"
            subtitle={FileSystem.documentDirectory ?? 'Pasta padrão do sistema'}
            onPress={handleShowPdfDir}
          />
        </View>

        {/* ── Armazenamento ── */}
        <SectionHeader
          title="Armazenamento"
          subtitle="Cache de imagens e arquivos temporários."
        />
        <View style={styles.card}>
          <SettingRow
            icon={<IconTrash />}
            label="Limpar cache de imagens"
            subtitle={`${cacheSize} em uso`}
            onPress={handleClearCache}
            danger
          />
        </View>

        {/* ── Sobre ── */}
        <SectionHeader title="Sobre" />
        <View style={styles.card}>
          <SettingRow
            icon={<IconInfo />}
            label="Versão do app"
            subtitle={`APduo v${APP_VERSION}`}
          />
          <View style={styles.rowDivider} />
          <SettingRow
            icon={<IconBuilding />}
            label="Desenvolvido para"
            subtitle="APduo Arquitetura — Rio de Janeiro"
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
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

  scroll:        { flex: 1 },
  scrollContent: { padding: theme.spacing.lg, gap: 8 },

  sectionHeader: { marginTop: 16, marginBottom: 8, paddingHorizontal: 4 },
  sectionTitle: {
    fontFamily:    theme.font.sansMedium,
    fontSize:      11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color:         theme.colors.inkMid,
  },
  sectionSub: {
    fontFamily: theme.font.sans,
    fontSize:   12,
    color:      theme.colors.inkLight,
    marginTop:  3,
    lineHeight: 17,
  },

  card: {
    backgroundColor: theme.colors.white,
    borderRadius:    theme.radius.md,
    borderWidth:     1,
    borderColor:     theme.colors.border,
    overflow:        'hidden',
  },

  field:      { padding: theme.spacing.md },
  fieldLabel: {
    fontFamily:    theme.font.sansMedium,
    fontSize:      10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color:         theme.colors.inkMid,
    marginBottom:  6,
  },
  input: {
    fontFamily:        theme.font.sans,
    fontSize:          14,
    color:             theme.colors.ink,
    backgroundColor:   theme.colors.bgPanel,
    borderWidth:       1,
    borderColor:       theme.colors.border,
    borderRadius:      theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical:   10,
  },
  fieldDivider: {
    height:           1,
    backgroundColor:  theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },

  cardActions: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         theme.spacing.md,
    paddingTop:      8,
    gap:             10,
    borderTopWidth:  1,
    borderTopColor:  theme.colors.border,
    marginTop:       4,
  },
  btnReset: { paddingVertical: 10, paddingHorizontal: 4 },
  btnResetText: {
    fontFamily:         theme.font.sans,
    fontSize:           13,
    color:              theme.colors.inkLight,
    textDecorationLine: 'underline',
  },
  btnSave: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    backgroundColor:   theme.colors.ink,
    paddingHorizontal: 24,
    paddingVertical:   12,
    borderRadius:      theme.radius.sm,
  },
  btnSaved:    { backgroundColor: theme.colors.success },
  btnSaveText: {
    fontFamily: theme.font.sansMedium,
    fontSize:   13,
    color:      theme.colors.white,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       theme.spacing.md,
    gap:           14,
    minHeight:     56,
  },
  settingIcon: {
    width:           36,
    height:          36,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: theme.colors.bgPanel,
    borderRadius:    theme.radius.sm,
  },
  settingBody:  { flex: 1, gap: 2 },
  settingLabel: {
    fontFamily: theme.font.sansMedium,
    fontSize:   14,
    color:      theme.colors.ink,
  },
  settingSub: {
    fontFamily: theme.font.sans,
    fontSize:   11,
    color:      theme.colors.inkLight,
    lineHeight: 16,
  },
  rowDivider: {
    height:           1,
    backgroundColor:  theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
})