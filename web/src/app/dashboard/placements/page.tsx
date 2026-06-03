'use client';
import { Topbar } from '@/components/layout/Topbar';
import { FacilityTypeBadge, PageLoader, EmptyState, SectionHeader } from '@/components/ui';
import { useReferrals } from '@/hooks/useData';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day:'numeric', month:'short', year:'numeric' });
}
function daysBetween(a: string, b: string) {
  return Math.abs(Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

export default function PlacementsPage() {
  const { referrals, total, isLoading } = useReferrals({ status: 'placed', limit: '50' });
  const rows: any[] = Array.isArray(referrals) ? referrals : (referrals as any)?.data ?? [];

  return (
    <div>
      <Topbar title="Placements" subtitle={`${total || rows.length} confirmed placements`} />
      <div className="page-body fade-in">
        {isLoading && rows.length === 0 ? <PageLoader /> : rows.length === 0 ? (
          <EmptyState title="No placements yet" message="Placements will appear here once referrals are confirmed." />
        ) : (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['Client','Age','Facility','Type','Location','Source','Placed date','Days to place'].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight:500 }}>{r.client_name}</td>
                    <td>{r.client_age}</td>
                    <td>{r.assigned_facility?.name ?? <span style={{ color:'var(--gray-300)' }}>—</span>}</td>
                    <td>{r.assigned_facility ? <FacilityTypeBadge type={r.assigned_facility.type} /> : '—'}</td>
                    <td style={{ color:'var(--gray-500)' }}>
                      {r.assigned_facility ? `${r.assigned_facility.suburb}, ${r.assigned_facility.state}` : '—'}
                    </td>
                    <td style={{ textTransform:'capitalize', color:'var(--gray-500)' }}>{r.source_type}</td>
                    <td>{r.placed_at ? fmtDate(r.placed_at) : fmtDate(r.updated_at)}</td>
                    <td>
                      <span style={{ fontWeight:600, color:'var(--brand)' }}>
                        {daysBetween(r.created_at, r.placed_at ?? r.updated_at)}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
