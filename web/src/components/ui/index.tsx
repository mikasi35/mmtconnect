'use client';
import { ReactNode } from 'react';

// ── Badge ─────────────────────────────────────────────────────

interface BadgeProps { label: string; className?: string; style?: React.CSSProperties; }
export function Badge({ label, className = '', style }: BadgeProps) {
  return <span className={`badge ${className}`} style={style}>{label}</span>;
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  return <span className={`badge urgency-${urgency}`}>{urgency.toUpperCase()}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge status-${status}`} style={{ textTransform: 'capitalize' }}>{status}</span>;
}

export function VacancyBadge({ status }: { status: string }) {
  return <span className={`badge vac-${status}`} style={{ textTransform: 'capitalize' }}>{status}</span>;
}

export function FacilityTypeBadge({ type }: { type: string }) {
  return <span className={`badge ftype-${type}`}>{type}</span>;
}

export function CareNeedIcon({ name, size = 24, color = '#1A56CC' }: { name: string; size?: number; color?: string }) {
  const commonProps = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' };

  switch (name) {
    case 'personal_care':
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 21c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'nursing':
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M7 10h10M12 5v10" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 18h16v2H4z" fill={color} opacity="0.1" />
          <path d="M8 4h8l2 4v10H6V8l2-4Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'behavioural_support':
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M7.5 16.5c-1.94 0-3.5-1.56-3.5-3.5S5.56 9.5 7.5 9.5s3.5 1.56 3.5 3.5S9.44 16.5 7.5 16.5Zm9 0c-1.94 0-3.5-1.56-3.5-3.5s1.56-3.5 3.5-3.5 3.5 1.56 3.5 3.5-1.56 3.5-3.5 3.5Z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 19.5c2.75 0 5-1.5 5-3.5v-1.25a4.75 4.75 0 0 0-9.5 0v1.25c0 2 2.25 3.5 5 3.5Z" fill={color} opacity="0.08" />
        </svg>
      );
    case 'complex_medical':
      return (
        <svg {...commonProps} aria-hidden="true">
          <rect x="6" y="3" width="12" height="18" rx="6" stroke={color} strokeWidth="1.8" />
          <path d="M12 7v6M9 10h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'overnight_support':
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 4a8 8 0 0 0 0 16c4.42 0 8-3.58 8-8 0-1.86-.66-3.57-1.76-4.93" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 10.5c0-1.93 1.57-3.5 3.5-3.5 1.24 0 2.33.62 2.95 1.57" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 8v4l2 1" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case '24h_support':
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
          <path d="M12 7v5l3 1.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.5 16.5h5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
          <text x="12" y="16.8" textAnchor="middle" fontSize="6.5" fill={color} fontWeight="700">24</text>
        </svg>
      );
    default:
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
        </svg>
      );
  }
}

export function AccommodationTypeIcon({ type, size = 36 }: { type: string; size?: number }) {
  const color = type === 'SDA' ? '#166534' : type === 'STA' ? '#C2410C' : '#1A56CC';
  const commonProps = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg' };

  switch (type) {
    case 'SDA':
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M4 13.5 12 4l8 9.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 13.5v6.5h16v-6.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 12h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'STA':
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M3 12.5 12 4l9 8.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 21V13h12v8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 18h6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'SIL':
    default:
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M4 12.5 12 5l8 7.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 12.5v7.5h14v-7.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 21V14h6v7" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

// ── Spinner ───────────────────────────────────────────────────

export function Spinner({ size = 20 }: { size?: number }) {
  return <div className="spinner" style={{ width: size, height: size }} />;
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <Spinner size={28} />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, footer, width = 520 }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" style={{ maxWidth: width }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'var(--gray-400)', lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────

export function EmptyState({ icon, title, message, action }: {
  icon?: string; title: string; message?: string; action?: ReactNode;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--gray-400)' }}>
      {icon && <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>}
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>{title}</div>
      {message && <div style={{ fontSize: 13, marginBottom: 16 }}>{message}</div>}
      {action}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDir?: 'up' | 'down' | 'neutral';
  fillPct?: number;
  fillColor?: string;
}

export function KpiCard({ label, value, trend, trendDir = 'neutral', fillPct, fillColor = 'var(--brand)' }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {trend && <div className={`kpi-trend ${trendDir}`}>{trend}</div>}
      {fillPct !== undefined && (
        <div className="kpi-bar">
          <div className="kpi-bar-fill" style={{ width: `${fillPct}%`, background: fillColor }} />
        </div>
      )}
    </div>
  );
}

// ── Error banner ──────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      background: '#FEE2E2', color: '#991B1B', borderRadius: 8,
      padding: '10px 14px', fontSize: 13, marginBottom: 16,
    }}>{message}</div>
  );
}

// ── Section header ────────────────────────────────────────────

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
      <h2 style={{ fontSize: 14, margin: 0 }}>{title}</h2>
      {action}
    </div>
  );
}
