import type { UrgencyLevel, ReferralStatus, VacancyStatus, FacilityType, CareNeeds } from '../types';

// ── Colour maps ───────────────────────────────────────────────

export const URGENCY_COLORS: Record<UrgencyLevel, { bg: string; text: string; border: string }> = {
  immediate: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  high:      { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' },
  medium:    { bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' },
  low:       { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
};

export const STATUS_COLORS: Record<ReferralStatus, { bg: string; text: string }> = {
  new:       { bg: '#DBEAFE', text: '#1E40AF' },
  reviewing: { bg: '#FEF9C3', text: '#854D0E' },
  matched:   { bg: '#FFEDD5', text: '#9A3412' },
  placed:    { bg: '#DCFCE7', text: '#166534' },
  rejected:  { bg: '#FEE2E2', text: '#991B1B' },
};

export const VACANCY_COLORS: Record<VacancyStatus, { bg: string; text: string; dot: string }> = {
  available: { bg: '#DCFCE7', text: '#166534', dot: '#16A34A' },
  reserved:  { bg: '#FEF9C3', text: '#854D0E', dot: '#EAB308' },
  occupied:  { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
};

export const FACILITY_TYPE_COLORS: Record<FacilityType, { bg: string; text: string }> = {
  SIL: { bg: '#EBF2FF', text: '#1A56CC' },
  SDA: { bg: '#F0FDF4', text: '#166534' },
  STA: { bg: '#FFF7ED', text: '#9A3412' },
};

// ── Date / time formatters ────────────────────────────────────

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(d: string | Date): string {
  return new Date(d).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function relativeTime(d: string | Date): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export function daysBetween(a: string | Date, b: string | Date): number {
  return Math.abs(
    Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
  );
}

// ── Geo ───────────────────────────────────────────────────────

export function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Care needs ────────────────────────────────────────────────

export const CARE_NEED_LABELS: Record<keyof CareNeeds, string> = {
  personal_care:       'Personal care',
  nursing:             'Nursing',
  behavioural_support: 'Behavioural support',
  complex_medical:     'Complex medical',
  overnight_support:   'Overnight support',
  '24h_support':       '24h support',
};

export function careNeedsCount(needs: CareNeeds): number {
  return Object.values(needs).filter(Boolean).length;
}

export function meetsCareneeds(needs: CareNeeds, supported: CareNeeds): boolean {
  return Object.entries(needs).every(
    ([k, required]) => !required || !!supported[k as keyof CareNeeds]
  );
}

// ── String helpers ────────────────────────────────────────────

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatPercent(n: number): string {
  return `${Math.round(n * 100)}%`;
}
