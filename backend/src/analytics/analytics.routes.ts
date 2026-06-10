import { Router, Request, Response } from 'express';
import { query, queryOne } from '../common/db';
import { authenticate } from '../common/auth.middleware';
import { asyncHandler } from '../common/errors';

const router = Router();
router.use(authenticate);

// GET /analytics/summary
router.get('/summary', asyncHandler(async (_req: Request, res: Response) => {
  const [
    totals,
    byStatus,
    bySource,
    byUrgency,
    vacancyStats,
    weeklyPlacements,
    avgTimePlacement,
  ] = await Promise.all([
    // Total and active referrals
    queryOne<{ total: string; placed: string }>(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status='placed') as placed
       FROM referrals`
    ),

    // By status
    query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count FROM referrals GROUP BY status`
    ),

    // By source
    query<{ source_type: string; count: string }>(
      `SELECT source_type, COUNT(*) as count FROM referrals GROUP BY source_type`
    ),

    // By urgency
    query<{ urgency: string; count: string }>(
      `SELECT urgency, COUNT(*) as count FROM referrals GROUP BY urgency`
    ),

    // Vacancy stats
    queryOne<{ total: string; available: string; occupied: string; reserved: string }>(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status='available') as available,
              COUNT(*) FILTER (WHERE status='occupied')  as occupied,
              COUNT(*) FILTER (WHERE status='reserved')  as reserved
       FROM vacancies`
    ),

    // Weekly placements (last 8 weeks)
    query<{ week: string; placements: string; referrals: string }>(
      `SELECT
         TO_CHAR(DATE_TRUNC('week', created_at), 'DD Mon') as week,
         COUNT(*) FILTER (WHERE status='placed') as placements,
         COUNT(*) as referrals
       FROM referrals
       WHERE created_at >= NOW() - INTERVAL '8 weeks'
       GROUP BY DATE_TRUNC('week', created_at)
       ORDER BY DATE_TRUNC('week', created_at)`
    ),

    // Avg time to placement (days)
    queryOne<{ avg_days: string }>(
      `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (placed_at - created_at)) / 86400)::numeric, 1) as avg_days
       FROM referrals
       WHERE status='placed' AND placed_at IS NOT NULL`
    ),
  ]);

  const total            = parseInt(totals?.total ?? '0');
  const placed           = parseInt(totals?.placed ?? '0');
  const placement_rate   = total > 0 ? placed / total : 0;

  const statusMap: Record<string, number> = {};
  for (const row of byStatus) statusMap[row.status] = parseInt(row.count);

  const sourceMap: Record<string, number> = {};
  for (const row of bySource) sourceMap[row.source_type] = parseInt(row.count);

  const urgencyMap: Record<string, number> = {};
  for (const row of byUrgency) urgencyMap[row.urgency] = parseInt(row.count);

  const active_referrals = (statusMap.new ?? 0) + (statusMap.reviewing ?? 0) + (statusMap.matched ?? 0);
  const urgent_referrals = (urgencyMap.immediate ?? 0) + (urgencyMap.high ?? 0);
  const available_beds   = parseInt(vacancyStats?.available ?? '0');
  const total_beds       = parseInt(vacancyStats?.total ?? '0');
  const occupancy_rate   = total_beds > 0 ? parseInt(vacancyStats?.occupied ?? '0') / total_beds : 0;

  res.json({
    data: {
      total_referrals:             total,
      active_referrals,
      placement_rate:              Math.round(placement_rate * 100) / 100,
      avg_time_to_placement_days:  parseFloat(avgTimePlacement?.avg_days ?? '0') || 0,
      urgent_referrals,
      occupancy_rate:              Math.round(occupancy_rate * 100) / 100,
      available_beds,
      referrals_by_source:         sourceMap,
      referrals_by_status:         statusMap,
      referrals_by_urgency:        urgencyMap,
      placements_by_week:          weeklyPlacements.map(w => ({
        week:       w.week,
        count:      parseInt(w.placements),
        referrals:  parseInt(w.referrals),
      })),
    },
  });
}));

// GET /analytics/activity  (recent activity feed)
router.get('/activity', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(50, parseInt((req.query.limit as string) || '20'));
  const logs = await query(
    `SELECT al.*, json_build_object('id', u.id, 'name', u.name) as performer
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.performed_by
     ORDER BY al.created_at DESC
     LIMIT $1`,
    [limit]
  );
  res.json({ data: logs });
}));

// GET /analytics/facilities  (per-facility stats)
router.get('/facilities', asyncHandler(async (_req: Request, res: Response) => {
  const stats = await query(
    `SELECT f.id, f.name, f.type, f.suburb, f.state,
       COUNT(v.id) as total_beds,
       COUNT(v.id) FILTER (WHERE v.status='available') as available_beds,
       COUNT(v.id) FILTER (WHERE v.status='occupied')  as occupied_beds,
       COUNT(v.id) FILTER (WHERE v.status='reserved')  as reserved_beds
     FROM facilities f
     LEFT JOIN vacancies v ON v.facility_id = f.id
     WHERE f.is_active = true
     GROUP BY f.id
     ORDER BY f.name`
  );
  res.json({ data: stats });
}));

export default router;
