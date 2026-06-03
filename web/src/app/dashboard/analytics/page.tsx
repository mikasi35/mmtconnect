'use client';
import { Topbar } from '@/components/layout/Topbar';
import { KpiCard, PageLoader, SectionHeader, FacilityTypeBadge } from '@/components/ui';
import { useAnalytics } from '@/hooks/useData';
import useSWR from 'swr';
import { api } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';

const fetcher = (fn: () => Promise<any>) => fn().then((r: any) => r.data);
const PIE_COLORS = ['#1A56CC','#3B82F6','#22C55E','#F97316','#EAB308','#8B5CF6'];

function useFacilityStats() {
  const { data } = useSWR('analytics/facilities', () => fetcher(api.analytics.facilities));
  return Array.isArray(data) ? data : [];
}

export default function AnalyticsPage() {
  const { summary, isLoading } = useAnalytics();
  const facilityStats = useFacilityStats();

  if (isLoading && !summary) return <><Topbar title="Analytics" /><div className="page-body"><PageLoader /></div></>;

  const s = summary ?? {};
  const bySrc    = Object.entries(s.referrals_by_source ?? {}).map(([name, value]) => ({ name, value }));
  const byStatus = Object.entries(s.referrals_by_status ?? {}).map(([name, value]) => ({ name, value }));
  const byUrgency= Object.entries(s.referrals_by_urgency ?? {}).map(([name, value]) => ({ name, value }));
  const weekly   = s.placements_by_week ?? [];
  const pRate    = Math.round((s.placement_rate ?? 0) * 100);
  const oRate    = Math.round((s.occupancy_rate ?? 0) * 100);

  return (
    <div>
      <Topbar title="Analytics" subtitle="Real-time operational insights" />
      <div className="page-body fade-in">

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
          <KpiCard label="Total referrals"        value={s.total_referrals ?? 0}               fillPct={Math.min(100, s.total_referrals ?? 0)} />
          <KpiCard label="Placement rate"         value={`${pRate}%`} trendDir="up"             fillPct={pRate} fillColor="#16A34A" />
          <KpiCard label="Avg time-to-placement"  value={`${s.avg_time_to_placement_days ?? 0}d`} trendDir="up" fillPct={40} fillColor="#9333EA" />
          <KpiCard label="Available beds"         value={s.available_beds ?? 0}                 fillPct={100 - oRate} fillColor="#16A34A" />
          <KpiCard label="Occupancy rate"         value={`${oRate}%`} trendDir="neutral"        fillPct={oRate} fillColor="var(--brand)" />
        </div>

        {/* Weekly trend */}
        <div className="card" style={{ marginBottom:16 }}>
          <SectionHeader title="Weekly trends — referrals vs placements" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekly} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="week" tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ border:'0.5px solid var(--gray-200)', borderRadius:8, fontSize:12 }} cursor={{ fill:'rgba(0,0,0,0.03)' }} />
              <Legend wrapperStyle={{ fontSize:12 }} />
              <Bar dataKey="referrals" fill="#E2E8F0" radius={[3,3,0,0]} name="Referrals in" />
              <Bar dataKey="count"     fill="#1A56CC" radius={[3,3,0,0]} name="Placed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Three pies */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:16 }}>
          {[
            { title:'By source',  data:bySrc },
            { title:'By status',  data:byStatus },
            { title:'By urgency', data:byUrgency },
          ].map(({ title, data }) => (
            <div key={title} className="card">
              <SectionHeader title={title} />
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={data.length ? data : [{ name:'—', value:1 }]} cx="50%" cy="50%" innerRadius={30} outerRadius={52} dataKey="value" stroke="none">
                    {(data.length ? data : [{}]).map((_:any, i:number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize:11, borderRadius:6 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                {data.map((d:any, i:number) => (
                  <div key={d.name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:PIE_COLORS[i%PIE_COLORS.length], flexShrink:0 }} />
                    <span style={{ flex:1, color:'var(--gray-600)', textTransform:'capitalize' }}>{d.name}</span>
                    <span style={{ fontWeight:600 }}>{d.value as number}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Per-facility table */}
        {facilityStats.length > 0 && (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'0.5px solid var(--gray-200)' }}>
              <h2 style={{ fontSize:14, margin:0 }}>Facility occupancy breakdown</h2>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  {['Facility','Type','State','Total beds','Available','Occupied','Reserved','Occupancy'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {facilityStats.map((f:any) => {
                  const pct = f.total_beds > 0 ? Math.round(f.occupied_beds / f.total_beds * 100) : 0;
                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight:500 }}>{f.name}</td>
                      <td><FacilityTypeBadge type={f.type} /></td>
                      <td>{f.state}</td>
                      <td>{f.total_beds}</td>
                      <td style={{ color:'#16A34A', fontWeight:600 }}>{f.available_beds}</td>
                      <td style={{ color:'#EF4444', fontWeight:600 }}>{f.occupied_beds}</td>
                      <td style={{ color:'#EAB308', fontWeight:600 }}>{f.reserved_beds}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:5, background:'var(--gray-100)', borderRadius:3, minWidth:60 }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:'var(--brand)', borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:11, fontWeight:600, minWidth:28 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
