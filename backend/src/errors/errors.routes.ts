import { Router, Request, Response } from 'express';
import { query, queryOne } from '../common/db';
import { authenticate, requireRoles } from '../common/auth.middleware';
import { asyncHandler, paginate, ValidationError, NotFoundError } from '../common/errors';

const router = Router();
router.use(authenticate);
router.use(requireRoles('admin'));

// GET /errors — list with filters
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = paginate(req.query);
  const { level, resolved, search, from, to } = req.query as Record<string, string>;

  const conditions: string[] = [];
  const params: any[] = [];
  let p = 1;

  if (level)               { conditions.push(`e.level = $${p++}`);    params.push(level); }
  if (resolved !== undefined) {
    conditions.push(`e.resolved = $${p++}`);
    params.push(resolved === 'true');
  }
  if (search) {
    conditions.push(`(e.message ILIKE $${p} OR e.path ILIKE $${p} OR e.error_name ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }
  if (from) { conditions.push(`e.created_at >= $${p++}`); params.push(from); }
  if (to)   { conditions.push(`e.created_at <= $${p++}`); params.push(to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [{ count }] = await query<{ count: string }>(
    `SELECT COUNT(*) FROM error_logs e ${where}`, params
  );

  const rows = await query(
    `SELECT
       e.id, e.level, e.error_name, e.message,
       e.path, e.method, e.status_code,
       e.ip_address, e.resolved, e.created_at,
       json_build_object('id', u.id, 'name', u.name) AS user
     FROM error_logs e
     LEFT JOIN users u ON u.id = e.user_id
     ${where}
     ORDER BY e.created_at DESC
     LIMIT $${p} OFFSET $${p + 1}`,
    [...params, limit, offset]
  );

  res.json({ data: rows, total: parseInt(count), page, limit, has_next: offset + limit < parseInt(count) });
}));

// GET /errors/stats — summary counts for the dashboard widget
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const [stats] = await query(
    `SELECT
       COUNT(*)                                                           AS total,
       COUNT(*) FILTER (WHERE resolved = false)                          AS unresolved,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')   AS last_hour,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h,
       COUNT(*) FILTER (WHERE level = 'error' AND resolved = false)      AS open_errors,
       COUNT(*) FILTER (WHERE level = 'warn'  AND resolved = false)      AS open_warnings
     FROM error_logs`
  );
  res.json({ data: stats });
}));

// GET /errors/:id — full detail including stack & body
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const row = await queryOne(
    `SELECT e.*,
       json_build_object('id', u.id, 'name', u.name, 'email', u.email) AS user,
       json_build_object('id', r.id, 'name', r.name) AS resolved_by_user
     FROM error_logs e
     LEFT JOIN users u  ON u.id = e.user_id
     LEFT JOIN users r  ON r.id = e.resolved_by
     WHERE e.id = $1`,
    [req.params.id]
  );
  if (!row) throw new NotFoundError('Error log');
  res.json({ data: row });
}));

// PATCH /errors/:id/resolve — mark resolved
router.patch('/:id/resolve', asyncHandler(async (req: Request, res: Response) => {
  const row = await queryOne(
    `UPDATE error_logs
     SET resolved = true, resolved_by = $1, resolved_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [req.user!.sub, req.params.id]
  );
  if (!row) throw new NotFoundError('Error log');
  res.json({ data: row });
}));

// DELETE /errors/:id — remove a single log entry
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const row = await queryOne('SELECT id FROM error_logs WHERE id=$1', [req.params.id]);
  if (!row) throw new NotFoundError('Error log');
  await query('DELETE FROM error_logs WHERE id=$1', [req.params.id]);
  res.json({ data: { success: true } });
}));

// DELETE /errors — bulk delete resolved logs older than N days
router.delete('/', asyncHandler(async (req: Request, res: Response) => {
  const days = parseInt((req.query.older_than_days as string) || '30');
  if (isNaN(days) || days < 1) throw new ValidationError('older_than_days must be a positive integer');
  const [{ count }] = await query<{ count: string }>(
    `WITH deleted AS (
       DELETE FROM error_logs
       WHERE resolved = true AND created_at < NOW() - ($1 || ' days')::INTERVAL
       RETURNING id
     ) SELECT COUNT(*) FROM deleted`,
    [days]
  );
  res.json({ data: { deleted: parseInt(count), message: `Deleted ${count} resolved logs older than ${days} days` } });
}));

export default router;
