'use client';
import { Topbar } from '@/components/layout/Topbar';
import { KpiCard, PageLoader, UrgencyBadge, StatusBadge, FacilityTypeBadge, SectionHeader } from '@/components/ui';
import { useAnalytics, useFacilities, useReferrals, useActivityFeed } from '@/hooks/useData';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useRouter } from 'next/navigation';

const PIPELINE_STAGES = ['new','reviewing','matched','placed','rejected'] as const;
const STAGE_COLOR: Record<string,string> = {
  new:'#3B82F6', reviewing:'#EAB308', matched:'#F97316', placed:'#22C55E', rejected:'#EF4444',
};
const PIE_COLORS = ['#1A56CC','#3B82F6','#93C5FD','#BFDBFE'];

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff/60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

const ACTION_LABELS: Record<string,string> = {
  referral_created:   'New referral submitted',
  referral_updated:   'Referral updated',
  matching_run:       'Matching engine ran',
  match_selected:     'Match confirmed',
  vacancy_status_changed: 'Vacancy status changed',
  facility_created:   'New facility added',
  user_login:         'User logged in',
  user_registered:    'New user registered',
};

export default function DashboardPage() {
  const router = useRouter();
  const { summary, isLoading: statsLoading } = useAnalytics();
  const { referrals } = useReferrals({ limit: '50' });
  const { facilities } = useFacilities();
  const { logs } = useActivityFeed();

  const now = new Date().toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  if (statsLoading && !summary) return (
    <div>
      <Topbar title="Dashboard" subtitle={now} />
      <div className="page-body"><PageLoader /></div>
    </div>
  );

  const s = summary ?? {};
  const byStatus = s.referrals_by_status ?? {};
  const bySrc = s.referrals_by_source ?? {};
  const weekly = s.placements_by_week ?? [];

  const srcData = Object.entries(bySrc).map(([name, value], i) => ({ name, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  const placementRate = Math.round((s.placement_rate ?? 0) * 100);

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
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          <KpiCard label="Total referrals"       value={s.total_referrals ?? 0} trend={`${s.active_referrals ?? 0} currently active`} fillPct={Math.min(100, s.total_referrals ?? 0)} />
          <KpiCard label="Active referrals"      value={s.active_referrals ?? 0} trend={`${s.urgent_referrals ?? 0} urgent/immediate`} trendDir="down" fillPct={(s.active_referrals ?? 0) / Math.max(1, s.total_referrals ?? 1) * 100} fillColor="#E74C3C" />
          <KpiCard label="Placement rate"        value={`${placementRate}%`} trend={`${byStatus.placed ?? 0} total placements`} trendDir="up" fillPct={placementRate} fillColor="#16A34A" />
          <KpiCard label="Avg time-to-placement" value={`${s.avg_time_to_placement_days ?? 0}d`} trend={`${s.available_beds ?? 0} beds available`} trendDir="up" fillPct={50} fillColor="#9333EA" />
        </div>

        {/* Pipeline */}
        <div className="card" style={{ marginBottom:16 }}>
          <SectionHeader title="Referral pipeline" action={<span style={{ fontSize:12, color:'var(--brand)', cursor:'pointer' }} onClick={() => router.push('/dashboard/referrals')}>View all →</span>} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
            {PIPELINE_STAGES.map(stage => {
              const items = Array.isArray(referrals) ? referrals.filter((r:any) => r.status === stage) : [];
              const cnt   = byStatus[stage] ?? items.length;
              return (
                <div key={stage} style={{ cursor:'pointer' }} onClick={() => router.push(`/dashboard/referrals?status=${stage}`)}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <span style={{ fontSize:10, fontWeight:600, color:'var(--gray-500)', textTransform:'uppercase', letterSpacing:'.05em' }}>{stage}</span>
                    <span style={{ fontFamily:'Sora,sans-serif', fontWeight:700, fontSize:16, color:STAGE_COLOR[stage] }}>{cnt}</span>
                  </div>
                  <div style={{ height:3, background:STAGE_COLOR[stage]+'28', borderRadius:2, marginBottom:8 }}>
                    <div style={{ height:'100%', width:`${Math.min(cnt*15,100)}%`, background:STAGE_COLOR[stage], borderRadius:2 }} />
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {items.slice(0,3).map((r:any) => (
                      <div key={r.id} style={{ background:'var(--gray-50)', borderRadius:6, padding:'6px 8px' }}>
                        <div style={{ fontSize:11, fontWeight:500, color:'var(--gray-800)', marginBottom:3 }}>{r.client_name}</div>
                        <UrgencyBadge urgency={r.urgency} />
                      </div>
                    ))}
                    {cnt > 3 && <div style={{ fontSize:10, color:'var(--gray-400)', textAlign:'center', padding:'3px 0' }}>+{cnt-3} more</div>}
                    {cnt === 0 && <div style={{ fontSize:11, color:'var(--gray-300)', textAlign:'center', padding:'8px 0' }}>—</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts + Vacancies row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 260px 260px', gap:14, marginBottom:14 }}>
          {/* Bar chart */}
          <div className="card">
            <SectionHeader title="Weekly referrals vs placements" />
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weekly.length ? weekly : [{ week:'W1',referrals:0,count:0 }]} barGap={3}>
                <XAxis dataKey="week" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border:'0.5px solid var(--gray-200)', borderRadius:8, fontSize:12 }} cursor={{ fill:'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="referrals" fill="#E2E8F0" radius={[3,3,0,0]} name="Referrals in" />
                <Bar dataKey="count"     fill="#1A56CC" radius={[3,3,0,0]} name="Placed" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', gap:16, marginTop:8 }}>
              {[['#E2E8F0','Referrals in'],['#1A56CC','Placed']].map(([c,l]) => (
                <span key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--gray-500)' }}>
                  <span style={{ width:10, height:10, borderRadius:2, background:c, display:'inline-block' }} />{l}
                </span>
              ))}
            </div>
          </div>

          {/* Pie */}
          <div className="card">
            <SectionHeader title="Referral sources" />
            <ResponsiveContainer width="100%" height={110}>
              <PieChart>
                <Pie data={srcData.length ? srcData : [{ name:'—', value:1, color:'#E5E7EB' }]} cx="50%" cy="50%" innerRadius={28} outerRadius={48} dataKey="value" stroke="none">
                  {(srcData.length ? srcData : [{ color:'#E5E7EB' }]).map((e:any,i:number) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize:11, borderRadius:6 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:'flex', flexDirection:'column', gap:3, marginTop:6 }}>
              {srcData.map(s => (
                <div key={s.name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
                  <span style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0 }} />
                  <span style={{ flex:1, color:'var(--gray-600)', textTransform:'capitalize' }}>{s.name}</span>
                  <span style={{ fontWeight:600, color:'var(--gray-800)' }}>{s.value as number}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live vacancies */}
          <div className="card">
            <SectionHeader title="Live vacancies" action={<span style={{ fontSize:11, color:'var(--brand)', cursor:'pointer' }} onClick={() => router.push('/dashboard/facilities')}>Manage →</span>} />
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {(Array.isArray(facilities) ? facilities : []).slice(0,4).map((f:any) => {
                const avail = (f.vacancies ?? []).filter((v:any) => v.status === 'available').length;
                return (
                  <div key={f.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'var(--gray-50)', borderRadius:7 }}>
                    <FacilityTypeBadge type={f.type} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div>
                      <div style={{ fontSize:10, color:'var(--gray-400)' }}>{f.suburb}, {f.state}</div>
                    </div>
                    <span style={{ fontFamily:'Sora,sans-serif', fontSize:16, fontWeight:700, color: avail > 0 ? '#16A34A' : '#EF4444' }}>{avail}</span>
                  </div>
                );
              })}
              {facilities.length === 0 && <div style={{ fontSize:12, color:'var(--gray-400)', textAlign:'center', padding:'20px 0' }}>No facilities yet</div>}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="card">
          <SectionHeader title="Recent activity" />
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {logs.slice(0,10).map((log:any) => (
              <div key={log.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 0', borderBottom:'0.5px solid var(--gray-100)' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--brand)', flexShrink:0 }} />
                <div style={{ flex:1, fontSize:12, color:'var(--gray-700)' }}>
                  {ACTION_LABELS[log.action] ?? log.action}
                  {log.performer?.name && <span style={{ color:'var(--gray-400)' }}> · {log.performer.name}</span>}
                </div>
                <div style={{ fontSize:11, color:'var(--gray-400)', flexShrink:0 }}>{relTime(log.created_at)}</div>
              </div>
            ))}
            {logs.length === 0 && <div style={{ fontSize:12, color:'var(--gray-400)', padding:'16px 0' }}>No recent activity</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
