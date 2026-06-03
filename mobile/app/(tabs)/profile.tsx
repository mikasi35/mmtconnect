import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/lib/authStore';
import { mobileApi } from '../../src/lib/api';
import { C, sh } from '../../src/lib/theme';

const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  admin:            { bg: '#EDE9FE', text: '#5B21B6' },
  coordinator:      { bg: C.brandLight, text: C.brand },
  facility_manager: { bg: C.greenLight, text: C.green },
  hospital_user:    { bg: C.orangeLight, text: C.orange },
};

type Screen = 'menu' | 'change-password' | 'forgot-password' | 'forgot-sent';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const rc = ROLE_COLOR[user?.role ?? 'coordinator'] ?? ROLE_COLOR.coordinator;

  const [screen,       setScreen]       = useState<Screen>('menu');
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState('');
  const [success,      setSuccess]      = useState('');

  // Change password
  const [currentPw,   setCurrentPw]    = useState('');
  const [newPw,        setNewPw]        = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');

  // Forgot password
  const [forgotEmail,  setForgotEmail]  = useState(user?.email ?? '');

  const resetForm = () => {
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setForgotEmail(user?.email ?? '');
    setErr(''); setSuccess('');
  };

  const goTo = (s: Screen) => { resetForm(); setScreen(s); };

  const handleChangePassword = async () => {
    if (!currentPw)            { setErr('Enter your current password');        return; }
    if (newPw.length < 8)      { setErr('New password must be 8+ characters'); return; }
    if (newPw !== confirmPw)   { setErr('Passwords do not match');             return; }
    setSaving(true); setErr('');
    try {
      await mobileApi.auth.changePassword(currentPw, newPw);
      setSuccess('Password changed successfully.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) {
      setErr(e.message ?? 'Failed to change password');
    } finally { setSaving(false); }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) { setErr('Enter your email address'); return; }
    setSaving(true); setErr('');
    try {
      await mobileApi.auth.forgotPassword(forgotEmail.trim());
      setScreen('forgot-sent');
    } catch (e: any) {
      setErr(e.message ?? 'Request failed');
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => {
        await logout();
        router.replace('/(auth)/login');
      }},
    ]);
  };

  // ── Sub-screens ─────────────────────────────────────────────

  if (screen === 'change-password') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.g50 }}>
        <View style={s.subHeader}>
          <TouchableOpacity onPress={() => goTo('menu')}>
            <Text style={{ fontSize: 15, color: C.brand }}>Back</Text>
          </TouchableOpacity>
          <Text style={sh.h3}>Change Password</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            <Text style={[sh.sm, { color: C.g500, lineHeight: 18 }]}>
              Choose a strong password of at least 8 characters.
            </Text>

            <View>
              <Text style={sh.label}>Current password</Text>
              <TextInput style={sh.input} value={currentPw} onChangeText={setCurrentPw}
                secureTextEntry placeholder="Your current password" placeholderTextColor={C.g300} />
            </View>
            <View>
              <Text style={sh.label}>New password</Text>
              <TextInput style={sh.input} value={newPw} onChangeText={setNewPw}
                secureTextEntry placeholder="At least 8 characters" placeholderTextColor={C.g300} />
            </View>
            <View>
              <Text style={sh.label}>Confirm new password</Text>
              <TextInput style={sh.input} value={confirmPw} onChangeText={setConfirmPw}
                secureTextEntry placeholder="Repeat new password" placeholderTextColor={C.g300} />
            </View>

            {err     ? <View style={s.errBox}><Text style={{ color: C.red,   fontSize: 13 }}>{err}</Text></View>     : null}
            {success ? <View style={s.okBox}> <Text style={{ color: C.green, fontSize: 13 }}>{success}</Text></View> : null}

            <TouchableOpacity style={[s.primaryBtn, saving && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.primaryBtnText}>Update password</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => goTo('forgot-password')} style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ fontSize: 13, color: C.brand }}>Forgot current password?</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (screen === 'forgot-password') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.g50 }}>
        <View style={s.subHeader}>
          <TouchableOpacity onPress={() => goTo('menu')}>
            <Text style={{ fontSize: 15, color: C.brand }}>Back</Text>
          </TouchableOpacity>
          <Text style={sh.h3}>Reset Password</Text>
          <View style={{ width: 40 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            <Text style={[sh.sm, { color: C.g500, lineHeight: 18 }]}>
              Enter your email and we will send you a password reset link.
            </Text>
            <View>
              <Text style={sh.label}>Email address</Text>
              <TextInput style={sh.input} value={forgotEmail} onChangeText={setForgotEmail}
                keyboardType="email-address" autoCapitalize="none"
                placeholder="your@email.com" placeholderTextColor={C.g300} />
            </View>
            {err ? <View style={s.errBox}><Text style={{ color: C.red, fontSize: 13 }}>{err}</Text></View> : null}
            <TouchableOpacity style={[s.primaryBtn, saving && { opacity: 0.6 }]} onPress={handleForgotPassword} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.primaryBtnText}>Send reset link</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (screen === 'forgot-sent') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.g50 }}>
        <View style={s.subHeader}>
          <View style={{ width: 40 }} />
          <Text style={sh.h3}>Check your email</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={s.successIcon}>
            <Text style={{ fontSize: 28, color: C.green, fontWeight: '700' }}>+</Text>
          </View>
          <Text style={[sh.h2, { textAlign: 'center', marginBottom: 10 }]}>Email sent</Text>
          <Text style={[sh.sm, { textAlign: 'center', color: C.g500, lineHeight: 20, marginBottom: 28 }]}>
            If {forgotEmail} is registered, you will receive a reset link shortly.
            Check your spam folder if you do not see it.
          </Text>
          <TouchableOpacity style={s.primaryBtn} onPress={() => goTo('menu')}>
            <Text style={s.primaryBtnText}>Back to profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main menu ────────────────────────────────────────────────

  const MENU_ITEMS = [
    {
      label: 'Change password',
      sub:   'Update your login credentials',
      icon:  '\u25A3',
      onPress: () => goTo('change-password'),
    },
    {
      label: 'Forgot password',
      sub:   'Request a reset link by email',
      icon:  '\u25A1',
      onPress: () => goTo('forgot-password'),
    },
    {
      label: 'Notification preferences',
      sub:   'Vacancy alerts and referral updates',
      icon:  '\u25CE',
      onPress: () => Alert.alert('Notifications', 'Push notifications are enabled for this device. To disable, go to Settings > Notifications.'),
    },
    {
      label: 'Help and support',
      sub:   'FAQs and contact details',
      icon:  '\u25CB',
      onPress: () => {},
    },
    {
      label: 'Terms and Privacy',
      sub:   'Read our policies',
      icon:  '\u25CC',
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.g50 }}>
      <View style={s.header}>
        <Text style={sh.h2}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* User card */}
        <View style={s.userCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.name?.[0]?.toUpperCase() ?? 'U'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={sh.h2}>{user?.name}</Text>
            <Text style={[sh.sm, { marginTop: 2, color: C.g500 }]}>{user?.email}</Text>
            <View style={[s.roleBadge, { backgroundColor: rc.bg }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: rc.text, textTransform: 'capitalize' }}>
                {user?.role?.replace('_', ' ')} · {user?.organisation ?? 'MMT Care'}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View style={s.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[s.menuRow, i < MENU_ITEMS.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: C.g100 }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={s.menuIconWrap}>
                <Text style={{ fontSize: 16, color: C.brand }}>{item.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sh.h4}>{item.label}</Text>
                {item.sub ? <Text style={sh.xs}>{item.sub}</Text> : null}
              </View>
              <Text style={{ color: C.g300, fontSize: 20, lineHeight: 24 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.red }}>Log out</Text>
        </TouchableOpacity>

        <Text style={[sh.xs, { textAlign: 'center', marginTop: 16, color: C.g400 }]}>
          MMT Care Connect v1.0 · Build 2026
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:       { padding: 20, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: C.g200 },
  subHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: C.g200 },
  userCard:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', padding: 20, borderBottomWidth: 0.5, borderBottomColor: C.g200 },
  avatar:       { width: 52, height: 52, borderRadius: 26, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 20, fontWeight: '800', color: C.brand },
  roleBadge:    { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  menuCard:     { backgroundColor: '#fff', margin: 16, borderRadius: 14, borderWidth: 0.5, borderColor: C.g200, overflow: 'hidden' },
  menuRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.brandLight, alignItems: 'center', justifyContent: 'center' },
  logoutBtn:    { marginHorizontal: 16, backgroundColor: C.redLight, borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryBtn:   { backgroundColor: C.brand, borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryBtnText:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  errBox:       { backgroundColor: C.redLight, borderRadius: 8, padding: 10 },
  okBox:        { backgroundColor: C.greenLight, borderRadius: 8, padding: 10 },
  successIcon:  { width: 64, height: 64, borderRadius: 32, backgroundColor: C.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});
