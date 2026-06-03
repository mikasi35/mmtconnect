import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/lib/authStore';
import { usePushNotifications } from '../src/lib/usePushNotifications';

function PushRegistrar() {
  // Only call this hook once auth is resolved — hooks must run unconditionally
  usePushNotifications();
  return null;
}

export default function RootLayout() {
  const hydrate  = useAuthStore(s => s.hydrate);
  const user     = useAuthStore(s => s.user);

  useEffect(() => { hydrate(); }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        {/* Register push token after login */}
        {user && <PushRegistrar />}
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
