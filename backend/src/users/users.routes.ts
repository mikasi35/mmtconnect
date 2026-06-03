import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../common/db';
import { authenticate, requireRoles } from '../common/auth.middleware';
import { asyncHandler, NotFoundError, ValidationError, paginate } from '../common/errors';
import type { User } from '../../../shared/types';

const router = Router();
router.use(authenticate);

// GET /users  (admin only)
router.get('/', requireRoles('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = paginate(req.query);
  const { role, search } = req.query as any;

  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let p = 1;

  if (role)   { conditions.push(`role=$${p++}`); params.push(role); }
  if (search) { conditions.push(`(name ILIKE $${p} OR email ILIKE $${p})`); params.push(`%${search}%`); p++; }

  const where = conditions.join(' AND ');
  const [{ count }] = await query<{ count: string }>(`SELECT COUNT(*) FROM users WHERE ${where}`, params);

  const users = await query<User>(
    `SELECT id,name,email,role,organisation,phone,is_active,last_login_at,created_at,updated_at
     FROM users WHERE ${where} ORDER BY name LIMIT $${p} OFFSET $${p+1}`,
    [...params, limit, offset]
  );

  res.json({ data: users, total: parseInt(count), page, limit, has_next: offset + limit < parseInt(count) });
}));

// GET /users/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  // Users can only see themselves unless admin
  const targetId = req.params.id === 'me' ? req.user!.sub : req.params.id;
  if (targetId !== req.user!.sub && req.user!.role !== 'admin') {
    const { AppError } = await import('../common/errors');
    throw new AppError('Forbidden', 403);
  }

  const user = await queryOne<User>(
    `SELECT id,name,email,role,organisation,phone,is_active,last_login_at,created_at,updated_at
     FROM users WHERE id=$1`,
    [targetId]
  );
  if (!user) throw new NotFoundError('User');
  res.json({ data: user });
}));

// PATCH /users/:id
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const targetId = req.params.id;
  if (targetId !== req.user!.sub && req.user!.role !== 'admin') {
    const { AppError } = await import('../common/errors');
    throw new AppError('Forbidden', 403);
  }

  const allowed = ['name','organisation','phone'];
  if (req.user!.role === 'admin') allowed.push('role','is_active');

  const updates: string[] = [];
  const params: any[] = [];
  let p = 1;

  for (const f of allowed) {
    if (req.body[f] !== undefined) {
      updates.push(`${f}=$${p++}`);
      params.push(req.body[f]);
    }
  }

  // Password change
  if (req.body.password) {
    if (req.body.password.length < 8) throw new ValidationError('Password must be at least 8 characters');
    updates.push(`password_hash=$${p++}`);
    params.push(await bcrypt.hash(req.body.password, 12));
  }

  if (!updates.length) throw new ValidationError('No valid fields to update');
  params.push(targetId);

  const user = await queryOne<User>(
    `UPDATE users SET ${updates.join(',')} WHERE id=$${p}
     RETURNING id,name,email,role,organisation,phone,is_active,created_at,updated_at`,
    params
  );

  res.json({ data: user });
}));

export default router;
