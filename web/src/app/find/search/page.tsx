'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { resolvePublicImage, API_BASE } from '@/lib/api';
import { CareNeedIcon } from '@/components/ui';

const API = API_BASE;

const CARE_OPTIONS = [
  { key: 'personal_care',       label: 'Personal care',       icon: 'P' },
  { key: 'nursing',             label: 'Nursing support',     icon: 'N' },
  { key: 'behavioural_support', label: 'Behavioural support', icon: 'B' },
  { key: 'complex_medical',     label: 'Complex medical',     icon: 'C' },
  { key: 'overnight_support',   label: 'Overnight support',   icon: 'O' },
  { key: '24h_support',         label: '24h support',         icon: '24' },
];

const STATES = ['NSW','VIC','QLD','WA','SA','TAS','ACT','NT'];
const CARE_LABELS: Record<string,string> = {
  personal_care:'Personal care', nursing:'Nursing',
  behavioural_support:'Behavioural support', complex_medical:'Complex medical',
  overnight_support:'Overnight support', '24h_support':'24h support',
};
const TYPE_STYLE: Record<string,{bg:string,text:string,border:string}> = {
  SIL:{bg:'#EBF2FF',text:'#1A56CC',border:'#1A56CC'},
  SDA:{bg:'#F0FDF4',text:'#166534',border:'#16A34A'},
  STA:{bg:'#FFF7ED',text:'#9A3412',border:'#F97316'},
};

