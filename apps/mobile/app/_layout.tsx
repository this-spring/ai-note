import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSettingsStore } from '@/stores/settings-store'

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme)
  const loadConfig = useSettingsStore((s) => s.loadConfig)

  useEffect(() => {
    loadConfig()
  }, [])

  const paperTheme = theme === 'dark' ? MD3DarkTheme : MD3LightTheme

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(main)" />
          <Stack.Screen
            name="editor/[path]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
        </Stack>
      </PaperProvider>
    </GestureHandlerRootView>
  )
}
