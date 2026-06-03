'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const CARE_OPTIONS = [
  { key: 'personal_care',       label: 'Personal care',       icon: 'P' },
  { key: 'nursing',             label: 'Nursing support',     icon: 'N' },
  { key: 'behavioural_support', label: 'Behavioural support', icon: 'B' },
  { key: 'complex_medical',     label: 'Complex medical',     icon: 'C' },
  { key: 'overnight_support',   label: 'Overnight support',   icon: 'O' },
  { key: '24h_support',         label: '24h support',         icon: '24' },
];

const FACILITY_TYPES = [
  {
    type: 'SIL',
    name: 'Supported Independent Living',
    desc: 'Long-term accommodation with daily support staff to help with personal care, cooking, and community access.',
    icon: 'S',
    color: '#EBF2FF', border: '#1A56CC', text: '#1A56CC',
  },
  {
    type: 'SDA',
    name: 'Specialist Disability Accommodation',
    desc: 'Purpose-built housing designed for people with extreme functional impairment or very high support needs.',
    icon: 'D',
    color: '#F0FDF4', border: '#16A34A', text: '#166534',
  },
  {
    type: 'STA',
    name: 'Short-Term Accommodation',
    desc: 'Respite stays for NDIS participants, giving family carers a break while your loved one is well looked after.',
    icon: 'R',
    color: '#FFF7ED', border: '#F97316', text: '#9A3412',
  },
];

export default function FindHomePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [state, setState] = useState('');

  const STATES = ['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'];

  const handleSearch = () => {
    const params = new URLSearchParams();
    const q = search.trim();
    if (q) params.set('search', q);
    if (type) params.set('type', type);
    if (state) params.set('state', state);
    const query = params.toString();
    router.push(`/find/search${query ? `?${query}` : ''}`);
  };

  return (
    <div className="public-page-body">
      {/* Hero */}
      <div className="hero-section">
        <div className="hero-inner">
          <div style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.15)',
            borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600,
            color: '#fff', marginBottom: 20, letterSpacing: 0.5,
          }}>
            NDIS Accommodation Australia
          </div>
          <h1 className="hero-heading">
            Find the right home<br />for your loved one
          </h1>
          <p className="hero-copy">
            Search real-time NDIS accommodation vacancies across Australia.
            Submit a referral in minutes — no account needed.
          </p>

          {/* Search bar */}
          <div className="hero-controls-grid">
            <div className="hero-filter-row">
              <select value={type} onChange={e => setType(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.35)', background: '#fff', color: '#111827', fontSize: 15, cursor: 'pointer' }}>
                <option value="">Select type</option>
                <option value="SIL">SIL — Supported Living</option>
                <option value="SDA">SDA — Specialist Housing</option>
                <option value="STA">STA — Short-term / respite</option>
              </select>
              <select value={state} onChange={e => setState(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.35)', background: '#fff', color: '#111827', fontSize: 15, cursor: 'pointer' }}>
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="hero-search-bar">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by facility name, suburb or postcode…"
                style={{
                  flex: 1, padding: '16px 20px', fontSize: 15,
                  border: 'none', outline: 'none', color: '#1F2937',
                }}
              />
              <button onClick={handleSearch} style={{
                background: '#1A56CC', color: '#fff', border: 'none',
                padding: '16px 28px', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', flexShrink: 0,
              }}>
                Search
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div className="hero-quick-links">
            {['SIL', 'SDA', 'STA'].map(typeOption => (
              <button key={typeOption} onClick={() => router.push(`/find/search?type=${typeOption}`)}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff', borderRadius: 20, padding: '6px 14px', fontSize: 13,
                  cursor: 'pointer', fontWeight: 500,
                }}>
                {typeOption}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="section-block section-white">
        <div className="section-inner">
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>
            Finding a placement is simple
          </h2>
          <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 15, margin: '0 0 48px' }}>
            No appointments, no paperwork, no waiting on hold.
          </p>
          <div className="how-it-works-grid">
            {[
              { step: '1', title: 'Search vacancies', desc: 'Browse real-time bed availability filtered by care needs, location and accommodation type.' },
              { step: '2', title: 'Submit a referral', desc: 'Fill in a simple form about your loved one — no account needed. Takes less than 5 minutes.' },
              { step: '3', title: 'We contact you', desc: 'A coordinator reviews your referral and contacts you within 1 business day to discuss options.' },
            ].map(item => (
              <div key={item.step} style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: '#EBF2FF', margin: '0 auto 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  fontWeight: 700, color: '#1A56CC',
                }}>
                  {item.step}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1A56CC', letterSpacing: 0.7, marginBottom: 8 }}>
                  STEP {item.step}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accommodation types */}
      <div className="section-block section-blue">
        <div className="section-inner">
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>
            Types of NDIS accommodation
          </h2>
          <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 15, margin: '0 0 40px' }}>
            Not sure what type your loved one needs? We can help you work it out.
          </p>
          <div className="facility-type-grid">
            {FACILITY_TYPES.map(ft => (
              <div key={ft.type} style={{
                background: ft.color, borderRadius: 14,
                border: `1.5px solid ${ft.border}22`, padding: '24px',
                cursor: 'pointer',
              }} onClick={() => router.push(`/find/search?type=${ft.type}`)}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{ft.icon}</div>
                <div style={{
                  display: 'inline-block', background: '#fff',
                  borderRadius: 5, padding: '2px 8px', fontSize: 11,
                  fontWeight: 700, color: ft.text, marginBottom: 10,
                  border: `1px solid ${ft.border}44`,
                }}>{ft.type}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 8px', color: '#111827' }}>{ft.name}</h3>
                <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6, margin: '0 0 16px' }}>{ft.desc}</p>
                <span style={{ fontSize: 13, fontWeight: 600, color: ft.text }}>Search {ft.type} vacancies →</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Care needs explainer */}
      <div className="section-block section-white">
        <div className="section-inner section-split">
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 12px', color: '#111827' }}>
              Filter by your loved one's care needs
            </h2>
            <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.7, margin: '0 0 24px' }}>
              Every person is different. Our search lets you find accommodation that specifically
              supports your loved one's care requirements — so you only see facilities that are actually suitable.
            </p>
            <button onClick={() => router.push('/find/search')} style={{
              background: '#1A56CC', color: '#fff', border: 'none', borderRadius: 10,
              padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
              Search by care needs
            </button>
          </div>
          <div className="care-options-grid">
            {CARE_OPTIONS.map(opt => (
              <div key={opt.key} style={{
                background: '#F8FAFF', borderRadius: 10, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                border: '0.5px solid #E5E7EB',
              }}>
                <span style={{ fontSize: 20 }}>{opt.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{opt.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Urgency CTA */}
      <div style={{ background: '#1A3A8F', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: '#FEE2E2', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991B1B', fontSize: 24, fontWeight: 700 }}>
            !
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>
            Need urgent placement?
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', margin: '0 0 28px' }}>
            If your loved one needs accommodation urgently — hospital discharge, unsafe living situation,
            or carer breakdown — submit an urgent referral now and we'll prioritise it immediately.
          </p>
          <button onClick={() => router.push('/find/submit?urgency=immediate')} style={{
            background: '#fff', color: '#1A3A8F', border: 'none',
            borderRadius: 10, padding: '14px 32px', fontSize: 16,
            fontWeight: 800, cursor: 'pointer',
          }}>
            Submit urgent referral
          </button>
        </div>
      </div>
    </div>
  );
}