function SearchContent() {
  const sp = useSearchParams();
  const router = useRouter();

  const [search,      setSearch]      = useState(sp.get('search') ?? '');
  const [type,        setType]        = useState(sp.get('type')   ?? '');
  const [state,       setState]       = useState(sp.get('state')  ?? '');
  const [careNeeds,   setCareNeeds]   = useState<Record<string,boolean>>({});
  const [results,     setResults]     = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [searched,    setSearched]    = useState(false);

  // Google Places integration can be enabled once a valid API key is available.
  // It would turn typed locations into latitude/longitude and support autocomplete.
  // const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  // async function fetchPlaceSuggestions(query: string) {
  //   const response = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`);
  //   return response.json();
  // }

  const doSearch = useCallback(async () => {
    setLoading(true); setSearched(true);
    try {
      const params = new URLSearchParams();
      if (search)  params.set('search', search);
      if (type)    params.set('type',   type);
      if (state)   params.set('state',  state);
      const selectedNeeds = Object.entries(careNeeds).filter(([,v]) => v).map(([k]) => k);
      if (selectedNeeds.length) params.set('care_needs', selectedNeeds.join(','));

      const res = await fetch(`${API}/public/facilities?${params}`);
      const json = await res.json();
      setResults(Array.isArray(json.data) ? json.data : []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [search, type, state, careNeeds]);

  // Auto-search on load if params exist
  useEffect(() => {
    if (sp.get('search') || sp.get('type') || sp.get('state')) doSearch();
  }, [sp, doSearch]);

  const toggleCare = (key: string) => setCareNeeds(p => ({ ...p, [key]: !p[key] }));
  const selectedCareCount = Object.values(careNeeds).filter(Boolean).length;

  return (
    <div className="public-page-body">
      <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
        Find NDIS accommodation
      </h1>
      <p style={{ color: '#6B7280', margin: '0 0 28px', fontSize: 15 }}>
        Search real-time vacancies. All results show beds available today.
      </p>

      {/* Search filters */}
      <div className="search-panel">
        <div className="search-panel-grid">
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Search</label>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Type, suburb or facility name…"
              style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Type</label>
            <select value={type} onChange={e => setType(e.target.value)}
              style={{ padding: '9px 12px', border: '0.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', cursor: 'pointer' }}>
              <option value="">All types</option>
              <option value="SIL">SIL — Supported Living</option>
              <option value="SDA">SDA — Specialist Housing</option>
              <option value="STA">STA — Respite/Short-term</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>State</label>
            <select value={state} onChange={e => setState(e.target.value)}
              style={{ padding: '9px 12px', border: '0.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, outline: 'none', background: '#fff', cursor: 'pointer' }}>
              <option value="">All states</option>
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={doSearch} style={{
            background: '#1A56CC', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 24px', fontSize: 14,
            fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        {/* Care needs toggles */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>
            Care needs {selectedCareCount > 0 && <span style={{ color: '#1A56CC' }}>({selectedCareCount} selected)</span>}
          </div>
          <div className="search-care-buttons">
            {CARE_OPTIONS.map(opt => {
              const active = !!careNeeds[opt.key];
              return (
                <button key={opt.key} onClick={() => toggleCare(opt.key)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', border: `1.5px solid ${active ? '#1A56CC' : '#E5E7EB'}`,
                  background: active ? '#EBF2FF' : '#F9FAFB',
                  color: active ? '#1A56CC' : '#4B5563',
                  transition: 'all 0.12s',
                }}>
                  <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: active ? '#fff' : '#EFF6FF' }}>
                    <CareNeedIcon name={opt.key} size={18} color={active ? '#1A56CC' : '#4B5563'} />
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        {/* Results */}
        <div>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
              <div style={{ width: 40, height: 40, margin: '0 auto 12px', borderRadius: 20, background: '#E5E7EB' }} />
              <div style={{ fontSize: 15 }}>Searching for available beds…</div>
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 40, height: 40, margin: '0 auto 16px', borderRadius: 20, background: '#F3F4F6' }} />
              <h3 style={{ fontSize: 18, color: '#111827', margin: '0 0 8px' }}>No vacancies found</h3>
              <p style={{ color: '#6B7280', margin: '0 0 24px', fontSize: 14 }}>
                Try broadening your search — remove some care filters or search a different state.
              </p>
              <button onClick={() => router.push('/find/submit')} style={{
                background: '#1A56CC', color: '#fff', border: 'none',
                borderRadius: 10, padding: '12px 24px', fontSize: 14,
                fontWeight: 700, cursor: 'pointer',
              }}>
                Submit a referral anyway — we'll find something
              </button>
            </div>
          )}

          {!loading && !searched && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9CA3AF' }}>
              <div style={{ width: 40, height: 40, margin: '0 auto 16px', borderRadius: 20, background: '#E5E7EB' }} />
              <div style={{ fontSize: 15 }}>Enter a location or select filters above to search for available accommodation.</div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 14, fontWeight: 500 }}>
                {results.length} facilit{results.length === 1 ? 'y' : 'ies'} with available beds
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results.map((f: any) => {
                  const ts = TYPE_STYLE[f.type] ?? TYPE_STYLE.SIL;
                  const supportedNeeds = Object.entries(f.supported_care ?? {}).filter(([,v]) => v).map(([k]) => k);

                  return (
                    <div key={f.id} onClick={() => router.push(`/find/facilities/${f.id}`)} style={{
                      background: '#fff', borderRadius: 14,
                      border: '0.5px solid #E5E7EB',
                      padding: '18px 20px', cursor: 'pointer', transition: 'all 0.12s',
                    }}>
                      {(f.image_urls?.[0] || f.image_url) && (
                        <div style={{ marginBottom: 14, overflow: 'hidden', borderRadius: 14, height: 160, background: '#F3F4F6' }}>
                          <img src={resolvePublicImage(f.image_urls?.[0] || f.image_url)} alt={`${f.name} image`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                              background: ts.bg, color: ts.text, border: `1px solid ${ts.border}33`,
                            }}>{f.type}</span>
                            <span style={{ fontSize: 12, color: '#9CA3AF' }}>{f.suburb}, {f.state}</span>
                          </div>
                          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: '#111827' }}>{f.name}</h3>
                          {f.description && (
                            <p style={{ fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                              {f.description.slice(0, 120)}{f.description.length > 120 ? '…' : ''}
                            </p>
                          )}
                        </div>
                        <div style={{ textAlign: 'center', marginLeft: 16, flexShrink: 0 }}>
                          <div style={{ fontSize: 28, fontWeight: 800, color: parseInt(f.available_beds) > 0 ? '#16A34A' : '#EF4444', lineHeight: 1 }}>
                            {f.available_beds}
                          </div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                            bed{parseInt(f.available_beds) !== 1 ? 's' : ''} avail.
                          </div>
                        </div>
                      </div>

                      {/* Supported care needs */}
                      {supportedNeeds.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                          {supportedNeeds.slice(0, 5).map(k => (
                            <span key={k} style={{ fontSize: 11, fontWeight: 500, background: '#F0FDF4', color: '#166534', padding: '2px 7px', borderRadius: 4, border: '0.5px solid #86EFAC' }}>
                              ✓ {CARE_LABELS[k] ?? k}
                            </span>
                          ))}
                          {supportedNeeds.length > 5 && <span style={{ fontSize: 11, color: '#9CA3AF' }}>+{supportedNeeds.length - 5} more</span>}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                          {f.contact_phone && `Tel: ${f.contact_phone}`}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={e => { e.stopPropagation(); router.push(`/find/submit?facility=${f.id}&name=${encodeURIComponent(f.name)}`); }}
                            style={{
                              background: '#1A56CC', color: '#fff', border: 'none',
                              borderRadius: 7, padding: '7px 14px', fontSize: 13,
                              fontWeight: 700, cursor: 'pointer',
                            }}>
                            Request this bed
                          </button>
                          <button onClick={e => { e.stopPropagation(); router.push(`/find/facilities/${f.id}`); }} style={{
                            background: '#F3F4F6', color: '#374151', border: 'none',
                            borderRadius: 7, padding: '7px 14px', fontSize: 13,
                            fontWeight: 500, cursor: 'pointer',
                          }}>
                            View details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 28, background: '#EBF2FF', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A56CC', marginBottom: 3 }}>Can't find what you need?</div>
                  <div style={{ fontSize: 13, color: '#4B5563' }}>Submit a referral and our coordinators will search their full network for you.</div>
                </div>
                <button onClick={() => router.push('/find/submit')} style={{
                  background: '#1A56CC', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, marginLeft: 16,
                }}>Submit referral</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>Searching…</div>}>
      <SearchContent />
    </Suspense>
  );
}
