import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { mobileApi } from '../../src/lib/api';
import { C, sh } from '../../src/lib/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setError('');
    if (!email.trim()) {
      setError('Enter your email address');
      return;
    }
    setLoading(true);
    try {
      await mobileApi.auth.forgotPassword(email.trim());
      setSent(true);
    } catch (e: any) {
      setError(e.message ?? 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={['#1A56CC', '#0E3A9A', '#091E5C']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.logoWrap}>
            <View style={s.logoBox}>
              <Text style={s.logoLetter}>M</Text>
            </View>
            <Text style={s.logoTitle}>Reset password</Text>
            <Text style={s.logoSub}>We will send a password reset link to your email.</Text>
          </View>

          <View style={s.card}>
            {sent ? (
              <>
                <Text style={[sh.h3, { marginBottom: 12 }]}>Email sent</Text>
                <Text style={[sh.body, { color: C.g500 }]}>If {email.trim()} is registered, you should receive a reset link shortly. Check your spam folder if you do not see it.</Text>
                <TouchableOpacity style={[s.loginBtn, { marginTop: 24 }]} onPress={() => router.replace('/(auth)/login')}>
                  <Text style={s.loginBtnText}>Back to login</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.cardTitle}>Forgot password</Text>
                <Text style={s.cardSub}>Enter the email address associated with your account.</Text>
                <View style={{ gap: 12, marginTop: 16 }}>
                  <View>
                    <Text style={sh.label}>Email address</Text>
                    <TextInput
                      style={sh.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      placeholderTextColor={C.g400}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="send"
                      onSubmitEditing={handleSend}
                    />
                  </View>

                  {error ? (
                    <View style={s.errorBox}>
                      <Text style={s.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[s.loginBtn, loading && { opacity: 0.7 }]}
                    onPress={handleSend}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.loginBtnText}>Send reset link</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {!sent && (
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{ alignItems: 'center', marginTop: 12 }}>
              <Text style={{ color: C.brand, fontSize: 13 }}>Back to login</Text>
            </TouchableOpacity>
          )}
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
});
