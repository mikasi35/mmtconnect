'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function normalizeApiBase(raw: string) {
  const base = raw.trim().replace(/\/+$|\s+$/g, '');
  if (/\/api\/v1$/i.test(base)) return base;
  if (/\/api$/i.test(base)) return base.replace(/\/api$/i, '/api/v1');
  return `${base}/api/v1`;
}

const API = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL ?? 'https://vacancies.mmtcare.com.au/api/v1');

const CARE_OPTIONS = [
  { key: 'personal_care',       label: 'Personal care',       desc: 'Help with showering, dressing, grooming, meals', icon: 'P' },
  { key: 'nursing',             label: 'Nursing support',     desc: 'Wound care, medication, clinical monitoring',     icon: 'N' },
  { key: 'behavioural_support', label: 'Behavioural support', desc: 'Support for challenging behaviours',              icon: 'B' },
  { key: 'complex_medical',     label: 'Complex medical',     desc: 'Ventilators, feeding tubes, high medical needs',  icon: 'C' },
  { key: 'overnight_support',   label: 'Overnight support',   desc: 'Support worker available through the night',      icon: 'O' },
  { key: '24h_support',         label: '24h active support',  desc: 'Round-the-clock active supervision required',     icon: '24' },
];

const URGENCY_OPTIONS = [
  { value: 'low',       label: 'No urgency',    desc: 'Planning ahead, no set timeline',      color: '#16A34A', bg: '#DCFCE7' },
  { value: 'medium',    label: 'Within 1 month', desc: 'Current situation manageable short-term', color: '#854D0E', bg: '#FEF9C3' },
  { value: 'high',      label: 'Within 2 weeks', desc: 'Situation is difficult and needs resolution soon', color: '#9A3412', bg: '#FFEDD5' },
  { value: 'immediate', label: 'Urgent (now)',   desc: 'Hospital discharge, unsafe situation or carer breakdown', color: '#991B1B', bg: '#FEE2E2' },
];

const RELATIONSHIPS = ['Parent','Sibling','Child (adult)','Spouse / Partner','Guardian','Support coordinator','Other family member','Carer/Support worker','Self'];

