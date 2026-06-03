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
