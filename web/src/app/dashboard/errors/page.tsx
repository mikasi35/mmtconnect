'use client';
import { useState, useEffect, useCallback } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { PageLoader, EmptyState, Spinner } from '@/components/ui';
import { api } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────
interface ErrorLog {
  id: string;
  level: 'error' | 'warn';
  error_name: string | null;
  message: string;
  stack: string | null;
  path: string | null;
  method: string | null;
  status_code: number | null;
  ip_address: string | null;
  body: any;
  query: any;
  metadata: any;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  user: { id: string; name: string; email: string } | null;
  resolved_by_user: { id: string; name: string } | null;
}

interface Stats {
  total: string;
  unresolved: string;
  last_hour: string;
  last_24h: string;
  open_errors: string;
  open_warnings: string;
}

// ── Helpers ────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeSince(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)    return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const LEVEL_COLOR: Record<string, { bg: string; text: string }> = {
  error: { bg: '#FEE2E2', text: '#991B1B' },
  warn:  { bg: '#FEF3C7', text: '#92400E' },
};

const METHOD_COLOR: Record<string, string> = {
  GET: '#2563EB', POST: '#16A34A', PATCH: '#D97706', DELETE: '#DC2626', PUT: '#7C3AED',
};

// ── Main page ──────────────────────────────────────────────────
export default function ErrorLogsPage() {
  const [rows,       setRows]       = useState<ErrorLog[]>([]);
  const [stats,      setStats]      = useState<Stats | null>(null);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<ErrorLog | null>(null);
  const [resolving,  setResolving]  = useState<string | null>(null);
  const [deleting,   setDeleting]   = useState<string | null>(null);
  const [cleaning,   setCleaning]   = useState(false);

  // Filters
  const [level,      setLevel]      = useState('');
  const [resolved,   setResolved]   = useState('false');
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '25' };
      if (level)              params.level    = level;
      if (resolved !== '')    params.resolved = resolved;
      if (search.trim())      params.search   = search.trim();

      const [logsRes, statsRes] = await Promise.all([
        api.errorLogs.list(params),
        api.errorLogs.stats(),
      ]);
      setRows(logsRes.data);
      setTotal(logsRes.total);
      setStats(statsRes.data);
    } finally { setLoading(false); }
  }, [level, resolved, search, page]);

  useEffect(() => { load(); }, [load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line

  const resolve = async (id: string) => {
    setResolving(id);
    try {
      await api.errorLogs.resolve(id);
      await load();
      if (selected?.id === id) setSelected(s => s ? { ...s, resolved: true } : null);
    } finally { setResolving(null); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this error log?')) return;
    setDeleting(id);
    try {
      await api.errorLogs.delete(id);
      await load();
      if (selected?.id === id) setSelected(null);
    } finally { setDeleting(null); }
  };

  const cleanOld = async () => {
    if (!confirm('Delete all resolved logs older than 30 days?')) return;
    setCleaning(true);
    try {
      const res = await api.errorLogs.cleanup(30);
      alert(res.data.message);
      await load();
    } finally { setCleaning(false); }
  };

  const openDetail = async (row: ErrorLog) => {
    // Fetch full detail (includes stack, body, query)
    try {
      const res = await api.errorLogs.get(row.id);
      setSelected(res.data);
    } catch { setSelected(row); }
  };

  const unresolvedCount = stats ? parseInt(stats.unresolved) : 0;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar
          title="Error Logs"
          subtitle={stats ? `${stats.open_errors} open errors · ${stats.open_warnings} warnings · ${stats.last_24h} in last 24h` : 'Loading…'}
          actions={
            <button className="btn btn-secondary btn-sm" onClick={cleanOld} disabled={cleaning}>
              {cleaning ? <Spinner size={12} /> : 'Clean resolved'}
            </button>
          }
        />

        {/* ── Stats row ── */}
        {stats && (
          <div style={{ display: 'flex', gap: 12, padding: '10px 16px', background: '#fff', borderBottom: '0.5px solid var(--gray-200)', overflowX: 'auto', flexShrink: 0 }}>
            {[
              { label: 'Total',       value: stats.total,        color: 'var(--gray-700)' },
              { label: 'Unresolved',  value: stats.unresolved,   color: unresolvedCount > 0 ? '#DC2626' : '#16A34A' },
              { label: 'Last hour',   value: stats.last_hour,    color: parseInt(stats.last_hour) > 0 ? '#D97706' : 'var(--gray-500)' },
              { label: 'Last 24h',    value: stats.last_24h,     color: 'var(--gray-700)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', flexShrink: 0, minWidth: 70, background: 'var(--gray-50)', borderRadius: 8, padding: '6px 12px' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: 'Sora, sans-serif' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '0.5px solid var(--gray-200)', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <input
            className="form-input"
            style={{ flex: 1, minWidth: 180, height: 36, fontSize: 13 }}
            placeholder="Search message, path, error name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="form-select" style={{ height: 36, fontSize: 13, width: 110 }} value={level} onChange={e => { setLevel(e.target.value); setPage(1); }}>
            <option value="">All levels</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
          </select>
          <select className="form-select" style={{ height: 36, fontSize: 13, width: 130 }} value={resolved} onChange={e => { setResolved(e.target.value); setPage(1); }}>
            <option value="false">Unresolved</option>
            <option value="true">Resolved</option>
            <option value="">All</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={load} style={{ height: 36 }}>↻ Refresh</button>
        </div>

        {/* ── Log list ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && rows.length === 0 ? <PageLoader /> : rows.length === 0 ? (
            <EmptyState title="No errors" message="No error logs match your current filters." />
          ) : (
            rows.map(row => {
              const lc = LEVEL_COLOR[row.level] ?? LEVEL_COLOR.error;
              const isActive = selected?.id === row.id;
              return (
                <div
                  key={row.id}
                  onClick={() => openDetail(row)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '0.5px solid var(--gray-100)',
                    cursor: 'pointer',
                    background: isActive ? 'var(--brand-light)' : row.resolved ? '#fafafa' : '#fff',
                    opacity: row.resolved ? 0.6 : 1,
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: lc.bg, color: lc.text, textTransform: 'uppercase', flexShrink: 0 }}>
                      {row.level}
                    </span>
                    {row.method && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: METHOD_COLOR[row.method] ?? '#374151', flexShrink: 0 }}>
                        {row.method}
                      </span>
                    )}
                    {row.path && <span style={{ fontSize: 11, color: 'var(--gray-500)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{row.path}</span>}
                    {row.status_code && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: row.status_code >= 500 ? '#DC2626' : '#D97706', flexShrink: 0 }}>
                        {row.status_code}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--gray-400)', flexShrink: 0 }}>{timeSince(row.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: row.user ? 2 : 0 }}>
                    {row.error_name ? <span style={{ color: '#DC2626' }}>{row.error_name}: </span> : null}
                    {row.message}
                  </div>
                  {row.user?.name && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>User: {row.user.name}</div>}
                </div>
              );
            })
          )}

          {/* Pagination */}
          {total > 25 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 16px' }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ fontSize: 12, color: 'var(--gray-500)', alignSelf: 'center' }}>Page {page} of {Math.ceil(total / 25)}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <div style={{
          width: 420, borderLeft: '0.5px solid var(--gray-200)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: '#fff', flexShrink: 0,
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--gray-200)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>Detail</div>
            {!selected.resolved && (
              <button className="btn btn-primary btn-sm" onClick={() => resolve(selected.id)} disabled={resolving === selected.id}>
                {resolving === selected.id ? <Spinner size={12} /> : '✓ Resolve'}
              </button>
            )}
            <button className="btn btn-danger btn-sm" onClick={() => remove(selected.id)} disabled={deleting === selected.id}>
              {deleting === selected.id ? <Spinner size={12} /> : 'Delete'}
            </button>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--gray-400)', lineHeight: 1 }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {/* Status */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: LEVEL_COLOR[selected.level]?.bg, color: LEVEL_COLOR[selected.level]?.text, textTransform: 'uppercase' }}>
                {selected.level}
              </span>
              {selected.status_code && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: selected.status_code >= 500 ? '#FEE2E2' : '#FEF3C7', color: selected.status_code >= 500 ? '#991B1B' : '#92400E' }}>
                  HTTP {selected.status_code}
                </span>
              )}
              {selected.resolved && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: '#DCFCE7', color: '#166534' }}>
                  ✓ Resolved
                </span>
              )}
            </div>

            {/* Message */}
            <DetailBlock label="Error">
              {selected.error_name && <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>{selected.error_name}</div>}
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>{selected.message}</div>
            </DetailBlock>

            {/* Request */}
            <DetailBlock label="Request">
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 12px', fontSize: 12 }}>
                {selected.method && <><span style={{ color: 'var(--gray-400)' }}>Method</span><span style={{ fontWeight: 600, color: METHOD_COLOR[selected.method] ?? '#374151' }}>{selected.method}</span></>}
                {selected.path   && <><span style={{ color: 'var(--gray-400)' }}>Path</span><code style={{ fontSize: 11, background: 'var(--gray-50)', padding: '1px 5px', borderRadius: 4 }}>{selected.path}</code></>}
                {selected.ip_address && <><span style={{ color: 'var(--gray-400)' }}>IP</span><span>{selected.ip_address}</span></>}
              </div>
            </DetailBlock>

            {/* User */}
            {selected.user?.name && (
              <DetailBlock label="User">
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{selected.user.name}</div>
                  {selected.user.email && <div style={{ color: 'var(--gray-500)' }}>{selected.user.email}</div>}
                </div>
              </DetailBlock>
            )}

            {/* Timestamps */}
            <DetailBlock label="Time">
              <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>{fmtDate(selected.created_at)}</div>
              {selected.resolved && selected.resolved_at && (
                <div style={{ fontSize: 11, color: '#16A34A', marginTop: 3 }}>
                  Resolved {fmtDate(selected.resolved_at)}{selected.resolved_by_user ? ` by ${selected.resolved_by_user.name}` : ''}
                </div>
              )}
            </DetailBlock>

            {/* Stack trace */}
            {selected.stack && (
              <DetailBlock label="Stack trace">
                <pre style={{
                  fontSize: 10, lineHeight: 1.5, color: '#374151',
                  background: '#f8fafc', padding: 10, borderRadius: 6,
                  overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  maxHeight: 260, overflowY: 'auto', margin: 0,
                }}>
                  {selected.stack}
                </pre>
              </DetailBlock>
            )}

            {/* Request body */}
            {selected.body && (
              <DetailBlock label="Request body">
                <pre style={{ fontSize: 10, lineHeight: 1.5, background: '#f8fafc', padding: 10, borderRadius: 6, overflowX: 'auto', margin: 0, maxHeight: 180, overflowY: 'auto' }}>
                  {JSON.stringify(selected.body, null, 2)}
                </pre>
              </DetailBlock>
            )}

            {/* Query params */}
            {selected.query && Object.keys(selected.query).length > 0 && (
              <DetailBlock label="Query params">
                <pre style={{ fontSize: 10, lineHeight: 1.5, background: '#f8fafc', padding: 10, borderRadius: 6, overflowX: 'auto', margin: 0 }}>
                  {JSON.stringify(selected.query, null, 2)}
                </pre>
              </DetailBlock>
            )}

            {/* Metadata */}
            {selected.metadata && (
              <DetailBlock label="Metadata">
                <pre style={{ fontSize: 10, lineHeight: 1.5, background: '#f8fafc', padding: 10, borderRadius: 6, overflowX: 'auto', margin: 0 }}>
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </DetailBlock>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
