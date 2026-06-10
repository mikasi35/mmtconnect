'use client';
import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { UrgencyBadge, FacilityTypeBadge, PageLoader, EmptyState, Spinner } from '@/components/ui';
import { useReferrals } from '@/hooks/useData';
import { api } from '@/lib/api';
import { refreshReferrals } from '@/hooks/useData';

export default function MatchingPage() {
  const { referrals, isLoading } = useReferrals({ status: 'new' });
  const { referrals: reviewing }  = useReferrals({ status: 'reviewing' });
  const [selected,   setSelected]   = useState<any>(null);
  const [results,    setResults]    = useState<any[]>([]);
  const [running,    setRunning]    = useState(false);
  const [selecting,  setSelecting]  = useState<string | null>(null);
  const [done,       setDone]       = useState<string | null>(null);
  const [mobileTab,  setMobileTab]  = useState<'list' | 'results'>('list');

  const pending = [
    ...(Array.isArray(referrals)  ? referrals  : []),
    ...(Array.isArray(reviewing)  ? reviewing  : []),
  ];

  const runMatch = async (r: any) => {
    setSelected(r); setResults([]); setRunning(true); setDone(null);
    setMobileTab('results'); // switch to results pane on mobile
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Topbar
        title={selected && mobileTab === 'results' ? `Matches — ${selected.client_name}` : 'Matching Engine'}
        subtitle={selected && mobileTab === 'results'
          ? `${results.length} facilities ranked`
          : `${pending.length} awaiting match`}
        actions={
          selected && mobileTab === 'results' ? (
            <button className="btn btn-secondary btn-sm mobile-show" onClick={() => setMobileTab('list')}>
              ← Back
            </button>
          ) : undefined
        }
      />

      {/* Mobile tab switcher */}
      <div className="matching-tabs">
        <button
          onClick={() => setMobileTab('list')}
          style={{
            flex: 1, padding: '10px 0', fontSize: 13, fontWeight: mobileTab === 'list' ? 700 : 400,
            background: 'none', border: 'none', cursor: 'pointer',
            color: mobileTab === 'list' ? 'var(--brand)' : 'var(--gray-500)',
            borderBottom: `2px solid ${mobileTab === 'list' ? 'var(--brand)' : 'transparent'}`,
          }}
        >
          Referrals ({pending.length})
        </button>
        <button
          onClick={() => setMobileTab('results')}
          style={{
            flex: 1, padding: '10px 0', fontSize: 13, fontWeight: mobileTab === 'results' ? 700 : 400,
            background: 'none', border: 'none', cursor: 'pointer',
            color: mobileTab === 'results' ? 'var(--brand)' : 'var(--gray-500)',
            borderBottom: `2px solid ${mobileTab === 'results' ? 'var(--brand)' : 'transparent'}`,
          }}
        >
          {selected ? `Results (${results.length})` : 'Results'}
        </button>
      </div>

      {/* Main split layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left / list pane */}
        <div className={`matching-list-pane ${mobileTab === 'list' ? 'matching-pane-active' : ''}`}>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading && pending.length === 0 ? <PageLoader /> :
             pending.length === 0 ? (
              <EmptyState title="All matched" message="No referrals pending matching." />
             ) : (
              pending.map((r: any) => (
                <div key={r.id} onClick={() => runMatch(r)} style={{
                  padding: '14px 16px',
                  borderBottom: '0.5px solid var(--gray-100)',
                  cursor: 'pointer',
                  background: selected?.id === r.id ? 'var(--brand-light)' : '#fff',
                  transition: 'background 0.1s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)' }}>{r.client_name}</div>
                    <UrgencyBadge urgency={r.urgency} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                    Age {r.client_age} · {r.source_type}
                    {r.location_preference ? ` · ${r.location_preference}` : ''}
                  </div>
                  {selected?.id === r.id && running && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: 'var(--brand)' }}>
                      <Spinner size={12} /> Running matching engine…
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right / results pane */}
        <div className={`matching-results-pane ${mobileTab === 'results' ? 'matching-pane-active' : ''}`}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {!selected && (
              <EmptyState
                title="Select a referral"
                message="Tap any referral on the left to run the matching engine and see ranked facility options."
              />
            )}

            {selected && running && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, flexDirection: 'column', gap: 12, color: 'var(--gray-500)' }}>
                <Spinner size={32} />
                <div style={{ fontSize: 14 }}>Running matching algorithm…</div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>Checking care needs, availability, proximity</div>
              </div>
            )}

            {selected && !running && results.length === 0 && (
              <EmptyState title="No matches found" message="No available vacancies meet all care needs for this referral. Try adjusting care needs or check facility availability." />
            )}

            {done && (
              <div style={{ background: '#DCFCE7', color: '#166534', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
                ✓ Match confirmed — {selected?.client_name} placed at {done}
              </div>
            )}

            {selected && !running && results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {results.map((r: any, i: number) => (
                  <div key={r.vacancy.id} className="card fade-in" style={{
                    border: i === 0 ? '1.5px solid var(--brand)' : undefined,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                          {i === 0 && <span style={{ background: 'var(--brand)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>BEST MATCH</span>}
                          <FacilityTypeBadge type={r.facility.type} />
                        </div>
                        <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 14 }}>{r.facility.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{r.facility.suburb}, {r.facility.state}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                        <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--brand)' }}>{r.score}</div>
                        <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>score</div>
                      </div>
                    </div>

                    <div style={{ height: 4, background: 'var(--gray-100)', borderRadius: 3, marginBottom: 10 }}>
                      <div style={{ height: '100%', width: `${Math.min(r.score, 100)}%`, background: 'var(--brand)', borderRadius: 3 }} />
                    </div>

                    <div style={{ background: 'var(--gray-50)', borderRadius: 7, padding: '8px 12px', marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-700)' }}>{r.vacancy.label ?? 'Available bed'}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                        Available from {r.vacancy.start_date}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>Why this match</div>
                      {r.reasons.map((reason: string, j: number) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gray-600)' }}>
                          <span style={{ color: '#16A34A', flexShrink: 0 }}>✓</span>{reason}
                        </div>
                      ))}
                    </div>

                    <button
                      className="btn btn-primary"
                      disabled={!!done || selecting === r.vacancy.id}
                      onClick={() => selectMatch(r)}
                      style={{ justifyContent: 'center', width: '100%', minHeight: 44 }}
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
    </div>
  );
}
