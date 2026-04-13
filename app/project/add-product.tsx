import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { theme } from '@/constants/theme'
import {
  createProduct, updateProduct, getProductById,
  ProductVariation, stringifyVariations, parseVariations,
} from '@/services/db/products'
import { scrapeProduct, isValidUrl, ScrapedProduct } from '@/services/scraper'
import { showAlert } from '@/components/Dialog'
import Svg, { Path, Line, Circle, Polyline } from 'react-native-svg'

// ── Ícones ─────────────────────────────────────────────
function IconBack() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={theme.colors.ink} strokeWidth={2}>
      <Path d="M19 12H5M12 5l-7 7 7 7" />
    </Svg>
  )
}
function IconSearch({ color = theme.colors.inkLight }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2}>
      <Circle cx={11} cy={11} r={8} />
      <Line x1={21} y1={21} x2={16.65} y2={16.65} />
    </Svg>
  )
}
function IconPlus({ color = theme.colors.white, size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2}>
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Line x1={5} y1={12} x2={19} y2={12} />
    </Svg>
  )
}
function IconX({ color = theme.colors.inkLight, size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.5}>
      <Line x1={18} y1={6} x2={6} y2={18} />
      <Line x1={6} y1={6} x2={18} y2={18} />
    </Svg>
  )
}
function IconCamera({ color = theme.colors.inkLight }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.6}>
      <Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <Circle cx={12} cy={13} r={4} />
    </Svg>
  )
}
function IconCheck({ color = theme.colors.white, size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.5}>
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  )
}

// ── Campo de formulário ────────────────────────────────
function Field({ label, required, hint, children }: {
  label:    string
  required?: boolean
  hint?:    string
  children: React.ReactNode
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>
          {label}
          {required && <Text style={styles.fieldRequired}> *</Text>}
        </Text>
        {hint && <Text style={styles.fieldHint}>{hint}</Text>}
      </View>
      {children}
    </View>
  )
}

