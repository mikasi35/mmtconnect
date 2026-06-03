import { StyleSheet } from 'react-native';

export const C = {
  brand:        '#1A56CC',
  brandLight:   '#EBF2FF',
  brandDark:    '#1548B0',
  white:        '#FFFFFF',
  g50:          '#F9FAFB',
  g100:         '#F3F4F6',
  g200:         '#E5E7EB',
  g300:         '#D1D5DB',
  g400:         '#9CA3AF',
  g500:         '#6B7280',
  g600:         '#4B5563',
  g700:         '#374151',
  g800:         '#1F2937',
  g900:         '#111827',
  green:        '#16A34A',
  greenLight:   '#DCFCE7',
  orange:       '#9A3412',
  orangeLight:  '#FFEDD5',
  yellow:       '#854D0E',
  yellowLight:  '#FEF9C3',
  red:          '#991B1B',
  redLight:     '#FEE2E2',
} as const;

export const URGENCY: Record<string, { bg: string; text: string }> = {
  immediate: { bg: C.redLight,    text: C.red    },
  high:      { bg: C.orangeLight, text: C.orange  },
  medium:    { bg: C.yellowLight, text: C.yellow  },
  low:       { bg: C.greenLight,  text: C.green   },
};

export const STATUS: Record<string, { bg: string; text: string }> = {
  new:       { bg: '#DBEAFE', text: '#1E40AF' },
  reviewing: { bg: C.yellowLight, text: C.yellow  },
  matched:   { bg: C.orangeLight, text: C.orange  },
  placed:    { bg: C.greenLight,  text: C.green   },
  rejected:  { bg: C.redLight,    text: C.red     },
};

export const FTYPE: Record<string, { bg: string; text: string }> = {
  SIL: { bg: C.brandLight,  text: C.brand  },
  SDA: { bg: C.greenLight,  text: C.green  },
  STA: { bg: C.orangeLight, text: C.orange },
};

export const VAC_DOT: Record<string, string> = {
  available: '#16A34A',
  reserved:  '#EAB308',
  occupied:  '#EF4444',
};

// Reusable stylesheet fragments
export const sh = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: C.g200,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: C.g200,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.g800,
    backgroundColor: C.g50,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: C.g600,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  h1:   { fontSize: 24, fontWeight: '700', color: C.g900 },
  h2:   { fontSize: 18, fontWeight: '700', color: C.g900 },
  h3:   { fontSize: 15, fontWeight: '600', color: C.g900 },
  h4:   { fontSize: 13, fontWeight: '600', color: C.g800 },
  body: { fontSize: 14, fontWeight: '400', color: C.g700, lineHeight: 22 },
  sm:   { fontSize: 12, fontWeight: '400', color: C.g500 },
  xs:   { fontSize: 10, fontWeight: '400', color: C.g400 },
});
