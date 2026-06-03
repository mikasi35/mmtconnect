import { Router, Request, Response } from 'express';
import { query, queryOne } from '../common/db';
import { authenticate } from '../common/auth.middleware';
import { asyncHandler, NotFoundError } from '../common/errors';
import { haversineKm, meetsCareneeds } from '../../../shared/utils';
import type { Referral, Vacancy, Facility, MatchResult, CareNeeds } from '../../../shared/types';

const router = Router();
router.use(authenticate);

// ── Scoring weights ───────────────────────────────────────────

const URGENCY_SCORE: Record<string, number> = {
  immediate: 50,
  high:      35,
  medium:    20,
  low:       10,
};

const MAX_PROXIMITY_SCORE = 30; // within 0km
const MAX_RADIUS_KM       = 100; // score drops to 0 at 100km

function scoreMatch(
  referral: Referral,
  vacancy: Vacancy,
  facility: Facility,
): { score: number; reasons: string[]; distance_km?: number } {
  const reasons: string[] = [];
  let score = 0;

  // 1. Urgency weight
  const urgencyPts = URGENCY_SCORE[referral.urgency] ?? 10;
  score += urgencyPts;
  reasons.push(`Urgency (${referral.urgency}): +${urgencyPts} pts`);

  // 2. Care needs overlap bonus
  const supportedKeys = Object.entries(vacancy.care_level_supported)
    .filter(([, v]) => v).map(([k]) => k);
  const requiredKeys  = Object.entries(referral.care_needs)
    .filter(([, v]) => v).map(([k]) => k);

  const overlap = requiredKeys.filter(k => supportedKeys.includes(k)).length;
  const carePts = overlap * 4;
  score += carePts;
  if (carePts > 0) reasons.push(`Care needs match (${overlap}/${requiredKeys.length}): +${carePts} pts`);

  // 3. Proximity
  let distance_km: number | undefined;
  if (
    referral.location_preference &&
    facility.latitude && facility.longitude
  ) {
    // Simple: parse state from preference string and give bonus if matching
    const prefState = referral.location_preference.split(',').pop()?.trim().toUpperCase();
    if (prefState && facility.state.toUpperCase() === prefState) {
      score += 20;
      reasons.push(`State match (${facility.state}): +20 pts`);
    } else if (prefState) {
      // Penalty for wrong state
      score -= 10;
      reasons.push(`Different state (${facility.state} vs ${prefState}): -10 pts`);
    }
  }

  // 4. Availability bonus (available > reserved)
  if (vacancy.status === 'available') {
    score += 10;
    reasons.push('Immediately available: +10 pts');
  }

  // 5. Facility type slight variety bonus
  score += 5;

  return { score: Math.max(0, score), reasons, distance_km };
}

// POST /match/:referralId
router.post('/:referralId', asyncHandler(async (req: Request, res: Response) => {
  const referral = await queryOne<Referral>(
    'SELECT * FROM referrals WHERE id=$1', [req.params.referralId]
  );
  if (!referral) throw new NotFoundError('Referral');

  // Get all available (and reserved) vacancies with their facilities
  const vacancies = await query<Vacancy & { facility: Facility }>(
    `SELECT v.*, row_to_json(f) as facility
     FROM vacancies v
     JOIN facilities f ON f.id = v.facility_id
     WHERE v.status IN ('available','reserved') AND f.is_active = true`
  );

  // Filter: care needs must be satisfied
  const eligible = vacancies.filter(v => {
    if (Object.keys(referral.care_needs).length === 0) return true;
    return meetsCareneeds(referral.care_needs, v.care_level_supported);
  });

  // Score each eligible vacancy
  const results: MatchResult[] = eligible
    .map(v => {
      const { score, reasons, distance_km } = scoreMatch(
        referral, v, (v as any).facility
      );
      return {
        vacancy: v,
        facility: (v as any).facility,
        score,
        reasons,
        distance_km,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Top 10

  // Log the match run
  await query(
    `INSERT INTO activity_logs (entity_type,entity_id,action,metadata,performed_by)
     VALUES ('referral',$1,'matching_run',$2,$3)`,
    [referral.id,
     JSON.stringify({ matches_found: results.length, top_score: results[0]?.score ?? 0 }),
     req.user!.sub]
  );

  // Auto-advance status to 'reviewing' if still 'new'
  if (referral.status === 'new' && results.length > 0) {
    await query(`UPDATE referrals SET status='reviewing' WHERE id=$1`, [referral.id]);
  }

  res.json({ data: results });
}));

// POST /match/:referralId/select — confirm a match
router.post('/:referralId/select', asyncHandler(async (req: Request, res: Response) => {
  const { vacancy_id, facility_id } = req.body;

  if (!vacancy_id || !facility_id) {
    const { NotFoundError: _, ValidationError } = await import('../common/errors');
    throw new ValidationError('vacancy_id and facility_id are required');
  }

  const referral = await queryOne<Referral>('SELECT * FROM referrals WHERE id=$1', [req.params.referralId]);
  if (!referral) throw new NotFoundError('Referral');

  const vacancy = await queryOne<Vacancy>('SELECT * FROM vacancies WHERE id=$1', [vacancy_id]);
  if (!vacancy) throw new NotFoundError('Vacancy');

  // Update referral to matched
  await query(
    `UPDATE referrals SET status='matched', assigned_facility_id=$1, assigned_vacancy_id=$2 WHERE id=$3`,
    [facility_id, vacancy_id, referral.id]
  );

  // Reserve the vacancy
  await query(`UPDATE vacancies SET status='reserved' WHERE id=$1`, [vacancy_id]);

  await query(
    `INSERT INTO activity_logs (entity_type,entity_id,action,metadata,performed_by)
     VALUES ('referral',$1,'match_selected',$2,$3)`,
    [referral.id,
     JSON.stringify({ facility_id, vacancy_id }),
     req.user!.sub]
  );

  res.json({ data: { message: 'Match confirmed. Referral status updated to matched.' } });
}));

export default router;
