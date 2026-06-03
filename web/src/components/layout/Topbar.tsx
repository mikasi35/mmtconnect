'use client';

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <div style={{
      height: 'var(--topbar-h)',
      background: '#fff',
      borderBottom: '0.5px solid var(--gray-200)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div>
        <h1 style={{ fontSize: 17, margin: 0, color: 'var(--gray-900)' }}>{title}</h1>
        {subtitle && <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--gray-500)' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{actions}</div>}
    </div>
  );
}