function SubmitContent() {
  const sp = useSearchParams();
  const router = useRouter();

  // Pre-fill from search page
  const [prefacilityId]   = useState(sp.get('facility') ?? '');
  const [prefacilityName] = useState(sp.get('name') ?? '');

  const [step, setStep] = useState(1); // 1: about person, 2: care needs, 3: your details, 4: submitted

  // Form fields
  const [clientName,      setClientName]      = useState('');
  const [clientAge,       setClientAge]       = useState('');
  const [urgency,         setUrgency]         = useState(sp.get('urgency') ?? 'medium');
  const [locPref,         setLocPref]         = useState('');
  const [careNeeds,       setCareNeeds]       = useState<Record<string,boolean>>({});
  const [notes,           setNotes]           = useState('');
  const [submitterName,   setSubmitterName]   = useState('');
  const [submitterEmail,  setSubmitterEmail]  = useState('');
  const [submitterPhone,  setSubmitterPhone]  = useState('');
  const [relationship,    setRelationship]    = useState('');
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');
  const [result,          setResult]          = useState<any>(null);

  const toggleCare = (key: string) => setCareNeeds(p => ({ ...p, [key]: !p[key] }));
  const selectedCareCount = Object.values(careNeeds).filter(Boolean).length;

  const validateStep = () => {
    if (step === 1) {
      if (!clientName.trim()) { setError('Please enter the name of the person needing care'); return false; }
      if (!clientAge)         { setError('Please enter their age'); return false; }
    }
    if (step === 3) {
      if (!submitterName.trim()) { setError('Please enter your name'); return false; }
      if (!submitterEmail.trim()) { setError('Please provide an email so we can send your referral tracking code'); return false; }
    }
    setError('');
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const back = () => { setError(''); setStep(s => s - 1); };

  const submit = async () => {
    if (!validateStep()) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API}/public/referrals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: clientName,
          client_age:  parseInt(clientAge),
          care_needs:  careNeeds,
          urgency,
          location_preference: locPref || undefined,
          submitter_name:         submitterName,
          submitter_email:        submitterEmail || undefined,
          submitter_phone:        submitterPhone || undefined,
          submitter_relationship: relationship   || undefined,
          notes:                  notes          || undefined,
          preferred_facility_id:  prefacilityId  || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Submission failed');
      }
      const json = await res.json();
      setResult(json.data);
      setStep(4);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally { setSaving(false); }
  };

  const steps = [
    { n: 1, label: 'About them' },
    { n: 2, label: 'Care needs' },
    { n: 3, label: 'Your details' },
  ];

  if (step === 4 && result) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#DCFCE7', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✓</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 12px' }}>Referral submitted!</h1>
        <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, margin: '0 0 28px' }}>
          Thank you. A coordinator will review {result.client_name}'s referral and contact you within 1 business day.
        </p>

        <div style={{ background: '#F8FAFF', borderRadius: 14, padding: '20px 24px', border: '1.5px solid #EBF2FF', marginBottom: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.7, marginBottom: 12, textTransform: 'uppercase' }}>Your tracking details</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1A56CC', letterSpacing: 2, marginBottom: 8, fontFamily: 'monospace' }}>
            {result.tracking_id}
          </div>
          <div style={{ fontSize: 13, color: '#6B7280' }}>
            Save this code. You can use it to track the status of your referral at any time.
          </div>
        </div>

        {urgency === 'immediate' && (
          <div style={{ background: '#FEE2E2', borderRadius: 12, padding: '14px 18px', marginBottom: 20, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B', marginBottom: 4 }}>Urgent referral received</div>
            <div style={{ fontSize: 13, color: '#991B1B' }}>Your referral has been flagged as urgent. A coordinator will contact you as soon as possible — usually within a few hours during business hours.</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => router.push('/find/track')} style={{ background: '#1A56CC', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Track my referral
          </button>
          <button onClick={() => router.push('/find/search')} style={{ background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 9, padding: '11px 22px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Search more
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-width-constrained">
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>Submit a referral</h1>
      <p style={{ color: '#6B7280', margin: '0 0 28px', fontSize: 15 }}>
        No account needed. A coordinator will contact you within 1 business day.
      </p>

      {prefacilityName && (
        <div style={{ background: '#EBF2FF', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#fff', color: '#1A56CC', fontSize: 14, fontWeight: 700 }}>F</span>
          <div style={{ fontSize: 13, color: '#1A56CC' }}>
            <span style={{ fontWeight: 700 }}>Requesting:</span> {prefacilityName}
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: i === 0 ? 'flex-start' : i === steps.length - 1 ? 'flex-end' : 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                background: step > s.n ? '#1A56CC' : step === s.n ? '#1A56CC' : '#E5E7EB',
                color: step >= s.n ? '#fff' : '#9CA3AF',
              }}>
                {step > s.n ? '✓' : s.n}
              </div>
              <div style={{ fontSize: 11, color: step >= s.n ? '#1A56CC' : '#9CA3AF', marginTop: 4, fontWeight: step === s.n ? 600 : 400 }}>
                {s.label}
              </div>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: step > s.n ? '#1A56CC' : '#E5E7EB', margin: '0 4px', marginTop: -14 }} />}
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #E5E7EB', padding: '28px 28px' }}>

        {/* Step 1: About the person */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111827' }}>About the person needing care</h2>

            <div className="responsive-two-col">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Their full name *</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. James Thompson"
                  style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Their age *</label>
                <input value={clientAge} onChange={e => setClientAge(e.target.value)} placeholder="42" type="number" min={0} max={120}
                  style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 8 }}>How urgent is placement?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {URGENCY_OPTIONS.map(opt => (
                  <div key={opt.value} onClick={() => setUrgency(opt.value)} style={{
                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    border: `${urgency === opt.value ? '2px' : '1px'} solid ${urgency === opt.value ? opt.color : '#E5E7EB'}`,
                    background: urgency === opt.value ? opt.bg : '#fff',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: opt.color, marginBottom: 3 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Preferred location <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
              <input value={locPref} onChange={e => setLocPref(e.target.value)} placeholder="e.g. Sydney, NSW or leave blank for anywhere"
                style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
        )}

        {/* Step 2: Care needs */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#111827' }}>What care do they need?</h2>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Select all that apply. Not sure? That's okay — just skip this step and a coordinator will discuss it with you.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CARE_OPTIONS.map(opt => {
                const active = !!careNeeds[opt.key];
                return (
                  <div key={opt.key} onClick={() => toggleCare(opt.key)} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                    border: `${active ? '2px' : '1px'} solid ${active ? '#1A56CC' : '#E5E7EB'}`,
                    background: active ? '#EBF2FF' : '#fff', transition: 'all 0.1s',
                  }}>
                    <span style={{ fontSize: 24 }}>{opt.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: active ? '#1A56CC' : '#111827' }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{opt.desc}</div>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: active ? '#1A56CC' : '#F3F4F6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {active && <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                Additional notes <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any other details about your loved one's needs, current situation or preferences…"
                style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', minHeight: 80, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>
        )}

        {/* Step 3: Submitter details */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#111827' }}>Your contact details</h2>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>So our coordinator can reach you. We'll never share your details.</p>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Your name *</label>
              <input value={submitterName} onChange={e => setSubmitterName(e.target.value)} placeholder="Mary Thompson"
                style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Your relationship to them</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {RELATIONSHIPS.map(r => (
                  <button key={r} onClick={() => setRelationship(r)} style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', border: `1.5px solid ${relationship === r ? '#1A56CC' : '#E5E7EB'}`,
                    background: relationship === r ? '#EBF2FF' : '#fff',
                    color: relationship === r ? '#1A56CC' : '#4B5563',
                  }}>{r}</button>
                ))}
              </div>
            </div>

            <div className="responsive-grid-2">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Email address</label>
                <input value={submitterEmail} onChange={e => setSubmitterEmail(e.target.value)} placeholder="mary@example.com" type="email"
                  style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Phone number</label>
                <input value={submitterPhone} onChange={e => setSubmitterPhone(e.target.value)} placeholder="0400 123 456" type="tel"
                  style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>* Please provide at least one — email or phone</p>

            {/* Summary */}
            <div style={{ background: '#F8FAFF', borderRadius: 10, padding: '14px 16px', border: '0.5px solid #E5E7EB' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Referral summary</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 13 }}><span style={{ color: '#6B7280' }}>For:</span> <span style={{ fontWeight: 600 }}>{clientName}</span>, age {clientAge}</div>
                <div style={{ fontSize: 13 }}><span style={{ color: '#6B7280' }}>Urgency:</span> {URGENCY_OPTIONS.find(u => u.value === urgency)?.label}</div>
                {locPref && <div style={{ fontSize: 13 }}><span style={{ color: '#6B7280' }}>Location:</span> {locPref}</div>}
                {selectedCareCount > 0 && <div style={{ fontSize: 13 }}><span style={{ color: '#6B7280' }}>Care needs:</span> {selectedCareCount} selected</div>}
                {prefacilityName && <div style={{ fontSize: 13 }}><span style={{ color: '#6B7280' }}>Requested:</span> {prefacilityName}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginTop: 14 }}>
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="step-actions" style={{ marginTop: 24 }}>
          {step > 1 ? (
            <button onClick={back} type="button" style={{ background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 9, padding: '11px 22px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              ← Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button onClick={next} type="button" style={{ background: '#1A56CC', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Next →
            </button>
          ) : (
            <button onClick={submit} type="button" disabled={saving} style={{ background: saving ? '#9CA3AF' : '#1A56CC', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 28px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', minWidth: 170, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {saving ? <><span className="spinner" /></> : null}
              {saving ? 'Submitting…' : 'Submit referral ✓'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px 24px', textAlign: 'center', color: '#9CA3AF' }}>Loading…</div>}>
      <SubmitContent />
    </Suspense>
  );
}
