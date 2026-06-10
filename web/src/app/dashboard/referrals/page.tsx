'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { UrgencyBadge, StatusBadge, Modal, PageLoader, EmptyState, Spinner } from '@/components/ui';
import { useReferrals } from '@/hooks/useData';
import { api } from '@/lib/api';
import { refreshReferrals } from '@/hooks/useData';

const STATUSES  = ['new', 'reviewing', 'matched', 'placed', 'rejected'];
const URGENCIES = ['immediate', 'high', 'medium', 'low'];
const SOURCES   = ['hospital', 'coordinator', 'family', 'self'];
const CARE_OPTIONS = [
  { key: 'personal_care',       label: 'Personal care' },
  { key: 'nursing',             label: 'Nursing' },
  { key: 'behavioural_support', label: 'Behavioural support' },
  { key: 'complex_medical',     label: 'Complex medical' },
  { key: 'overnight_support',   label: 'Overnight support' },
  { key: '24h_support',         label: '24h support' },
];

const URGENCY_COLOR: Record<string, string> = {
  immediate: '#991B1B', high: '#9A3412', medium: '#854D0E', low: '#166534',
};
const URGENCY_BG: Record<string, string> = {
  immediate: '#FEE2E2', high: '#FFEDD5', medium: '#FEF9C3', low: '#DCFCE7',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

const BLANK_FORM = {
  client_name: '', client_age: '', urgency: 'medium', source_type: 'coordinator',
  source_contact: '', location_preference: '', notes: '',
  care_needs: {} as Record<string, boolean>,
};

function ReferralsInner() {
  const sp = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>(sp.get('status') ?? 'all');
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState<any>(null);
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState({ ...BLANK_FORM });
  const [saving,       setSaving]       = useState(false);
  const [formErr,      setFormErr]      = useState('');
  const [updating,     setUpdating]     = useState<string | null>(null);

  const params: Record<string, string> = {};
  if (statusFilter !== 'all') params.status = statusFilter;
  if (search) params.search = search;

  const { referrals, total, isLoading, mutate } = useReferrals(Object.keys(params).length ? params : undefined);

  const openNew = () => { setForm({ ...BLANK_FORM }); setFormErr(''); setShowForm(true); };

  const handleSave = async () => {
    if (!form.client_name) { setFormErr('Client name is required'); return; }
    if (!form.client_age)  { setFormErr('Client age is required');  return; }
    setSaving(true); setFormErr('');
    try {
      await api.referrals.create({ ...form, client_age: parseInt(form.client_age) });
      await mutate(); refreshReferrals();
      setShowForm(false);
    } catch (e: any) {
      setFormErr(e.message || 'Failed to create referral');
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await api.referrals.update(id, { status });
      await mutate(); refreshReferrals();
      if (selected?.id === id) setSelected((prev: any) => ({ ...prev, status }));
    } finally { setUpdating(null); }
  };

  const runMatch = async (id: string) => {
    setUpdating(id);
    try {
      const res = await api.matching.run(id);
      await mutate();
      alert(`Found ${res.data.length} matching facilities. Go to Matching tab.`);
    } catch (e: any) {
      alert('Matching failed: ' + e.message);
    } finally { setUpdating(null); }
  };

  const rows: any[] = Array.isArray(referrals) ? referrals : (referrals as any)?.data ?? [];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar
          title="Referrals"
          subtitle={`${total || rows.length} total`}
          actions={<button className="btn btn-primary btn-sm" onClick={openNew}>+ New referral</button>}
        />

        {/* Filters */}
        <div style={{ background: '#fff', borderBottom: '0.5px solid var(--gray-200)', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            className="form-input"
            placeholder="Search by client name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 14 }}
          />
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {(['all', ...STATUSES] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                background: statusFilter === s ? 'var(--brand)' : 'var(--gray-100)',
                color: statusFilter === s ? '#fff' : 'var(--gray-600)',
              }}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {isLoading && rows.length === 0 ? <PageLoader /> : rows.length === 0 ? (
            <EmptyState title="No referrals found" message="Try adjusting your filters or create a new referral."
              action={<button className="btn btn-primary" onClick={openNew}>+ New referral</button>}
            />
          ) : (
            <>
              {/* Mobile card list */}
              <div className="referrals-cards">
                {rows.map((r: any) => (
                  <div key={r.id} className="referral-card" onClick={() => setSelected(selected?.id === r.id ? null : r)}
                    style={{ border: selected?.id === r.id ? '1.5px solid var(--brand)' : undefined }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--gray-900)', marginBottom: 3 }}>{r.client_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Age {r.client_age} · {r.source_type}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: URGENCY_BG[r.urgency], color: URGENCY_COLOR[r.urgency], textTransform: 'uppercase', letterSpacing: '.04em' }}>
                          {r.urgency}
                        </span>
                        <StatusBadge status={r.status} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                        {r.location_preference ? `📍 ${r.location_preference}` : ''}
                        {r.location_preference && ' · '}
                        {fmtDate(r.created_at)}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        {r.status === 'new' && (
                          <button className="btn btn-secondary btn-sm" disabled={updating === r.id} onClick={() => runMatch(r.id)} style={{ fontSize: 11 }}>
                            {updating === r.id ? <Spinner size={12} /> : '⌖ Match'}
                          </button>
                        )}
                        {r.status === 'matched' && (
                          <button className="btn btn-primary btn-sm" disabled={updating === r.id} onClick={() => updateStatus(r.id, 'placed')} style={{ fontSize: 11 }}>
                            {updating === r.id ? <Spinner size={12} /> : '✓ Place'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="card referrals-table-wrap" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>{['Client', 'Age', 'Urgency', 'Status', 'Source', 'Location', 'Date', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => (
                      <tr key={r.id} onClick={() => setSelected(selected?.id === r.id ? null : r)}
                        className={selected?.id === r.id ? 'selected' : ''}>
                        <td style={{ fontWeight: 500, color: 'var(--gray-900)' }}>{r.client_name}</td>
                        <td>{r.client_age}</td>
                        <td><UrgencyBadge urgency={r.urgency} /></td>
                        <td><StatusBadge status={r.status} /></td>
                        <td style={{ textTransform: 'capitalize', color: 'var(--gray-500)' }}>{r.source_type}</td>
                        <td style={{ color: 'var(--gray-600)' }}>{r.location_preference ?? '—'}</td>
                        <td style={{ color: 'var(--gray-400)' }}>{fmtDate(r.created_at)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 5 }}>
                            {r.status === 'new' && (
                              <button className="btn btn-secondary btn-sm" disabled={updating === r.id} onClick={() => runMatch(r.id)} style={{ fontSize: 11 }}>
                                {updating === r.id ? <Spinner size={12} /> : '⌖ Match'}
                              </button>
                            )}
                            {r.status === 'matched' && (
                              <button className="btn btn-primary btn-sm" disabled={updating === r.id} onClick={() => updateStatus(r.id, 'placed')} style={{ fontSize: 11 }}>
                                {updating === r.id ? <Spinner size={12} /> : '✓ Place'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail panel (slides up as a sheet on mobile) */}
      {selected && (
        <div className="referral-detail-panel">
          <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
            <h2 style={{ fontSize: 15, margin: 0 }}>Referral detail</h2>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--gray-400)', lineHeight: 1 }}>✕</button>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--brand)', flexShrink: 0 }}>
                {selected.client_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{selected.client_name}</div>
                <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Age {selected.client_age}</div>
              </div>
            </div>

            {[
              ['Urgency',  <UrgencyBadge key="u" urgency={selected.urgency} />],
              ['Status',   <StatusBadge  key="s" status={selected.status} />],
              ['Source',   <span key="src" style={{ textTransform: 'capitalize', fontSize: 13 }}>{selected.source_type}</span>],
              ['Contact',  selected.source_contact || '—'],
              ['Location', selected.location_preference || '—'],
              ['Date',     fmtDate(selected.created_at)],
            ].map(([label, val]) => (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '0.5px solid var(--gray-100)' }}>
                <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{label}</span>
                <span style={{ fontSize: 13 }}>{val as any}</span>
              </div>
            ))}

            {Object.entries(selected.care_needs ?? {}).filter(([, v]) => v).length > 0 && (
              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Care needs</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {CARE_OPTIONS.filter(o => (selected.care_needs ?? {})[o.key]).map(o => (
                    <span key={o.key} style={{ fontSize: 11, fontWeight: 500, background: 'var(--brand-light)', color: 'var(--brand)', padding: '2px 7px', borderRadius: 4 }}>{o.label}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.notes && (
              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>Notes</div>
                <div style={{ fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.5 }}>{selected.notes}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selected.status === 'new' && (
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', minHeight: 44 }} onClick={() => runMatch(selected.id)}>
                  {updating === selected.id ? <Spinner size={14} /> : '⌖ Run matching'}
                </button>
              )}
              {selected.status === 'reviewing' && (
                <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 13, minHeight: 44 }} onClick={() => updateStatus(selected.id, 'matched')}>
                  Mark matched
                </button>
              )}
              {selected.status === 'matched' && (
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', minHeight: 44 }} onClick={() => updateStatus(selected.id, 'placed')}>
                  ✓ Confirm placement
                </button>
              )}
              {!['placed', 'rejected'].includes(selected.status) && (
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center', fontSize: 13, minHeight: 44 }} onClick={() => updateStatus(selected.id, 'rejected')}>
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Referral Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Referral"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><Spinner size={14} /> Saving…</> : 'Submit referral'}
            </button>
          </>
        }
      >
        {formErr && <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '9px 12px', borderRadius: 7, fontSize: 13 }}>{formErr}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group" style={{ gridColumn: '1/2' }}>
            <label className="form-label">Full name *</label>
            <input className="form-input" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="James Thompson" />
          </div>
          <div className="form-group">
            <label className="form-label">Age *</label>
            <input className="form-input" type="number" min={0} max={120} value={form.client_age} onChange={e => setForm(f => ({ ...f, client_age: e.target.value }))} placeholder="42" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Urgency</label>
            <select className="form-select" value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
              {URGENCIES.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Source *</label>
            <select className="form-select" value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}>
              {SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Source contact</label>
          <input className="form-input" value={form.source_contact} onChange={e => setForm(f => ({ ...f, source_contact: e.target.value }))} placeholder="Royal North Shore Hospital" />
        </div>
        <div className="form-group">
          <label className="form-label">Location preference</label>
          <input className="form-input" value={form.location_preference} onChange={e => setForm(f => ({ ...f, location_preference: e.target.value }))} placeholder="Sydney, NSW" />
        </div>

        <div className="form-group">
          <label className="form-label">Care needs</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {CARE_OPTIONS.map(o => (
              <label key={o.key} style={{
                display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer',
                fontSize: 13, padding: '8px 10px', borderRadius: 6, minHeight: 44,
                background: form.care_needs[o.key] ? 'var(--brand-light)' : 'var(--gray-50)',
                border: `0.5px solid ${form.care_needs[o.key] ? 'var(--brand)' : 'var(--gray-200)'}`,
                color: form.care_needs[o.key] ? 'var(--brand)' : 'var(--gray-700)',
              }}>
                <input type="checkbox" checked={!!form.care_needs[o.key]}
                  onChange={() => setForm(f => ({ ...f, care_needs: { ...f.care_needs, [o.key]: !f.care_needs[o.key] } }))}
                  style={{ width: 16, height: 16 }} />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special requirements, context, urgency details…" />
        </div>
      </Modal>
    </div>
  );
}

export default function ReferralsPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}><div className="spinner" style={{ width: 28, height: 28 }} /></div>}>
      <ReferralsInner />
    </Suspense>
  );
}
