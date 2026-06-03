'use client';
import { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { FacilityTypeBadge, VacancyBadge, Modal, PageLoader, EmptyState, Spinner, SectionHeader } from '@/components/ui';
import { useFacilities } from '@/hooks/useData';
import { api, resolvePublicImage } from '@/lib/api';
import { refreshFacilities } from '@/hooks/useData';

const CARE_OPTIONS = [
  { key:'personal_care',       label:'Personal care' },
  { key:'nursing',             label:'Nursing' },
  { key:'behavioural_support', label:'Behavioural support' },
  { key:'complex_medical',     label:'Complex medical' },
  { key:'overnight_support',   label:'Overnight support' },
  { key:'24h_support',         label:'24h support' },
];

const BLANK_FAC = { name:'', type:'SIL', address:'', suburb:'', state:'', postcode:'', contact_name:'', contact_email:'', contact_phone:'', description:'', capacity:'1' };
const BLANK_VAC = { label:'', start_date: new Date().toISOString().slice(0,10), notes:'', care_level_supported:{} as Record<string,boolean> };

const VAC_DOT: Record<string, string> = { available:'#16A34A', reserved:'#EAB308', occupied:'#EF4444' };

export default function FacilitiesPage() {
  const { facilities, total, isLoading, mutate } = useFacilities();
  const [selected,  setSelected]  = useState<any>(null);
  const [showFac,   setShowFac]   = useState(false);
  const [showVac,   setShowVac]   = useState(false);
  const [facForm,   setFacForm]   = useState({ ...BLANK_FAC });
  const [vacForm,   setVacForm]   = useState({ ...BLANK_VAC });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [toggling,  setToggling]  = useState<string|null>(null);
  const [err,       setErr]       = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const rows: any[] = Array.isArray(facilities) ? facilities : (facilities as any)?.data ?? [];
  const visible = typeFilter === 'all' ? rows : rows.filter((f:any) => f.type === typeFilter);

  useEffect(() => {
    const urls = imageFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [imageFiles]);

  const saveFacility = async () => {
    if (!facForm.name || !facForm.type || !facForm.address || !facForm.suburb || !facForm.state) {
      setErr('Name, type, address, suburb and state are required'); return;
    }
    setSaving(true); setErr('');
    try {
      const created = await api.facilities.create({ ...facForm, capacity: parseInt(facForm.capacity || '1') });
      const facility = created.data;
      if (imageFiles.length) {
        const form = new FormData();
        imageFiles.forEach(file => form.append('images', file));
        await api.facilities.uploadImages(facility.id, form);
      }
      await mutate(); refreshFacilities();
      setShowFac(false); setFacForm({ ...BLANK_FAC });
      setImageFiles([]); setImagePreviews([]);
    } catch (e:any) { setErr(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const saveVacancy = async () => {
    if (!selected) return;
    setSaving(true); setErr('');
    try {
      await api.facilities.createVacancy(selected.id, vacForm);
      const updated = await api.facilities.get(selected.id);
      setSelected(updated.data);
      await mutate(); refreshFacilities();
      setShowVac(false); setVacForm({ ...BLANK_VAC });
    } catch (e:any) { setErr(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleVacancy = async (vacId: string, current: string) => {
    const next = current === 'available' ? 'occupied' : current === 'occupied' ? 'available' : 'available';
    setToggling(vacId);
    try {
      await api.facilities.vacancyStatus(vacId, next);
      const updated = await api.facilities.get(selected.id);
      setSelected(updated.data);
      await mutate();
    } finally { setToggling(null); }
  };

  const totalAvail = rows.reduce((n: number, f: any) => n + (f.vacancies ?? []).filter((v:any) => v.status==='available').length, 0);

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <Topbar
          title="Facilities"
          subtitle={`${total || rows.length} facilities · ${totalAvail} beds available`}
          actions={<button className="btn btn-primary btn-sm" onClick={() => { setShowFac(true); setErr(''); }}>+ Add facility</button>}
        />

        {/* Type filter */}
        <div style={{ background:'#fff', borderBottom:'0.5px solid var(--gray-200)', padding:'10px 20px', display:'flex', gap:8 }}>
          {['all','SIL','SDA','STA'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600,
              cursor:'pointer', border:'none', transition:'all 0.12s',
              background: typeFilter === t ? 'var(--brand)' : 'var(--gray-100)',
              color: typeFilter === t ? '#fff' : 'var(--gray-600)',
            }}>
              {t === 'all' ? 'All types' : t}
            </button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:16 }}>
          {isLoading && rows.length === 0 ? <PageLoader /> : rows.length === 0 ? (
            <EmptyState title="No facilities yet" message="Add your first facility to get started."
              action={<button className="btn btn-primary" onClick={() => setShowFac(true)}>+ Add facility</button>}
            />
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:14 }}>
              {visible.map((f:any) => {
                const vacancies = f.vacancies ?? [];
                const avail = vacancies.filter((v:any) => v.status==='available').length;
                const occ   = vacancies.filter((v:any) => v.status==='occupied').length;
                const pct   = vacancies.length > 0 ? Math.round(occ/vacancies.length*100) : 0;
                const isSelected = selected?.id === f.id;
                const imageSrc = resolvePublicImage(f.image_urls?.[0] || f.image_url);

                return (
                  <div key={f.id} className="card" onClick={() => setSelected(isSelected ? null : f)}
                    style={{ cursor:'pointer', border: isSelected ? '1.5px solid var(--brand)' : '0.5px solid var(--gray-200)', transition:'all 0.15s' }}>
                    {imageSrc && (
                      <div style={{ width:'100%', height:140, overflow:'hidden', borderRadius:14, marginBottom:10, background:'#F3F4F6' }}>
                        <img src={imageSrc} alt={`${f.name} image`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      </div>
                    )}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                          <FacilityTypeBadge type={f.type} />
                          <span style={{ fontSize:11, color:'var(--gray-400)' }}>{f.suburb}, {f.state}</span>
                        </div>
                        <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:14 }}>{f.name}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:700, lineHeight:1, color: avail > 0 ? '#16A34A' : '#EF4444' }}>{avail}</div>
                        <div style={{ fontSize:10, color:'var(--gray-400)' }}>/{vacancies.length} avail.</div>
                      </div>
                    </div>

                    <div style={{ marginBottom:10 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--gray-400)', marginBottom:3 }}>
                        <span>Occupancy</span><span>{pct}%</span>
                      </div>
                      <div style={{ height:4, background:'var(--gray-100)', borderRadius:3 }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:'var(--brand)', borderRadius:3 }} />
                      </div>
                    </div>

                    {/* Vacancy dots */}
                    <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                      {vacancies.map((v:any) => (
                        <div key={v.id} title={`${v.label ?? 'Bed'} — ${v.status}`}
                          style={{ width:24, height:24, borderRadius:5, background: VAC_DOT[v.status]+'22', display:'flex', alignItems:'center', justifyContent:'center', cursor:'default' }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background: VAC_DOT[v.status] }} />
                        </div>
                      ))}
                      {vacancies.length === 0 && <span style={{ fontSize:11, color:'var(--gray-300)' }}>No beds yet</span>}
                    </div>

                    {f.contact_phone && <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:8 }}>Tel: {f.contact_phone}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ width:320, background:'#fff', borderLeft:'0.5px solid var(--gray-200)', overflowY:'auto', flexShrink:0 }}>
          <div style={{ padding:'14px 16px', borderBottom:'0.5px solid var(--gray-200)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h2 style={{ fontSize:14, margin:0 }}>Vacancy management</h2>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button className="btn btn-primary btn-sm" onClick={() => { setShowVac(true); setErr(''); }}>+ Add bed</button>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--gray-400)' }}>✕</button>
            </div>
          </div>
          <div style={{ padding:'14px 16px' }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{selected.name}</div>
            <FacilityTypeBadge type={selected.type} />
            {(selected.image_urls?.length ?? 0) > 0 && (
              <div style={{ marginTop:10, fontSize:11, color:'var(--gray-500)' }}>
                {selected.image_urls.length} photo{selected.image_urls.length !== 1 ? 's' : ''} uploaded
              </div>
            )}
            {selected.description && <p style={{ fontSize:12, color:'var(--gray-500)', marginTop:8, lineHeight:1.5 }}>{selected.description}</p>}

            <div style={{ marginTop:14, display:'flex', flexDirection:'column', gap:6 }}>
              {(selected.vacancies ?? []).map((v:any, i:number) => (
                <div key={v.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'var(--gray-50)', borderRadius:7 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: VAC_DOT[v.status], flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500 }}>{v.label ?? `Bed ${i+1}`}</div>
                  </div>
                  <VacancyBadge status={v.status} />
                  <button onClick={() => toggleVacancy(v.id, v.status)} disabled={toggling === v.id}
                    className="btn btn-secondary btn-sm" style={{ fontSize:10, padding:'3px 7px' }}>
                    {toggling === v.id ? <Spinner size={10} /> : 'Toggle'}
                  </button>
                </div>
              ))}
              {(selected.vacancies ?? []).length === 0 && (
                <div style={{ textAlign:'center', color:'var(--gray-300)', fontSize:12, padding:'16px 0' }}>No beds configured yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Facility Modal */}
      <Modal open={showFac} onClose={() => { setShowFac(false); setImageFiles([]); setImagePreviews([]); }} title="Add Facility"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowFac(false); setImageFiles([]); setImagePreviews([]); }}>Cancel</button>
          <button className="btn btn-primary" onClick={saveFacility} disabled={saving}>
            {saving ? <><Spinner size={14} /> Saving…</> : 'Add facility'}
          </button>
        </>}
      >
        {err && <div style={{ background:'#FEE2E2', color:'#991B1B', padding:'8px 12px', borderRadius:7, fontSize:13 }}>{err}</div>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div className="form-group" style={{ gridColumn:'1/-1' }}>
            <label className="form-label">Facility name *</label>
            <input className="form-input" value={facForm.name} onChange={e => setFacForm(f => ({ ...f, name:e.target.value }))} placeholder="Harbour View House" />
          </div>
          <div className="form-group">
            <label className="form-label">Type *</label>
            <select className="form-select" value={facForm.type} onChange={e => setFacForm(f => ({ ...f, type:e.target.value }))}>
              {['SIL','SDA','STA'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Capacity</label>
            <input className="form-input" type="number" min={1} value={facForm.capacity} onChange={e => setFacForm(f => ({ ...f, capacity:e.target.value }))} />
          </div>
          <div className="form-group" style={{ gridColumn:'1/-1' }}>
            <label className="form-label">Street address *</label>
            <input className="form-input" value={facForm.address} onChange={e => setFacForm(f => ({ ...f, address:e.target.value }))} placeholder="12 Example St" />
          </div>
          <div className="form-group">
            <label className="form-label">Suburb *</label>
            <input className="form-input" value={facForm.suburb} onChange={e => setFacForm(f => ({ ...f, suburb:e.target.value }))} placeholder="Manly" />
          </div>
          <div className="form-group">
            <label className="form-label">State *</label>
            <select className="form-select" value={facForm.state} onChange={e => setFacForm(f => ({ ...f, state:e.target.value }))}>
              <option value="">Select…</option>
              {['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Contact phone</label>
            <input className="form-input" value={facForm.contact_phone} onChange={e => setFacForm(f => ({ ...f, contact_phone:e.target.value }))} placeholder="02 9000 1234" />
          </div>
          <div className="form-group">
            <label className="form-label">Contact email</label>
            <input className="form-input" type="email" value={facForm.contact_email} onChange={e => setFacForm(f => ({ ...f, contact_email:e.target.value }))} placeholder="manager@facility.com.au" />
          </div>
          <div className="form-group" style={{ gridColumn:'1/-1' }}>
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={facForm.description} onChange={e => setFacForm(f => ({ ...f, description:e.target.value }))} placeholder="Brief description of the facility…" />
          </div>
          <div className="form-group" style={{ gridColumn:'1/-1' }}>
            <label className="form-label">Facility photos</label>
            <input type="file" className="form-input" accept="image/*" multiple onChange={e => setImageFiles(Array.from(e.target.files || []))} />
            {imagePreviews.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:10, marginTop:10 }}>
                {imagePreviews.map((src, index) => (
                  <div key={index} style={{ borderRadius:12, overflow:'hidden', minHeight:90, background:'#F8FAFC' }}>
                    <img src={src} alt={`Preview ${index + 1}`} style={{ width:'100%', height:120, objectFit:'cover' }} />
                  </div>
                ))}
              </div>
            )}
            <p style={{ fontSize:12, color:'var(--gray-500)', marginTop:6 }}>Upload one or more photos for the facility gallery.</p>
          </div>
        </div>
      </Modal>

      {/* Add Vacancy Modal */}
      <Modal open={showVac} onClose={() => setShowVac(false)} title={`Add Bed — ${selected?.name ?? ''}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowVac(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveVacancy} disabled={saving}>
            {saving ? <><Spinner size={14} /> Saving…</> : 'Add bed'}
          </button>
        </>}
      >
        {err && <div style={{ background:'#FEE2E2', color:'#991B1B', padding:'8px 12px', borderRadius:7, fontSize:13 }}>{err}</div>}
        <div className="form-group">
          <label className="form-label">Bed label</label>
          <input className="form-input" value={vacForm.label} onChange={e => setVacForm(f => ({ ...f, label:e.target.value }))} placeholder="Room A – Ground floor, ensuite" />
        </div>
        <div className="form-group">
          <label className="form-label">Available from</label>
          <input className="form-input" type="date" value={vacForm.start_date} onChange={e => setVacForm(f => ({ ...f, start_date:e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Care levels supported</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {CARE_OPTIONS.map(o => (
              <label key={o.key} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:13, padding:'6px 10px', borderRadius:6, background: vacForm.care_level_supported[o.key] ? 'var(--brand-light)' : 'var(--gray-50)', border:`0.5px solid ${vacForm.care_level_supported[o.key] ? 'var(--brand)' : 'var(--gray-200)'}`, color: vacForm.care_level_supported[o.key] ? 'var(--brand)' : 'var(--gray-700)' }}>
                <input type="checkbox" checked={!!vacForm.care_level_supported[o.key]} onChange={() => setVacForm(f => ({ ...f, care_level_supported:{ ...f.care_level_supported, [o.key]:!f.care_level_supported[o.key] } }))} style={{ width:14, height:14 }} />
                {o.label}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={vacForm.notes} onChange={e => setVacForm(f => ({ ...f, notes:e.target.value }))} placeholder="Accessibility features, restrictions…" style={{ minHeight:60 }} />
        </div>
      </Modal>
    </div>
  );
}
