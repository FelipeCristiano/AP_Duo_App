// services/settings.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface OfficeInfo {
  name:    string
  email:   string
  phone:   string
  address: string
}

const KEYS = {
  office:  '@apduo:office',
  pdfDir:  '@apduo:pdfDir',
}

const DEFAULTS: OfficeInfo = {
  name:    'APduo Arquitetura',
  email:   'contato@apduo.com.br',
  phone:   '+55 (21) 96730-0615',
  address: 'Rua Jurupari, 31 - Tijuca - Rio de Janeiro/RJ',
}

export async function getOfficeInfo(): Promise<OfficeInfo> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.office)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export async function saveOfficeInfo(info: OfficeInfo): Promise<void> {
  await AsyncStorage.setItem(KEYS.office, JSON.stringify(info))
}

export async function resetOfficeInfo(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.office)
}