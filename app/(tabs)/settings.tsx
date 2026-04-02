// app/(tabs)/settings.tsx
import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { theme } from '@/constants/theme'
import { getOfficeInfo, saveOfficeInfo, resetOfficeInfo, OfficeInfo } from '@/services/settings'
import { invalidateCache } from '@/services/db/fileStore'
import { showAlert, showConfirm } from '@/components/Dialog'
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

function IconExternal({ color = theme.colors.inkLight }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2}>
      <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <Polyline points="15 3 21 3 21 9" />
      <Line x1={10} y1={14} x2={21} y2={3} />
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
  icon, label, subtitle, onPress, danger, accessory,
}: {
  icon:       React.ReactNode
  label:      string
  subtitle?:  string
  onPress?:   () => void
  danger?:    boolean
  accessory?: React.ReactNode
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
      {accessory}
    </TouchableOpacity>
  )
}

// ══════════════════════════════════════════════════════
//  TELA PRINCIPAL
// ══════════════════════════════════════════════════════
export default function SettingsScreen() {
  const [office,       setOffice]       = useState<OfficeInfo>({ name: '', email: '', phone: '', address: '' })
  const [saving,       setSaving]       = useState(false)
  const [saved,        setSaved]        = useState(false)
  const [cacheSize,    setCacheSize]    = useState<string>('Calculando...')
  const [dataPath,       setDataPath]       = useState<string>('')
  const [changingPath,   setChangingPath]   = useState(false)
  const [pdfPath,        setPdfPath]        = useState<string>('')
  const [changingPdfPath, setChangingPdfPath] = useState(false)

  useEffect(() => {
    getOfficeInfo().then(setOffice)
    loadCacheSize()
    loadDataPath()
    loadPdfPath()
  }, [])

  const loadDataPath = async () => {
    if (Platform.OS === 'web') {
      const p = await (window as any).electron?.getDataPath?.()
      setDataPath(p ?? '')
    }
  }

  const loadPdfPath = async () => {
    if (Platform.OS === 'web') {
      const p = await (window as any).electron?.getPdfPath?.()
      setPdfPath(p ?? '')
    }
  }

  const handleChangePdfFolder = async () => {
    if (changingPdfPath) return
    const newFolder: string | null = await (window as any).electron?.pickPdfFolder?.()
    if (!newFolder) return
    const ok = await showConfirm(
      `Alterar pasta de PDFs para:\n\n${newFolder}`,
      'Alterar pasta de PDFs',
      { confirmText: 'Alterar' },
    )
    if (!ok) return
    setChangingPdfPath(true)
    try {
      await (window as any).electron?.setPdfPath?.(newFolder)
      setPdfPath(newFolder)
    } catch {
      await showAlert('Não foi possível alterar a pasta de PDFs.', 'Erro')
    } finally {
      setChangingPdfPath(false)
    }
  }

  const handleResetPdfPath = async () => {
    const ok = await showConfirm(
      'Os PDFs passarão a ser salvos em Documentos.',
      'Restaurar pasta padrão de PDFs',
      { confirmText: 'Restaurar' },
    )
    if (!ok) return
    await (window as any).electron?.setPdfPath?.(null)
    const p = await (window as any).electron?.getPdfPath?.()
    setPdfPath(p ?? '')
  }

  const handleOpenPdfFolder = async () => {
    const p = await (window as any).electron?.getPdfPath?.()
    if (p) await (window as any).electron?.openFile?.(p)   // openFile com pasta abre o Explorer
  }

  const loadCacheSize = async () => {
    if (Platform.OS === 'web') { setCacheSize('—'); return }
    try {
      const dir = FileSystem.cacheDirectory
      if (!dir) { setCacheSize('0 MB'); return }
      const info = await FileSystem.getInfoAsync(dir)
      if (info.exists && 'size' in info && info.size) {
        setCacheSize(`${(info.size / 1024 / 1024).toFixed(1)} MB`)
      } else {
        setCacheSize('0 MB')
      }
    } catch {
      setCacheSize('—')
    }
  }

  const handleSave = async () => {
    if (!office.name.trim()) {
      await showAlert('Informe o nome do escritório.', 'Campo obrigatório')
      return
    }
    setSaving(true)
    try {
      await saveOfficeInfo(office)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      await showAlert('Não foi possível salvar as configurações.', 'Erro')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    const ok = await showConfirm(
      'As informações voltarão para os dados originais da APduo.',
      'Restaurar padrão',
      { confirmText: 'Restaurar', danger: true },
    )
    if (!ok) return
    await resetOfficeInfo()
    setOffice(await getOfficeInfo())
  }

  const handleClearCache = async () => {
    const ok = await showConfirm(
      'Apagará imagens temporárias. Projetos e produtos não serão afetados.',
      'Limpar cache',
      { confirmText: 'Limpar', danger: true },
    )
    if (!ok) return
    if (Platform.OS === 'web') {
      try {
        await (window as any).electron?.clearCache?.()
        setCacheSize('0 MB')
        await showAlert('Imagens temporárias removidas.', 'Cache limpo')
      } catch {
        await showAlert('Não foi possível limpar o cache.', 'Erro')
      }
    } else {
      try {
        const dir = FileSystem.cacheDirectory
        if (!dir) return
        const files = await FileSystem.readDirectoryAsync(dir)
        const exts = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
        await Promise.all(
          files
            .filter(f => exts.some(e => f.toLowerCase().endsWith(e)) || f.startsWith('pdf_thumb_'))
            .map(f => FileSystem.deleteAsync(dir + f, { idempotent: true }))
        )
        await loadCacheSize()
        await showAlert('Imagens temporárias removidas.', 'Cache limpo')
      } catch {
        await showAlert('Não foi possível limpar o cache.', 'Erro')
      }
    }
  }

  const handleOpenDataFolder = async () => {
    await (window as any).electron?.openDataFolder?.()
  }

  const handleChangeDataFolder = async () => {
    if (changingPath) return
    const newFolder: string | null = await (window as any).electron?.pickDataFolder?.()
    if (!newFolder) return

    const ok = await showConfirm(
      `Alterar pasta de dados para:\n\n${newFolder}\n\nOs dados existentes serão copiados para a nova pasta. O aplicativo será recarregado.`,
      'Alterar pasta de dados',
      { confirmText: 'Alterar' },
    )
    if (!ok) return

    setChangingPath(true)
    try {
      await (window as any).electron?.setDataPath?.(newFolder)
      invalidateCache()
      await showAlert('Pasta alterada com sucesso. O aplicativo será recarregado.')
      window.location.reload()
    } catch {
      await showAlert('Não foi possível alterar a pasta de dados.', 'Erro')
    } finally {
      setChangingPath(false)
    }
  }

  const handleResetDataPath = async () => {
    const ok = await showConfirm(
      'Os dados da pasta atual serão copiados para a pasta padrão. O aplicativo será recarregado.',
      'Restaurar pasta de dados padrão',
      { confirmText: 'Restaurar' },
    )
    if (!ok) return
    await (window as any).electron?.setDataPath?.(null)
    invalidateCache()
    await showAlert('Pasta restaurada para o padrão. O aplicativo será recarregado.')
    window.location.reload()
  }

  const isElectron = Platform.OS === 'web' && typeof (window as any).electron !== 'undefined'

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
        {isElectron && (
          <>
            <SectionHeader
              title="PDFs"
              subtitle="Pasta onde os documentos gerados são salvos permanentemente."
            />
            <View style={styles.card}>
              <View style={styles.dataPathRow}>
                <View style={styles.settingIcon}><IconFolder /></View>
                <View style={styles.settingBody}>
                  <Text style={styles.settingLabel}>Pasta de destino</Text>
                  <Text style={styles.dataPathText} numberOfLines={2} selectable>
                    {pdfPath || '—'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.btnOpenFolder}
                  onPress={handleOpenPdfFolder}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconExternal color={theme.colors.inkMid} />
                </TouchableOpacity>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.dataActions}>
                <TouchableOpacity
                  style={styles.btnDataAction}
                  onPress={handleChangePdfFolder}
                  disabled={changingPdfPath}
                >
                  {changingPdfPath
                    ? <ActivityIndicator size="small" color={theme.colors.white} />
                    : <Text style={styles.btnDataActionText}>Alterar pasta…</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnDataAction, styles.btnDataActionSecondary]}
                  onPress={handleResetPdfPath}
                >
                  <Text style={styles.btnDataActionSecondaryText}>Restaurar padrão</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* ── Dados ── */}
        {isElectron && (
          <>
            <SectionHeader
              title="Dados"
              subtitle="Arquivo com todos os projetos e produtos."
            />
            <View style={styles.card}>
              {/* Caminho atual */}
              <View style={styles.dataPathRow}>
                <View style={styles.settingIcon}><IconFolder /></View>
                <View style={styles.settingBody}>
                  <Text style={styles.settingLabel}>Pasta atual</Text>
                  <Text style={styles.dataPathText} numberOfLines={2} selectable>
                    {dataPath || '—'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.btnOpenFolder}
                  onPress={handleOpenDataFolder}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconExternal color={theme.colors.inkMid} />
                </TouchableOpacity>
              </View>

              <View style={styles.rowDivider} />

              {/* Ações */}
              <View style={styles.dataActions}>
                <TouchableOpacity
                  style={styles.btnDataAction}
                  onPress={handleChangeDataFolder}
                  disabled={changingPath}
                >
                  {changingPath
                    ? <ActivityIndicator size="small" color={theme.colors.ink} />
                    : <Text style={styles.btnDataActionText}>Alterar pasta…</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnDataAction, styles.btnDataActionSecondary]}
                  onPress={handleResetDataPath}
                >
                  <Text style={styles.btnDataActionSecondaryText}>Restaurar padrão</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

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

  // Seção Dados
  dataPathRow: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       theme.spacing.md,
    gap:           14,
    minHeight:     64,
  },
  dataPathText: {
    fontFamily: theme.font.sans,
    fontSize:   11,
    color:      theme.colors.inkMid,
    lineHeight: 16,
    marginTop:  2,
  },
  btnOpenFolder: {
    width:           32,
    height:          32,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: theme.colors.bgPanel,
    borderRadius:    theme.radius.sm,
    borderWidth:     1,
    borderColor:     theme.colors.border,
  },
  dataActions: {
    flexDirection:     'row',
    gap:               10,
    padding:           theme.spacing.md,
    paddingTop:        12,
  },
  btnDataAction: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingVertical:   11,
    backgroundColor:   theme.colors.ink,
    borderRadius:      theme.radius.sm,
    minHeight:         42,
  },
  btnDataActionText: {
    fontFamily: theme.font.sansMedium,
    fontSize:   13,
    color:      theme.colors.white,
  },
  btnDataActionSecondary: {
    backgroundColor: theme.colors.bgPanel,
    borderWidth:     1,
    borderColor:     theme.colors.border,
  },
  btnDataActionSecondaryText: {
    fontFamily: theme.font.sansMedium,
    fontSize:   13,
    color:      theme.colors.inkMid,
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