import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import {
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_300Light_Italic,
  CormorantGaramond_400Regular_Italic,
} from '@expo-google-fonts/cormorant-garamond'
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans'
import * as SplashScreen from 'expo-splash-screen'
import { initDatabase } from '@/services/db/database'
import { theme } from '@/constants/theme'
import { View, Text, StyleSheet } from 'react-native'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular_Italic,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  })

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase()
      } catch (e) {
        console.error('Erro ao inicializar banco:', e)
      } finally {
        if (fontsLoaded || fontError) {
          await SplashScreen.hideAsync()
        }
      }
    }
    prepare()
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    return null
  }

  if (fontError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erro ao carregar fontes.</Text>
      </View>
    )
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor={theme.colors.bg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: 'fade',
        }}
      />
    </>
  )
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
  },
  errorText: {
    color: theme.colors.inkMid,
    fontSize: 14,
  },
})