// ══════════════════════════════════════════════════════
//  TELA PRINCIPAL
// ══════════════════════════════════════════════════════
export default function AddProductScreen() {
  const { categoryId, productId } =
    useLocalSearchParams<{
      categoryId: string
      productId?: string
    }>()

  const isEditing = !!productId

  // ── Estados do formulário ──────────────────────────
  const [link,        setLink]        = useState('')
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [imageUri,    setImageUri]    = useState<string | null>(null)
  const [price,       setPrice]       = useState('')
  const [quantity,    setQuantity]    = useState('1')
  const [store,       setStore]       = useState('')
  const [variations,  setVariations]  = useState<ProductVariation[]>([])
  const [varLabel,    setVarLabel]    = useState('')
  const [varValue,    setVarValue]    = useState('')

  // ── Estados de controle ────────────────────────────
  const [scraping, setScraping] = useState(false)
  const [scraped,  setScraped]  = useState(false)
  const [saving,   setSaving]   = useState(false)

  // ── Carregar produto existente (edição) ────────────
  useEffect(() => {
    if (!isEditing) return
    getProductById(Number(productId)).then(p => {
      if (!p) return
      setLink(p.link ?? '')
      setName(p.name)
      setDescription(p.description ?? '')
      setImageUri(p.image_uri ?? null)
      setPrice(p.price > 0 ? p.price.toFixed(2).replace('.', ',') : '')
      setQuantity(String(p.quantity ?? 1))
      setStore(p.store ?? '')
      setVariations(parseVariations(p.variations))
    })
  }, [isEditing])

  // ── Scraping ───────────────────────────────────────
  const handleScrape = useCallback(async () => {
    if (!isValidUrl(link.trim())) {
      await showAlert('Cole um link válido começando com http:// ou https://', 'URL inválida')
      return
    }

    setScraping(true)
    setScraped(false)

    try {
      const result: ScrapedProduct | null = await scrapeProduct(link.trim())

      if (!result) {
        await showAlert(
          'O site pode ter bloqueado a busca automática. Preencha os campos manualmente.',
          'Não foi possível extrair',
        )
        return
      }

      setName(result.name ?? '')
      setStore(result.store ?? '')
      setImageUri(result.image_uri ?? null)
      setDescription(result.description ?? '')
      if (result.price > 0) {
        setPrice(result.price.toFixed(2).replace('.', ','))
      }
      setScraped(true)
    } catch (e) {
      await showAlert('Não foi possível acessar o link. Verifique sua conexão.', 'Erro')
    } finally {
      setScraping(false)
    }
  }, [link])

  // ── Imagem manual ──────────────────────────────────
  const pickImage = useCallback(async () => {
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
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
    }
  }, [])

  // ── Variações ──────────────────────────────────────
  const addVariation = () => {
    const label = varLabel.trim()
    const value = varValue.trim()
    if (!label || !value) return
    setVariations(prev => [...prev, { label, value }])
    setVarLabel('')
    setVarValue('')
  }

  const removeVariation = (index: number) => {
    setVariations(prev => prev.filter((_, i) => i !== index))
  }

  // ── Salvar ─────────────────────────────────────────
  const parsePrice = (val: string): number => {
    const cleaned = val.replace(/[^\d,]/g, '').replace(',', '.')
    return parseFloat(cleaned) || 0
  }

  const handleSave = async () => {
    if (!name.trim()) {
      await showAlert('Informe o nome do produto.', 'Nome obrigatório')
      return
    }

    setSaving(true)
    try {
      const data = {
        category_id: Number(categoryId),
        name:        name.trim(),
        description: description.trim() || null,
        variations:  variations.length > 0
          ? stringifyVariations(variations)
          : null,

        image_uri: imageUri,
        link:      link.trim() || null,
        price:     parsePrice(price),
        quantity:  parseInt(quantity) || 1,
        store:     store.trim() || null,
      }

      if (isEditing) {
        await updateProduct(Number(productId), data)
      } else {
        await createProduct(data)
      }

      router.back()
    } catch (e) {
      await showAlert('Não foi possível salvar o produto.', 'Erro')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const canSave = name.trim().length > 0

  // ── Render ─────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconBack />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </Text>
          <Text style={styles.headerSub}>APduo</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Seção 1: Link + Scraping ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Importar pelo link</Text>
          <Text style={styles.sectionDesc}>
            Cole o link do produto e o APduo preencherá os campos automaticamente.
          </Text>

          <View style={styles.linkRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="https://tokstok.com.br/produto..."
              placeholderTextColor={theme.colors.inkXLight}
              value={link}
              onChangeText={text => {
                setLink(text)
                setScraped(false)
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleScrape}
            />
            <TouchableOpacity
              style={[styles.scrapeBtn, scraping && styles.scrapeBtnLoading]}
              onPress={handleScrape}
              disabled={scraping}
            >
              {scraping
                ? <ActivityIndicator color={theme.colors.white} size="small" />
                : <IconSearch color={theme.colors.white} />
              }
            </TouchableOpacity>
          </View>

          {scraped && (
            <View style={styles.scrapedBadge}>
              <IconCheck color={theme.colors.success} size={13} />
              <Text style={styles.scrapedBadgeText}>
                Dados importados com sucesso — revise e ajuste abaixo
              </Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* ── Seção 2: Dados do produto ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do produto</Text>

          <Field label="Imagem">
            <TouchableOpacity
              style={styles.imageArea}
              onPress={pickImage}
              activeOpacity={0.8}
            >
              {imageUri ? (
                <>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <IconCamera color={theme.colors.white} />
                    <Text style={styles.imageOverlayText}>Trocar imagem</Text>
                  </View>
                </>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <IconCamera />
                  <Text style={styles.imagePlaceholderText}>
                    Toque para adicionar imagem
                  </Text>
                  <Text style={styles.imagePlaceholderSub}>
                    Ou importe pelo link acima
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Field>

          <Field label="Nome do produto" required>
            <TextInput
              style={styles.input}
              placeholder="Nome do produto"
              placeholderTextColor={theme.colors.inkXLight}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          </Field>

          <Field label="Loja de origem">
            <TextInput
              style={styles.input}
              placeholder="Ex: Tok&Stok, MadeiraMadeira..."
              placeholderTextColor={theme.colors.inkXLight}
              value={store}
              onChangeText={setStore}
              returnKeyType="next"
            />
          </Field>

          <Field label="Descrição">
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Descrição do produto..."
              placeholderTextColor={theme.colors.inkXLight}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Field>

          <View style={styles.rowFields}>
            <View style={{ flex: 1 }}>
              <Field label="Valor unitário (R$)" required>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  placeholderTextColor={theme.colors.inkXLight}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </Field>
            </View>
            <View style={{ width: 100 }}>
              <Field label="Quantidade">
                <TextInput
                  style={styles.input}
                  placeholder="1"
                  placeholderTextColor={theme.colors.inkXLight}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              </Field>
            </View>
          </View>

          {price && quantity && (
            <View style={styles.totalPreview}>
              <Text style={styles.totalPreviewLabel}>Valor total</Text>
              <Text style={styles.totalPreviewValue}>
                {(parsePrice(price) * (parseInt(quantity) || 1))
                  .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* ── Seção 3: Variações ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Variações</Text>
          <Text style={styles.sectionDesc}>
            Cor, tamanho, tipo de madeira, acabamento etc.
          </Text>

          {variations.length > 0 && (
            <View style={styles.variationsList}>
              {variations.map((v, i) => (
                <View key={i} style={styles.variationItem}>
                  <Text style={styles.variationLabel}>{v.label}:</Text>
                  <Text style={styles.variationValue}>{v.value}</Text>
                  <TouchableOpacity
                    onPress={() => removeVariation(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconX />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.varInputRow}>
            <TextInput
              style={[styles.input, styles.varInput]}
              placeholder="Tipo (ex: Cor)"
              placeholderTextColor={theme.colors.inkXLight}
              value={varLabel}
              onChangeText={setVarLabel}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, styles.varInput]}
              placeholder="Valor (ex: Cinza)"
              placeholderTextColor={theme.colors.inkXLight}
              value={varValue}
              onChangeText={setVarValue}
              onSubmitEditing={addVariation}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.varAddBtn} onPress={addVariation}>
              <IconPlus />
            </TouchableOpacity>
          </View>
        </View>


      </ScrollView>

      {/* Botão salvar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnSave, !canSave && styles.btnSaveDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={theme.colors.white} size="small" />
            : (
              <>
                <IconCheck />
                <Text style={styles.btnSaveText}>
                  {isEditing ? 'Salvar alterações' : 'Adicionar produto'}
                </Text>
              </>
            )
          }
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
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 20, color: theme.colors.ink,
  },
  headerSub: {
    fontFamily: 'DMSans_400Regular', fontSize: 11,
    color: theme.colors.inkLight,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  scroll:        { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  section: { padding: theme.spacing.lg },
  sectionTitle: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 22, color: theme.colors.ink, marginBottom: 6,
  },
  sectionDesc: {
    fontFamily: 'DMSans_400Regular', fontSize: 13,
    color: theme.colors.inkLight, marginBottom: 18, lineHeight: 20,
  },

  divider: {
    height: 1, backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
  },

  linkRow:   { flexDirection: 'row', gap: 10, alignItems: 'center' },
  scrapeBtn: {
    width: 48, height: 48,
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  scrapeBtnLoading: { backgroundColor: theme.colors.inkLight },
  scrapedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 12, padding: 12,
    backgroundColor: theme.colors.bgPanel,
    borderRadius: theme.radius.sm,
    borderWidth: 1, borderColor: theme.colors.borderDk,
  },
  scrapedBadgeText: {
    fontFamily: 'DMSans_400Regular', fontSize: 12,
    color: theme.colors.success, flex: 1,
  },

  imageArea: {
    height: 180, borderRadius: theme.radius.md,
    borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: theme.colors.borderDk,
    overflow: 'hidden', backgroundColor: theme.colors.bgCard,
  },
  imagePreview:  { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  imageOverlayText: {
    fontFamily: 'DMSans_500Medium', fontSize: 13, color: theme.colors.white,
  },
  imagePlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  imagePlaceholderText: {
    fontFamily: 'DMSans_500Medium', fontSize: 13, color: theme.colors.inkMid,
  },
  imagePlaceholderSub: {
    fontFamily: 'DMSans_400Regular', fontSize: 11, color: theme.colors.inkXLight,
  },

  field:         { marginBottom: 18 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  fieldLabel: {
    fontFamily: 'DMSans_500Medium', fontSize: 11,
    letterSpacing: 0.8, textTransform: 'uppercase', color: theme.colors.inkMid,
  },
  fieldRequired: { color: theme.colors.danger },
  fieldHint: {
    fontFamily: 'DMSans_400Regular', fontSize: 11, color: theme.colors.inkLight,
  },

  input: {
    backgroundColor: theme.colors.white,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'DMSans_400Regular', fontSize: 14, color: theme.colors.ink,
  },
  inputMultiline: { minHeight: 90, paddingTop: 12 },

  rowFields: { flexDirection: 'row', gap: 12 },

  totalPreview: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.colors.bgPanel,
    borderRadius: theme.radius.sm, padding: 14, marginTop: 4,
  },
  totalPreviewLabel: {
    fontFamily: 'DMSans_500Medium', fontSize: 12,
    color: theme.colors.inkMid, letterSpacing: 0.4,
  },
  totalPreviewValue: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 20, color: theme.colors.ink,
  },

  variationsList: { gap: 8, marginBottom: 14 },
  variationItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.white,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  variationLabel: {
    fontFamily: 'DMSans_500Medium', fontSize: 13, color: theme.colors.inkMid,
  },
  variationValue: {
    flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 13, color: theme.colors.ink,
  },
  varInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  varInput:    { flex: 1 },
  varAddBtn: {
    width: 48, height: 48, backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.sm, alignItems: 'center', justifyContent: 'center',
  },

  footer: {
    padding: theme.spacing.lg, paddingBottom: 32,
    backgroundColor: theme.colors.bg,
    borderTopWidth: 1, borderTopColor: theme.colors.border,
  },
  btnSave: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: theme.colors.ink,
    paddingVertical: 16, borderRadius: theme.radius.sm,
  },
  btnSaveDisabled: { backgroundColor: theme.colors.inkXLight },
  btnSaveText: {
    fontFamily: 'DMSans_500Medium', fontSize: 15, color: theme.colors.white,
  },
})