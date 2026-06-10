'use client';
import { Topbar } from '@/components/layout/Topbar';
import { KpiCard, PageLoader, SectionHeader } from '@/components/ui';
import { useAnalytics, useFacilities, useActivityFeed } from '@/hooks/useData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';

const PIPELINE_STAGES = [
  { key: 'new',       label: 'New',       color: '#3B82F6' },
  { key: 'reviewing', label: 'Reviewing', color: '#EAB308' },
  { key: 'matched',   label: 'Matched',   color: '#F97316' },
  { key: 'placed',    label: 'Placed',    color: '#22C55E' },
  { key: 'rejected',  label: 'Rejected',  color: '#EF4444' },
] as const;

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ACTION_LABELS: Record<string, string> = {
  referral_created:       'New referral submitted',
  referral_updated:       'Referral updated',
  matching_run:           'Matching engine ran',
  match_selected:         'Match confirmed',
  vacancy_status_changed: 'Vacancy status changed',
  facility_created:       'New facility added',
  user_login:             'User logged in',
  user_registered:        'New user registered',
};

export default function DashboardPage() {
  const router = useRouter();
  const { summary, isLoading: statsLoading } = useAnalytics();
  const { facilities } = useFacilities();
  const { logs } = useActivityFeed();

  const now = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (statsLoading && !summary) return (
    <div>
      <Topbar title="Dashboard" subtitle={now} />
      <div className="page-body"><PageLoader /></div>
    </div>
  );

  const s            = summary ?? {};
  const byStatus     = s.referrals_by_status ?? {};
  const weekly       = s.placements_by_week ?? [];
  const placementRate = Math.round((s.placement_rate ?? 0) * 100);
  const totalPipeline = PIPELINE_STAGES.reduce((sum, st) => sum + (byStatus[st.key] ?? 0), 0);

  return (
    <div>
      <Topbar
        title="Dashboard"
        subtitle={`${now} · Live`}
        actions={
          <>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/dashboard/analytics')}>Full report ↗</button>
            <button className="btn btn-primary btn-sm" onClick={() => router.push('/dashboard/referrals')}>+ New referral</button>
          </>
        }
      />
      <div className="page-body fade-in">

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          <KpiCard label="Total referrals"       value={s.total_referrals ?? 0}              trend={`${s.active_referrals ?? 0} currently active`}       fillPct={Math.min(100, s.total_referrals ?? 0)} />
          <KpiCard label="Active referrals"      value={s.active_referrals ?? 0}             trend={`${s.urgent_referrals ?? 0} urgent/immediate`}        trendDir="down" fillPct={(s.active_referrals ?? 0) / Math.max(1, s.total_referrals ?? 1) * 100} fillColor="#E74C3C" />
          <KpiCard label="Placement rate"        value={`${placementRate}%`}                 trend={`${byStatus.placed ?? 0} total placements`}           trendDir="up"   fillPct={placementRate}  fillColor="#16A34A" />
          <KpiCard label="Avg time-to-placement" value={`${s.avg_time_to_placement_days ?? 0}d`} trend={`${s.available_beds ?? 0} beds available`}        trendDir="up"   fillPct={50}             fillColor="#9333EA" />
        </div>

        {/* Pipeline summary */}
        <div className="card" style={{ marginBottom: 16 }}>
          <SectionHeader
            title="Referral pipeline"
            action={
              <span style={{ fontSize: 12, color: 'var(--brand)', cursor: 'pointer' }} onClick={() => router.push('/dashboard/referrals')}>
                View all →
              </span>
            }
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            {PIPELINE_STAGES.map(({ key, label, color }) => {
              const cnt  = byStatus[key] ?? 0;
              const pct  = totalPipeline > 0 ? Math.round((cnt / totalPipeline) * 100) : 0;
              return (
                <div
                  key={key}
                  onClick={() => router.push(`/dashboard/referrals?status=${key}`)}
                  style={{
                    padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${color}22`, background: `${color}0a`,
                    transition: 'transform 0.1s, box-shadow 0.1s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 12px ${color}20`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = '';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                  }}
                >
                  <div style={{ fontSize: 26, fontFamily: 'Sora,sans-serif', fontWeight: 700, color, lineHeight: 1 }}>{cnt}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-700)', margin: '4px 0 8px' }}>{label}</div>
                  <div style={{ height: 3, background: `${color}20`, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 4 }}>{pct}% of total</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts + Vacancies */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 14, marginBottom: 14 }}>
          {/* Bar chart */}
          <div className="card">
            <SectionHeader title="Weekly referrals vs placements" />
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekly.length ? weekly : [{ week: 'W1', referrals: 0, count: 0 }]} barGap={4}>
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: '0.5px solid var(--gray-200)', borderRadius: 8, fontSize: 12 }} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="referrals" fill="#E2E8F0" radius={[3, 3, 0, 0]} name="Referrals in" />
                <Bar dataKey="count"     fill="#1A56CC" radius={[3, 3, 0, 0]} name="Placed" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {([['#E2E8F0', 'Referrals in'], ['#1A56CC', 'Placed']] as [string, string][]).map(([c, l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--gray-500)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
                </span>
              ))}
            </div>
          </div>

          {/* Live vacancies */}
          <div className="card">
            <SectionHeader
              title="Live vacancies"
              action={
                <span style={{ fontSize: 11, color: 'var(--brand)', cursor: 'pointer' }} onClick={() => router.push('/dashboard/facilities')}>
                  Manage →
                </span>
              }
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(Array.isArray(facilities) ? facilities : []).slice(0, 5).map((f: any) => {
                const avail = (f.vacancies ?? []).filter((v: any) => v.status === 'available').length;
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--gray-50)', borderRadius: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--gray-800)' }}>{f.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{f.suburb}, {f.state} · {f.type}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Sora,sans-serif', fontSize: 18, fontWeight: 700, color: avail > 0 ? '#16A34A' : '#EF4444', lineHeight: 1 }}>{avail}</div>
                      <div style={{ fontSize: 9, color: 'var(--gray-400)', marginTop: 1 }}>beds</div>
                    </div>
                  </div>
                );
              })}
              {(Array.isArray(facilities) ? facilities : []).length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '20px 0' }}>No facilities yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="card">
          <SectionHeader title="Recent activity" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {logs.slice(0, 8).map((log: any) => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '0.5px solid var(--gray-100)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: 'var(--gray-700)' }}>
                  {ACTION_LABELS[log.action] ?? log.action}
                  {log.performer?.name && <span style={{ color: 'var(--gray-400)' }}> · {log.performer.name}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', flexShrink: 0 }}>{relTime(log.created_at)}</div>
              </div>
            ))}
            {logs.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--gray-400)', padding: '16px 0' }}>No recent activity</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
