import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/lib/authStore';
import { C, sh } from '../../src/lib/theme';

export default function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    const ok = await login(email.trim(), password);
    if (ok) router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={['#1A56CC', '#0E3A9A', '#091E5C']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoBox}>
              <Text style={s.logoLetter}>M</Text>
            </View>
            <Text style={s.logoTitle}>MMT Care Connect</Text>
            <Text style={s.logoSub}>NDIS Placement Platform</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Sign in</Text>
            <Text style={s.cardSub}>Access your coordinator dashboard</Text>

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={{ gap: 12 }}>
              <View>
                <Text style={sh.label}>Email address</Text>
                <TextInput
                  style={sh.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@mmtcare.com.au"
                  placeholderTextColor={C.g400}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View>
                <Text style={sh.label}>Password</Text>
                <TextInput
                  style={sh.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={C.g400}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>

              <TouchableOpacity
                style={[s.loginBtn, isLoading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.loginBtnText}>Sign in</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ fontSize: 13, color: C.brand }}>Forgot your password?</Text>
              </TouchableOpacity>
            </View>

            <View style={s.demoBox}>
              <Text style={s.demoTitle}>Demo credentials</Text>
              <TouchableOpacity onPress={() => { setEmail('sarah@mmtcare.com.au'); setPassword('Admin@2026!'); }}>
                <Text style={s.demoText}>sarah@mmtcare.com.au  ·  Admin@2026!</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={s.footer}>MMT Care Connect v1.0 · NDIS Compliant</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scroll:     { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 24 },
  logoWrap:   { alignItems: 'center', gap: 8 },
  logoBox:    { width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 32, fontWeight: '800', color: '#fff' },
  logoTitle:  { fontSize: 22, fontWeight: '700', color: '#fff' },
  logoSub:    { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  card:       { backgroundColor: '#fff', borderRadius: 20, padding: 24, gap: 14, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
  cardTitle:  { fontSize: 20, fontWeight: '700', color: C.g900 },
  cardSub:    { fontSize: 13, color: C.g500, marginBottom: 4 },
  errorBox:   { backgroundColor: C.redLight, borderRadius: 8, padding: 10 },
  errorText:  { fontSize: 13, color: C.red },
  loginBtn:   { backgroundColor: C.brand, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  loginBtnText:{ fontSize: 15, fontWeight: '700', color: '#fff' },
  demoBox:    { backgroundColor: C.g50, borderRadius: 8, padding: 10, borderWidth: 0.5, borderColor: C.g200 },
  demoTitle:  { fontSize: 10, fontWeight: '700', color: C.g400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  demoText:   { fontSize: 12, color: C.brand },
  footer:     { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.35)' },
});
