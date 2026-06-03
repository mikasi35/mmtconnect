import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/lib/authStore';
import { View, ActivityIndicator } from 'react-native';
import { C } from '../src/lib/theme';

export default function Index() {
  const { user, hydrated } = useAuthStore();
  if (!hydrated) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.brand }}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
  return <Redirect href={user ? '/(tabs)' : '/(public)/find'} />;
}
