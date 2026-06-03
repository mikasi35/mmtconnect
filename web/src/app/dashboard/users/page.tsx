'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Modal, PageLoader, EmptyState, Spinner } from '@/components/ui';
import { useUsers } from '@/hooks/useData';
import { api } from '@/lib/api';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:            { bg:'#EDE9FE', text:'#5B21B6' },
  coordinator:      { bg:'#EBF2FF', text:'#1A56CC' },
  facility_manager: { bg:'#F0FDF4', text:'#166534' },
  hospital_user:    { bg:'#FFF7ED', text:'#9A3412' },
};

const BLANK = { name:'', email:'', password:'', role:'coordinator', organisation:'', phone:'' };

export default function UsersPage() {
  const { users, total, isLoading, mutate } = useUsers();
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ ...BLANK });
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  const rows: any[] = Array.isArray(users) ? users : [];

  const save = async () => {
    if (!form.name || !form.email || !form.password) { setErr('Name, email and password are required'); return; }
    setSaving(true); setErr('');
    try {
      await api.auth.register(form);
      await mutate();
      setShowForm(false); setForm({ ...BLANK });
    } catch (e: any) { setErr(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <Topbar
        title="Users"
        subtitle={`${total || rows.length} team members`}
        actions={<button className="btn btn-primary btn-sm" onClick={() => { setShowForm(true); setErr(''); }}>+ Add user</button>}
      />
      <div className="page-body fade-in">
        {isLoading && rows.length === 0 ? <PageLoader /> : rows.length === 0 ? (
          <EmptyState title="No users yet" />
        ) : (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>{['Name','Email','Role','Organisation','Last login','Active','Joined'].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((u: any) => {
                  const rc = ROLE_COLORS[u.role] ?? { bg:'var(--gray-100)', text:'var(--gray-600)' };
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight:500 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--brand-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--brand)', flexShrink:0 }}>
                            {u.name[0].toUpperCase()}
                          </div>
                          {u.name}
                        </div>
                      </td>
                      <td style={{ color:'var(--gray-500)' }}>{u.email}</td>
                      <td>
                        <span className="badge" style={{ background:rc.bg, color:rc.text, textTransform:'capitalize' }}>
                          {u.role.replace('_',' ')}
                        </span>
                      </td>
                      <td style={{ color:'var(--gray-500)' }}>{u.organisation ?? '—'}</td>
                      <td style={{ color:'var(--gray-400)' }}>{u.last_login_at ? fmtDate(u.last_login_at) : 'Never'}</td>
                      <td>
                        <span style={{ fontSize:12, fontWeight:600, color: u.is_active ? '#16A34A' : '#EF4444' }}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td style={{ color:'var(--gray-400)' }}>{fmtDate(u.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add User"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Spinner size={14} /> Saving…</> : 'Add user'}
          </button>
        </>}
      >
        {err && <div style={{ background:'#FEE2E2', color:'#991B1B', padding:'8px 12px', borderRadius:7, fontSize:13 }}>{err}</div>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="form-group" style={{ gridColumn:'1/-1' }}>
            <label className="form-label">Full name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name:e.target.value }))} placeholder="Sarah Johnson" />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email:e.target.value }))} placeholder="sarah@mmtcare.com.au" />
          </div>
          <div className="form-group">
            <label className="form-label">Password *</label>
            <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password:e.target.value }))} placeholder="Min 8 characters" />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role:e.target.value }))}>
              {['coordinator','facility_manager','hospital_user','admin'].map(r => (
                <option key={r} value={r}>{r.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Organisation</label>
            <input className="form-input" value={form.organisation} onChange={e => setForm(f => ({ ...f, organisation:e.target.value }))} placeholder="MMT Care Services" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
