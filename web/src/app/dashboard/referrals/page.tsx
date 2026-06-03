'use client';
import { useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Topbar } from '@/components/layout/Topbar';
import { UrgencyBadge, StatusBadge, Modal, PageLoader, EmptyState, Spinner } from '@/components/ui';
import { useReferrals } from '@/hooks/useData';
import { api } from '@/lib/api';
import { refreshReferrals } from '@/hooks/useData';

const STATUSES  = ['new','reviewing','matched','placed','rejected'];
const URGENCIES = ['immediate','high','medium','low'];
const SOURCES   = ['hospital','coordinator','family','self'];
const CARE_OPTIONS = [
  { key:'personal_care',       label:'Personal care' },
  { key:'nursing',             label:'Nursing' },
  { key:'behavioural_support', label:'Behavioural support' },
  { key:'complex_medical',     label:'Complex medical' },
  { key:'overnight_support',   label:'Overnight support' },
  { key:'24h_support',         label:'24h support' },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
}

const BLANK_FORM = {
  client_name:'', client_age:'', urgency:'medium', source_type:'coordinator',
  source_contact:'', location_preference:'', notes:'',
  care_needs: {} as Record<string,boolean>,
};

function ReferralsInner() {
  const sp = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<string>(sp.get('status') ?? 'all');
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ ...BLANK_FORM });
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const params: Record<string,string> = {};
  if (statusFilter !== 'all') params.status = statusFilter;
  if (search) params.search = search;

  const { referrals, total, isLoading, mutate } = useReferrals(Object.keys(params).length ? params : undefined);

  const openNew = () => { setForm({ ...BLANK_FORM }); setFormErr(''); setShowForm(true); };

  const handleSave = async () => {
    if (!form.client_name) { setFormErr('Client name is required'); return; }
    if (!form.client_age)  { setFormErr('Client age is required');  return; }
    if (!form.source_type) { setFormErr('Source type is required'); return; }
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
      if (selected?.id === id) setSelected({ ...selected, status });
    } finally { setUpdating(null); }
  };

  const runMatch = async (id: string) => {
    setUpdating(id);
    try {
      const res = await api.matching.run(id);
      await mutate();
      alert(`Found ${res.data.length} matching facilities. Go to Matching tab for details.`);
    } catch (e: any) {
      alert('Matching failed: ' + e.message);
    } finally { setUpdating(null); }
  };

  const toggleCare = (key: string) => {
    setForm(f => ({ ...f, care_needs: { ...f.care_needs, [key]: !f.care_needs[key] } }));
  };

  const rows: any[] = Array.isArray(referrals) ? referrals : (referrals as any)?.data ?? [];

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <Topbar
          title="Referrals"
          subtitle={`${total || rows.length} total`}
          actions={<button className="btn btn-primary btn-sm" onClick={openNew}>+ New referral</button>}
        />

        {/* Filters */}
        <div style={{ background:'#fff', borderBottom:'0.5px solid var(--gray-200)', padding:'10px 20px', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <input
            className="form-input" style={{ width:220, fontSize:13, padding:'6px 10px' }}
            placeholder="Search by client name…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {(['all', ...STATUSES] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:500,
              cursor:'pointer', border:'none', transition:'all 0.12s',
              background: statusFilter === s ? 'var(--brand)' : 'var(--gray-100)',
              color: statusFilter === s ? '#fff' : 'var(--gray-600)',
            }}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {isLoading && rows.length === 0 ? <PageLoader /> : (
            rows.length === 0 ? (
              <EmptyState title="No referrals found" message="Try adjusting your filters or create a new referral."
                action={<button className="btn btn-primary" onClick={openNew}>+ New referral</button>}
              />
            ) : (
              <div className="card" style={{ margin:16, padding:0, overflow:'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {['Client','Age','Urgency','Status','Source','Location','Date','Actions'].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => (
                      <tr key={r.id} onClick={() => setSelected(selected?.id === r.id ? null : r)}
                        className={selected?.id === r.id ? 'selected' : ''}>
                        <td style={{ fontWeight:500, color:'var(--gray-900)' }}>{r.client_name}</td>
                        <td>{r.client_age}</td>
                        <td><UrgencyBadge urgency={r.urgency} /></td>
                        <td><StatusBadge status={r.status} /></td>
                        <td style={{ textTransform:'capitalize', color:'var(--gray-500)' }}>{r.source_type}</td>
                        <td style={{ color:'var(--gray-600)' }}>{r.location_preference ?? '—'}</td>
                        <td style={{ color:'var(--gray-400)' }}>{fmtDate(r.created_at)}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display:'flex', gap:5 }}>
                            {r.status === 'new' && (
                              <button className="btn btn-secondary btn-sm" disabled={updating === r.id}
                                onClick={() => runMatch(r.id)}
                                style={{ fontSize:11 }}>
                                {updating === r.id ? <Spinner size={12} /> : '⌖ Match'}
                              </button>
                            )}
                            {r.status === 'matched' && (
                              <button className="btn btn-primary btn-sm" disabled={updating === r.id}
                                onClick={() => updateStatus(r.id,'placed')} style={{ fontSize:11 }}>
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
            )
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ width:320, background:'#fff', borderLeft:'0.5px solid var(--gray-200)', overflowY:'auto', flexShrink:0 }}>
          <div style={{ padding:'16px 18px', borderBottom:'0.5px solid var(--gray-200)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:15, margin:0 }}>Referral detail</h2>
            <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--gray-400)' }}>✕</button>
          </div>
          <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:12 }}>
            {/* Avatar */}
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--brand-light)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:16, color:'var(--brand)', flexShrink:0 }}>
                {selected.client_name.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:600, fontSize:15 }}>{selected.client_name}</div>
                <div style={{ fontSize:12, color:'var(--gray-500)' }}>Age {selected.client_age}</div>
              </div>
            </div>

            {/* Details */}
            {[
              ['Urgency', <UrgencyBadge urgency={selected.urgency} />],
              ['Status',  <StatusBadge status={selected.status} />],
              ['Source',  <span style={{ textTransform:'capitalize', fontSize:13 }}>{selected.source_type}</span>],
              ['Contact', selected.source_contact || '—'],
              ['Location preference', selected.location_preference || '—'],
              ['Submitted', fmtDate(selected.created_at)],
            ].map(([label, val]) => (
              <div key={label as string} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'0.5px solid var(--gray-100)' }}>
                <span style={{ fontSize:12, color:'var(--gray-500)' }}>{label}</span>
                <span style={{ fontSize:13 }}>{val as any}</span>
              </div>
            ))}

            {/* Care needs */}
            {Object.entries(selected.care_needs ?? {}).filter(([,v]) => v).length > 0 && (
              <div style={{ background:'var(--gray-50)', borderRadius:8, padding:'10px 12px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-400)', marginBottom:6, textTransform:'uppercase', letterSpacing:'.05em' }}>Care needs</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {CARE_OPTIONS.filter(o => (selected.care_needs ?? {})[o.key]).map(o => (
                    <span key={o.key} style={{ fontSize:11, fontWeight:500, background:'var(--brand-light)', color:'var(--brand)', padding:'2px 7px', borderRadius:4 }}>{o.label}</span>
                  ))}
                </div>
              </div>
            )}

            {selected.notes && (
              <div style={{ background:'var(--gray-50)', borderRadius:8, padding:'10px 12px' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-400)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.05em' }}>Notes</div>
                <div style={{ fontSize:13, color:'var(--gray-700)', lineHeight:1.5 }}>{selected.notes}</div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {selected.status === 'new' && (
                <button className="btn btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={() => runMatch(selected.id)}>
                  {updating === selected.id ? <Spinner size={14} /> : '⌖ Run matching'}
                </button>
              )}
              {selected.status === 'reviewing' && (
                <button className="btn btn-secondary" style={{ flex:1, justifyContent:'center', fontSize:12 }}
                  onClick={() => updateStatus(selected.id, 'matched')}>Mark as Matched</button>
              )}
              {selected.status === 'matched' && (
                <button className="btn btn-primary" style={{ flex:1, justifyContent:'center' }}
                  onClick={() => updateStatus(selected.id, 'placed')}>✓ Confirm placement</button>
              )}
              {!['placed','rejected'].includes(selected.status) && (
                <button className="btn btn-danger" style={{ flex:1, justifyContent:'center', fontSize:12 }}
                  onClick={() => updateStatus(selected.id, 'rejected')}>Reject</button>
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
        {formErr && <div style={{ background:'#FEE2E2', color:'#991B1B', padding:'9px 12px', borderRadius:7, fontSize:13 }}>{formErr}</div>}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="form-group" style={{ gridColumn:'1/2' }}>
            <label className="form-label">Full name *</label>
            <input className="form-input" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="James Thompson" />
          </div>
          <div className="form-group">
            <label className="form-label">Age *</label>
            <input className="form-input" type="number" min={0} max={120} value={form.client_age} onChange={e => setForm(f => ({ ...f, client_age: e.target.value }))} placeholder="42" />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="form-group">
            <label className="form-label">Urgency</label>
            <select className="form-select" value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
              {URGENCIES.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase()+u.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Source type *</label>
            <select className="form-select" value={form.source_type} onChange={e => setForm(f => ({ ...f, source_type: e.target.value }))}>
              {SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Source contact (hospital/coordinator name)</label>
          <input className="form-input" value={form.source_contact} onChange={e => setForm(f => ({ ...f, source_contact: e.target.value }))} placeholder="Royal North Shore Hospital" />
        </div>

        <div className="form-group">
          <label className="form-label">Location preference</label>
          <input className="form-input" value={form.location_preference} onChange={e => setForm(f => ({ ...f, location_preference: e.target.value }))} placeholder="Sydney, NSW" />
        </div>

        <div className="form-group">
          <label className="form-label">Care needs</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {CARE_OPTIONS.map(o => (
              <label key={o.key} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:13, padding:'6px 10px', borderRadius:6, background: form.care_needs[o.key] ? 'var(--brand-light)' : 'var(--gray-50)', border: `0.5px solid ${form.care_needs[o.key] ? 'var(--brand)' : 'var(--gray-200)'}`, color: form.care_needs[o.key] ? 'var(--brand)' : 'var(--gray-700)' }}>
                <input type="checkbox" checked={!!form.care_needs[o.key]} onChange={() => toggleCare(o.key)} style={{ width:14, height:14 }} />
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
    <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}><div className="spinner" style={{width:28,height:28}} /></div>}>
      <ReferralsInner />
    </Suspense>
  );
}
