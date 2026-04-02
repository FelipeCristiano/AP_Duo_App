// components/Dialog.tsx
// Diálogo estilizado com o visual do app.
// Uso imperativo:  await showAlert('Mensagem', 'Título')
//                  const ok = await showConfirm('Tem certeza?', 'Excluir', { danger: true })

import { useEffect, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { theme } from '@/constants/theme'

// ── Tipos ────────────────────────────────────────────────
interface DialogConfig {
  visible:      boolean
  type:         'alert' | 'confirm'
  title?:       string
  message:      string
  confirmText?: string
  cancelText?:  string
  danger?:      boolean
}

interface ConfirmOpts {
  confirmText?: string
  cancelText?:  string
  danger?:      boolean
}

// ── Singletons internos ─────────────────────────────────
let _setConfig: ((c: DialogConfig) => void) | null = null
let _resolver:  ((v: boolean) => void)      | null = null

const EMPTY: DialogConfig = { visible: false, type: 'alert', message: '' }

// ── API pública ─────────────────────────────────────────
export function showAlert(message: string, title?: string): Promise<void> {
  return new Promise(resolve => {
    if (!_setConfig) { window.alert(title ? `${title}\n\n${message}` : message); resolve(); return }
    _resolver = () => resolve()
    _setConfig({ visible: true, type: 'alert', message, title, confirmText: 'OK' })
  })
}

export function showConfirm(
  message:  string,
  title?:   string,
  opts?:    ConfirmOpts,
): Promise<boolean> {
  return new Promise(resolve => {
    if (!_setConfig) { resolve(window.confirm(title ? `${title}\n\n${message}` : message)); return }
    _resolver = resolve
    _setConfig({
      visible:     true,
      type:        'confirm',
      message,
      title,
      confirmText: opts?.confirmText ?? 'Confirmar',
      cancelText:  opts?.cancelText  ?? 'Cancelar',
      danger:      opts?.danger,
    })
  })
}

// ── Provider (adicionar no _layout.tsx) ─────────────────
export function DialogProvider() {
  const [config, setConfig] = useState<DialogConfig>(EMPTY)

  useEffect(() => {
    _setConfig = setConfig
    return () => { _setConfig = null }
  }, [])

  function handleConfirm() {
    setConfig(EMPTY)
    const r = _resolver; _resolver = null; r?.(true)
  }

  function handleCancel() {
    setConfig(EMPTY)
    const r = _resolver; _resolver = null; r?.(false)
  }

  if (!config.visible) return null

  return (
    <Modal
      transparent
      animationType="fade"
      visible={config.visible}
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {config.title && (
            <Text style={styles.title}>{config.title}</Text>
          )}
          <Text style={[styles.message, !config.title && styles.messageNoTitle]}>
            {config.message}
          </Text>

          <View style={[styles.buttons, config.type === 'alert' && styles.buttonsSingle]}>
            {config.type === 'confirm' && (
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={handleCancel}
                activeOpacity={0.75}
              >
                <Text style={styles.btnCancelText}>{config.cancelText ?? 'Cancelar'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btnConfirm,
                config.danger && styles.btnDanger,
                config.type === 'alert' && styles.btnAlertFull,
              ]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.btnConfirmText}>{config.confirmText ?? 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Estilos ─────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    backgroundColor: 'rgba(15,12,9,0.45)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         24,
  },

  card: {
    width:           '100%',
    maxWidth:        420,
    backgroundColor: theme.colors.white,
    borderRadius:    16,
    borderWidth:     1,
    borderColor:     theme.colors.border,
    padding:         28,
    // Sombra
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
      default: { elevation: 8 },
    }),
  },

  title: {
    fontFamily:   theme.font.serif,
    fontSize:     22,
    color:        theme.colors.ink,
    marginBottom: 10,
    lineHeight:   28,
  },

  message: {
    fontFamily: theme.font.sans,
    fontSize:   14,
    color:      theme.colors.inkMid,
    lineHeight: 22,
  },
  messageNoTitle: {
    fontSize: 15,
    color:    theme.colors.ink,
  },

  buttons: {
    flexDirection: 'row',
    gap:           10,
    marginTop:     24,
  },
  buttonsSingle: {
    justifyContent: 'flex-end',
  },

  btnCancel: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingVertical:   13,
    paddingHorizontal: 20,
    borderRadius:      theme.radius.sm,
    borderWidth:       1,
    borderColor:       theme.colors.border,
    backgroundColor:   theme.colors.bgPanel,
  },
  btnCancelText: {
    fontFamily: theme.font.sansMedium,
    fontSize:   14,
    color:      theme.colors.inkMid,
  },

  btnConfirm: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingVertical:   13,
    paddingHorizontal: 20,
    borderRadius:      theme.radius.sm,
    backgroundColor:   theme.colors.ink,
  },
  btnDanger: {
    backgroundColor: theme.colors.danger,
  },
  btnAlertFull: {
    flex: 0,
    paddingHorizontal: 32,
  },
  btnConfirmText: {
    fontFamily: theme.font.sansMedium,
    fontSize:   14,
    color:      theme.colors.white,
  },
})