import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs'; // used in POST /users
import { query, queryOne } from '../common/db';
import { authenticate, requireRoles } from '../common/auth.middleware';
import { asyncHandler, NotFoundError, ValidationError, paginate, AppError, ConflictError } from '../common/errors';
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

  if (!updates.length) throw new ValidationError('No valid fields to update');
  params.push(targetId);

  const user = await queryOne<User>(
    `UPDATE users SET ${updates.join(',')} WHERE id=$${p}
     RETURNING id,name,email,role,organisation,phone,is_active,created_at,updated_at`,
    params
  );

  res.json({ data: user });
}));

// POST /users (admin only)
router.post('/', requireRoles('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, organisation, phone, send_invite } = req.body;

  if (!name || !email) {
    throw new ValidationError('name and email are required');
  }

  const existing = await queryOne('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
  if (existing) throw new ConflictError('Email already registered');

  // If send_invite is true, we can generate a random temporary password
  let passwordToHash = password;
  if (send_invite && !passwordToHash) {
    const crypto = await import('crypto');
    passwordToHash = crypto.randomBytes(16).toString('hex');
  } else if (!passwordToHash) {
    throw new ValidationError('Password is required when not sending an invite');
  }

  if (passwordToHash.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  const password_hash = await bcrypt.hash(passwordToHash, 12);
  const user = await queryOne<User>(
    `INSERT INTO users (name, email, password_hash, role, organisation, phone)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, name, email, role, organisation, phone, is_active, created_at, updated_at`,
    [name, email.toLowerCase(), password_hash, role || 'coordinator', organisation ?? null, phone ?? null]
  );

  if (!user) throw new AppError('Failed to create user');

  // Handle invitation email
  if (send_invite) {
    const crypto = await import('crypto');
    const { sendEmail, getPublicSiteUrl } = await import('../common/email');
    
    // Generate password reset/activation token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration for invites
    
    await query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
      [user.id, hash, exp]
    );

    const inviteLink = `${getPublicSiteUrl()}/reset-password?token=${rawToken}`;
    
    try {
      await sendEmail({
        to: user.email,
        subject: 'Invitation to join MMT Care Connect',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Welcome to MMT Care Connect</h2>
            <p>Hi ${user.name},</p>
            <p>You have been invited to join the MMT Care Connect platform as a ${user.role.replace('_', ' ')}.</p>
            <p>Please click the link below to set up your password and access your account:</p>
            <p style="margin: 24px 0;">
              <a href="${inviteLink}" style="background: #1A56CC; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Set Up Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${inviteLink}</p>
            <p>This invite will expire in 7 days.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #666; fontSize: 12px;">MMT Care Connect Coordination Platform</p>
          </div>
        `
      });
    } catch (emailErr: any) {
      // In development/test, log error but don't fail the whole user creation request if email setup is incomplete
      console.error('Failed to send invite email:', emailErr.message);
      if (process.env.NODE_ENV === 'production') {
        throw new AppError('User created but failed to send invite email. Please try resetting password.', 500);
      }
    }
  }

  // Log activity
  await query(
    `INSERT INTO activity_logs (entity_type, entity_id, action, metadata, performed_by)
     VALUES ('user',$1,'user_created_by_admin','{}', $2)`,
    [user.id, req.user!.sub]
  );

  res.status(201).json({ data: user });
}));

// DELETE /users/:id (admin only)
router.delete('/:id', requireRoles('admin'), asyncHandler(async (req: Request, res: Response) => {
  const targetId = req.params.id;

  // Prevent admin from deleting themselves
  if (targetId === req.user!.sub) {
    throw new ValidationError('You cannot delete your own admin account');
  }

  const user = await queryOne<{ id: string; is_active: boolean }>(
    'SELECT id, is_active FROM users WHERE id=$1', [targetId]
  );
  if (!user) throw new NotFoundError('User');

  // Soft-delete: deactivate rather than hard-delete to preserve referral history
  await query('UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1', [targetId]);

  await query(
    `INSERT INTO activity_logs (entity_type, entity_id, action, metadata, performed_by)
     VALUES ('user',$1,'user_deactivated_by_admin','{}', $2)`,
    [targetId, req.user!.sub]
  );

  res.json({ data: { success: true, message: 'User deactivated successfully' } });
}));

export default router;
