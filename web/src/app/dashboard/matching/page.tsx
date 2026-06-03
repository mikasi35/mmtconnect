'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { UrgencyBadge, FacilityTypeBadge, PageLoader, EmptyState, Spinner, SectionHeader } from '@/components/ui';
import { useReferrals } from '@/hooks/useData';
import { api } from '@/lib/api';
import { refreshReferrals } from '@/hooks/useData';

export default function MatchingPage() {
  const { referrals, isLoading } = useReferrals({ status: 'new' });
  const { referrals: reviewing } = useReferrals({ status: 'reviewing' });
  const [selected,  setSelected]  = useState<any>(null);
  const [results,   setResults]   = useState<any[]>([]);
  const [running,   setRunning]   = useState(false);
  const [selecting, setSelecting] = useState<string|null>(null);
  const [done,      setDone]      = useState<string|null>(null);

  const pending = [
    ...(Array.isArray(referrals) ? referrals : []),
    ...(Array.isArray(reviewing) ? reviewing : []),
  ];

  const runMatch = async (r: any) => {
    setSelected(r); setResults([]); setRunning(true); setDone(null);
    try {
      const res = await api.matching.run(r.id);
      setResults(res.data ?? []);
      refreshReferrals();
    } catch (e: any) { alert('Matching failed: ' + e.message); }
    finally { setRunning(false); }
  };

  const selectMatch = async (result: any) => {
    if (!selected) return;
    setSelecting(result.vacancy.id);
    try {
      await api.matching.select(selected.id, {
        vacancy_id:  result.vacancy.id,
        facility_id: result.facility.id,
      });
      setDone(result.facility.name);
      refreshReferrals();
    } catch (e: any) { alert('Failed: ' + e.message); }
    finally { setSelecting(null); }
  };

  const rows: any[] = pending;

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>
      {/* Left: unmatched referrals */}
      <div style={{ width:320, borderRight:'0.5px solid var(--gray-200)', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ padding:'14px 16px', borderBottom:'0.5px solid var(--gray-200)', background:'#fff' }}>
          <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:14 }}>Pending referrals</div>
          <div style={{ fontSize:12, color:'var(--gray-400)', marginTop:2 }}>{rows.length} awaiting match</div>
        </div>
        <div style={{ flex:1, overflowY:'auto' }}>
          {isLoading && rows.length === 0 ? <PageLoader /> :
           rows.length === 0 ? (
            <EmptyState title="All matched" message="No referrals pending matching." />
           ) : (
            rows.map((r: any) => (
              <div key={r.id} onClick={() => runMatch(r)} style={{
                padding:'12px 16px', borderBottom:'0.5px solid var(--gray-100)',
                cursor:'pointer', background: selected?.id === r.id ? 'var(--brand-light)' : '#fff',
                transition:'background 0.1s',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:5 }}>
                  <div style={{ fontWeight:500, fontSize:13 }}>{r.client_name}</div>
                  <UrgencyBadge urgency={r.urgency} />
                </div>
                <div style={{ fontSize:11, color:'var(--gray-500)' }}>
                  Age {r.client_age} · {r.source_type} · {r.location_preference ?? '—'}
                </div>
                {selected?.id === r.id && running && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6, fontSize:11, color:'var(--brand)' }}>
                    <Spinner size={12} /> Running matching engine…
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right: match results */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <Topbar
          title={selected ? `Matches for ${selected.client_name}` : 'Matching Engine'}
          subtitle={selected ? `${results.length} facilities ranked by suitability` : 'Select a referral to run matching'}
        />
        <div style={{ flex:1, overflowY:'auto', padding:16 }}>
          {!selected && (
            <EmptyState title="Select a referral" message="Click any referral on the left to run the matching engine and see ranked facility options." />
          )}

          {selected && running && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, flexDirection:'column', gap:12, color:'var(--gray-500)' }}>
              <Spinner size={32} />
              <div style={{ fontSize:14 }}>Running matching algorithm…</div>
              <div style={{ fontSize:12, color:'var(--gray-400)' }}>Checking care needs, availability, proximity</div>
            </div>
          )}

          {selected && !running && results.length === 0 && (
            <EmptyState title="No matches found" message="No available vacancies meet all care needs for this referral. Try adjusting care needs or check facility availability." />
          )}

          {done && (
            <div style={{ background:'#DCFCE7', color:'#166534', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:13, fontWeight:500 }}>
              ✓ Match confirmed — {selected?.client_name} placed at {done}
            </div>
          )}

          {selected && !running && results.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {results.map((r: any, i: number) => (
                <div key={r.vacancy.id} className="card fade-in" style={{
                  border: i === 0 ? '1.5px solid var(--brand)' : '0.5px solid var(--gray-200)',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      {i === 0 && <span style={{ background:'var(--brand)', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4 }}>BEST MATCH</span>}
                      <FacilityTypeBadge type={r.facility.type} />
                      <div>
                        <div style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:15 }}>{r.facility.name}</div>
                        <div style={{ fontSize:12, color:'var(--gray-500)' }}>{r.facility.suburb}, {r.facility.state}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'Sora,sans-serif', fontSize:22, fontWeight:700, color:'var(--brand)' }}>{r.score}</div>
                      <div style={{ fontSize:10, color:'var(--gray-400)' }}>match score</div>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ height:5, background:'var(--gray-100)', borderRadius:3 }}>
                      <div style={{ height:'100%', width:`${Math.min(r.score, 100)}%`, background:'var(--brand)', borderRadius:3 }} />
                    </div>
                  </div>

                  {/* Vacancy info */}
                  <div style={{ background:'var(--gray-50)', borderRadius:7, padding:'8px 12px', marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:'var(--gray-700)' }}>
                      {r.vacancy.label ?? 'Available bed'}
                    </div>
                    <div style={{ fontSize:11, color:'var(--gray-400)', marginTop:2 }}>
                      Status: {r.vacancy.status} · Available from {r.vacancy.start_date}
                    </div>
                  </div>

                  {/* Match reasons */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'var(--gray-400)', marginBottom:5, textTransform:'uppercase', letterSpacing:'.05em' }}>Why this match</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                      {r.reasons.map((reason: string, j: number) => (
                        <div key={j} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--gray-600)' }}>
                          <span style={{ color:'#16A34A', flexShrink:0 }}>✓</span>
                          {reason}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    disabled={!!done || selecting === r.vacancy.id}
                    onClick={() => selectMatch(r)}
                    style={{ justifyContent:'center' }}
                  >
                    {selecting === r.vacancy.id ? <><Spinner size={14} /> Confirming…</> : done ? '✓ Placement confirmed' : 'Confirm this placement'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
