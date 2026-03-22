import { Tabs } from 'expo-router'
import { theme } from '@/constants/theme'
import { View, StyleSheet } from 'react-native'
import Svg, { Path, Circle, Line, Rect, Polyline } from 'react-native-svg'

// ── Ícones inline (sem dependência extra) ──────────────
function IconProjects({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <Path d="M9 21V12h6v9" />
    </Svg>
  )
}

function IconNew({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx={12} cy={12} r={9} />
      <Line x1={12} y1={8} x2={12} y2={16} />
      <Line x1={8} y1={12} x2={16} y2={12} />
    </Svg>
  )
}

function IconSettings({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
    </Svg>
  )
}

function IconSearch({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx={11} cy={11} r={8} />
      <Line x1={21} y1={21} x2={16.65} y2={16.65} />
    </Svg>
  )
}

// ── Tab Bar customizada ────────────────────────────────
function TabBarIcon({ children, focused }: { children: React.ReactNode; focused: boolean }) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      {children}
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor:   theme.colors.ink,
        tabBarInactiveTintColor: theme.colors.inkLight,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle:  styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Projetos',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon focused={focused}>
              <IconProjects color={color} />
            </TabBarIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="new-project"
        options={{
          title: 'Novo',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon focused={focused}>
              <IconNew color={color} />
            </TabBarIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon focused={focused}>
              <IconSearch color={color} />
            </TabBarIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Config.',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon focused={focused}>
              <IconSettings color={color} />
            </TabBarIcon>
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor:  theme.colors.white,
    borderTopColor:   theme.colors.border,
    borderTopWidth:   1,
    height:           64,
    paddingBottom:    10,
    paddingTop:       8,
    elevation:        0,
    shadowOpacity:    0,
  },
  tabItem: {
    paddingTop: 4,
  },
  tabLabel: {
    fontFamily: 'DMSans_400Regular',
    fontSize:   10.5,
    marginTop:  2,
  },
  iconWrapper: {
    width:          38,
    height:         32,
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   10,
  },
  iconWrapperActive: {
    backgroundColor: theme.colors.bgPanel,
  },
})