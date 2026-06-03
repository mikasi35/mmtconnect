import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { C, URGENCY, STATUS, FTYPE, VAC_DOT, sh } from '../lib/theme';

// ── Badges ────────────────────────────────────────────────────

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const s = URGENCY[urgency] ?? URGENCY.low;
  return (
    <View style={[sh.badge, { backgroundColor: s.bg }]}>
      <Text style={[sh.badgeText, { color: s.text }]}>{urgency.toUpperCase()}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { bg: C.g100, text: C.g600 };
  return (
    <View style={[sh.badge, { backgroundColor: s.bg }]}>
      <Text style={[sh.badgeText, { color: s.text, textTransform: 'capitalize' }]}>{status}</Text>
    </View>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const s = FTYPE[type] ?? { bg: C.g100, text: C.g600 };
  return (
    <View style={[sh.badge, { backgroundColor: s.bg }]}>
      <Text style={[sh.badgeText, { color: s.text }]}>{type}</Text>
    </View>
  );
}

export function VacancyStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    available: { bg: C.greenLight,  text: C.green  },
    reserved:  { bg: C.yellowLight, text: C.yellow },
    occupied:  { bg: C.redLight,    text: C.red    },
  };
  const s = colors[status] ?? { bg: C.g100, text: C.g600 };
  return (
    <View style={[sh.badge, { backgroundColor: s.bg }]}>
      <Text style={[sh.badgeText, { color: s.text, textTransform: 'capitalize' }]}>{status}</Text>
    </View>
  );
}

// ── Button ────────────────────────────────────────────────────

interface BtnProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: string;
}

export function Btn({ label, onPress, variant = 'primary', size = 'md', disabled, loading, style, icon }: BtnProps) {
  const bg: Record<string, string> = {
    primary:   C.brand, secondary: C.white,
    danger:    C.redLight, ghost: 'transparent',
  };
  const tc: Record<string, string> = {
    primary: '#fff', secondary: C.g700,
    danger:  C.red,  ghost: C.brand,
  };
  const pad: Record<string, { px: number; py: number; fs: number }> = {
    sm: { px: 12, py: 7,  fs: 12 },
    md: { px: 16, py: 10, fs: 13 },
    lg: { px: 20, py: 13, fs: 15 },
  };
  const p = pad[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[{
        backgroundColor: bg[variant],
        borderRadius: 9,
        paddingHorizontal: p.px,
        paddingVertical: p.py,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: variant === 'secondary' ? 0.5 : 0,
        borderColor: C.g300,
        opacity: (disabled || loading) ? 0.55 : 1,
      }, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? '#fff' : C.brand} />
      ) : (
        <>
          {icon && <Text style={{ fontSize: p.fs + 2 }}>{icon}</Text>}
          <Text style={{ fontSize: p.fs, fontWeight: '600', color: tc[variant] }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── Card ──────────────────────────────────────────────────────

export function Card({ children, style, onPress }: {
  children: React.ReactNode; style?: ViewStyle; onPress?: () => void;
}) {
  const Wrap: any = onPress ? TouchableOpacity : View;
  return (
    <Wrap
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      style={[sh.card, sh.shadow, { padding: 14 }, style]}
    >
      {children}
    </Wrap>
  );
}

// ── Spinner / loader ──────────────────────────────────────────

export function Loader({ size = 28 }: { size?: number }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <ActivityIndicator size={size} color={C.brand} />
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────

export function EmptyState({ icon = '\u2014', title, message, action }: {
  icon?: string; title: string; message?: string; action?: React.ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', padding: 48, gap: 8 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.g100, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 22, color: C.g400, fontWeight: '300' }}>{icon}</Text>
      </View>
      <Text style={[sh.h3, { textAlign: 'center' }]}>{title}</Text>
      {message && <Text style={[sh.sm, { textAlign: 'center', lineHeight: 18 }]}>{message}</Text>}
      {action && <View style={{ marginTop: 8 }}>{action}</View>}
    </View>
  );
}

// ── Section header ────────────────────────────────────────────

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text style={sh.h3}>{title}</Text>
      {action}
    </View>
  );
}

// ── Pill filter ───────────────────────────────────────────────

export function PillFilter<T extends string>({
  options, value, onChange,
}: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <TouchableOpacity key={opt.value} onPress={() => onChange(opt.value)} activeOpacity={0.8}
            style={{ paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, backgroundColor: active ? C.brand : C.g100 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#fff' : C.g600 }}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
