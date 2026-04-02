import { Tabs } from 'expo-router'
import { theme } from '@/constants/theme'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import Svg, { Path, Circle, Line } from 'react-native-svg'

// ── Ícones ─────────────────────────────────────────────
function IconProjects({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <Path d="M9 21V12h6v9" />
    </Svg>
  )
}
function IconNew({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx={12} cy={12} r={9} />
      <Line x1={12} y1={8} x2={12} y2={16} />
      <Line x1={8} y1={12} x2={16} y2={12} />
    </Svg>
  )
}
function IconSearch({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx={11} cy={11} r={8} />
      <Line x1={21} y1={21} x2={16.65} y2={16.65} />
    </Svg>
  )
}
function IconSettings({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
    </Svg>
  )
}

const ICONS: Record<string, (color: string) => React.ReactNode> = {
  index:       (c) => <IconProjects color={c} />,
  'new-project': (c) => <IconNew color={c} />,
  search:      (c) => <IconSearch color={c} />,
  settings:    (c) => <IconSettings color={c} />,
}

// ── Tab Bar customizada ────────────────────────────────
function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key]
        const focused    = state.index === index
        const color      = focused ? theme.colors.ink : theme.colors.inkLight

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name)
          }
        }

        return (
          <View key={route.key} style={styles.tabWrapper}>
            {/* Separador vertical entre abas */}
            {index > 0 && <View style={styles.separator} />}

            <TouchableOpacity
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.75}
            >
              {/* Indicador superior da aba ativa */}
              <View style={[styles.activeBar, focused && styles.activeBarVisible]} />

              <View style={styles.tabContent}>
                {ICONS[route.name]?.(color)}
                <Text style={[styles.tabLabel, { color }]}>
                  {options.title}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )
      })}
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"       options={{ title: 'Projetos'      }} />
      <Tabs.Screen name="new-project" options={{ title: 'Novo Projeto'  }} />
      <Tabs.Screen name="search"      options={{ title: 'Buscar'        }} />
      <Tabs.Screen name="settings"    options={{ title: 'Configurações' }} />
    </Tabs>
  )
}

// ── Estilos ────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    flexDirection:   'row',
    backgroundColor: theme.colors.white,
    borderTopWidth:  1,
    borderTopColor:  theme.colors.border,
    height:          66,
  },

  tabWrapper: {
    flex:          1,
    flexDirection: 'row',
  },

  separator: {
    width:           1,
    marginVertical:  10,
    backgroundColor: theme.colors.border,
  },

  tabItem: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'flex-start',
    paddingTop:     0,
  },

  // Linha fina no topo da aba ativa
  activeBar: {
    width:           32,
    height:          2,
    borderBottomLeftRadius:  2,
    borderBottomRightRadius: 2,
    backgroundColor: 'transparent',
    marginBottom:    8,
  },
  activeBarVisible: {
    backgroundColor: theme.colors.ink,
  },

  tabContent: {
    alignItems:     'center',
    justifyContent: 'center',
    gap:            4,
  },

  tabLabel: {
    fontFamily:    'DMSans_400Regular',
    fontSize:      10.5,
    letterSpacing: 0.2,
  },
})
