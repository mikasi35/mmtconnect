import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, queryOne } from '../common/db';
import { authenticate } from '../common/auth.middleware';
import { asyncHandler, AppError, ConflictError, ValidationError } from '../common/errors';
import type { User } from '../../../shared/types';

const router = Router();

const JWT_SECRET         = process.env.JWT_SECRET          || 'mmt_dev_secret_change_in_prod';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  || 'mmt_refresh_secret_change_in_prod';
const JWT_EXPIRES        = process.env.JWT_EXPIRES         || '15m';
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function signAccess(user: User) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES as any }
  );
}

async function createRefreshToken(userId: string): Promise<string> {
  const raw   = crypto.randomBytes(40).toString('hex');
  const hash  = crypto.createHash('sha256').update(raw).digest('hex');
  const exp   = new Date(Date.now() + REFRESH_EXPIRES_MS);
  await query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
    [userId, hash, exp]
  );
  return raw;
}

// POST /auth/register
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, organisation, phone } = req.body;
  const role = 'coordinator';

  if (!name || !email || !password) {
    throw new ValidationError('name, email and password are required');
  }
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  const existing = await queryOne('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
  if (existing) throw new ConflictError('Email already registered');

  const password_hash = await bcrypt.hash(password, 12);
  const user = await queryOne<User>(
    `INSERT INTO users (name, email, password_hash, role, organisation, phone)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, name, email, role, organisation, phone, is_active, created_at, updated_at`,
    [name, email.toLowerCase(), password_hash, role, organisation ?? null, phone ?? null]
  );

  if (!user) throw new AppError('Failed to create user');

  // Log
  await query(
    `INSERT INTO activity_logs (entity_type, entity_id, action, metadata)
     VALUES ('user',$1,'user_registered','{}')`,
    [user.id]
  );

  const access_token  = signAccess(user);
  const refresh_token = await createRefreshToken(user.id);

  res.status(201).json({
    data: { access_token, refresh_token, expires_in: 900, user },
  });
}));

// POST /auth/login
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ValidationError('email and password are required');

  const row = await queryOne<User & { password_hash: string }>(
    `SELECT id, name, email, role, organisation, phone, is_active,
            last_login_at, created_at, updated_at, password_hash
     FROM users WHERE email=$1`,
    [email.toLowerCase()]
  );

  if (!row) {
    throw new AppError('Email address not found. Please check and try again.', 401);
  }
  if (!(await bcrypt.compare(password, row.password_hash))) {
    throw new AppError('Incorrect password. Please try again.', 401);
  }
  if (!row.is_active) throw new AppError('Account disabled. Contact support.', 403);

  await query('UPDATE users SET last_login_at=NOW() WHERE id=$1', [row.id]);

  const { password_hash: _, ...user } = row;
  const access_token  = signAccess(user as User);
  const refresh_token = await createRefreshToken(user.id);

  await query(
    `INSERT INTO activity_logs (entity_type, entity_id, action, metadata, performed_by)
     VALUES ('user',$1,'user_login','{}', $1)`,
    [user.id]
  );

  res.json({ data: { access_token, refresh_token, expires_in: 900, user } });
}));

// POST /auth/refresh
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  if (!refresh_token) throw new ValidationError('refresh_token required');

  const hash = crypto.createHash('sha256').update(refresh_token).digest('hex');
  const token = await queryOne<{ user_id: string; expires_at: Date; revoked: boolean }>(
    `SELECT user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash=$1`,
    [hash]
  );

  if (!token || token.revoked || new Date(token.expires_at) < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await queryOne<User>(
    `SELECT id, name, email, role, organisation, is_active FROM users WHERE id=$1`,
    [token.user_id]
  );
  if (!user || !user.is_active) throw new AppError('User not found or disabled', 401);

  // Rotate refresh token
  await query('UPDATE refresh_tokens SET revoked=true WHERE token_hash=$1', [hash]);
  const new_refresh = await createRefreshToken(user.id);

  res.json({ data: { access_token: signAccess(user), refresh_token: new_refresh, expires_in: 900, user } });
}));

// POST /auth/logout
router.post('/logout', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    const hash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    await query('UPDATE refresh_tokens SET revoked=true WHERE token_hash=$1', [hash]);
  }
  res.json({ data: { message: 'Logged out successfully' } });
}));

// GET /auth/me
router.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = await queryOne<User>(
    `SELECT id, name, email, role, organisation, phone, is_active, last_login_at, created_at, updated_at
     FROM users WHERE id=$1`,
    [req.user!.sub]
  );
  if (!user) throw new AppError('User not found', 404);
  res.json({ data: user });
}));

// POST /auth/forgot-password
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email?.trim()) throw new ValidationError('email is required');

  const user = await queryOne<User>('SELECT id, email FROM users WHERE email=$1 AND is_active=true', [email.toLowerCase()]);

  // Always return 200 to avoid user enumeration
  if (!user) {
    res.json({ data: { message: 'If that email exists, a reset link has been sent.' } });
    return;
  }

  // Invalidate any existing tokens for this user
  await query('DELETE FROM password_reset_tokens WHERE user_id=$1', [user.id]);

  const raw   = crypto.randomBytes(32).toString('hex');
  const hash  = crypto.createHash('sha256').update(raw).digest('hex');
  const exp   = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
    [user.id, hash, exp]
  );

  // Send the email with the reset link
  const { sendEmail, getPublicSiteUrl } = await import('../common/email');
  const resetLink = `${getPublicSiteUrl()}/reset-password?token=${raw}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset your password - MMT Care Connect',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Hi,</p>
          <p>We received a request to reset the password for your MMT Care Connect account.</p>
          <p>Please click the button below to choose a new password:</p>
          <p style="margin: 24px 0;">
            <a href="${resetLink}" style="background: #1A56CC; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p>${resetLink}</p>
          <p>This password reset link will expire in 1 hour.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #666; fontSize: 12px;">MMT Care Connect Coordination Platform</p>
        </div>
      `
    });
  } catch (emailErr: any) {
    console.error('Failed to send forgot password email:', emailErr.message);
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Failed to send reset email. Please try again later.', 500);
    }
  }

  res.json({
    data: {
      message: 'If that email exists, a reset link has been sent.',
      reset_token: process.env.NODE_ENV === 'production' ? undefined : raw,
    },
  });
}));

// POST /auth/reset-password
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token)    throw new ValidationError('token is required');
  if (!password || password.length < 8) throw new ValidationError('password must be at least 8 characters');

  const hash = crypto.createHash('sha256').update(token).digest('hex');

  const record = await queryOne<{ id: string; user_id: string; expires_at: string; used: boolean }>(
    'SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token_hash=$1',
    [hash]
  );

  if (!record || record.used || new Date(record.expires_at) < new Date()) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const password_hash = await bcrypt.hash(password, 12);

  await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [password_hash, record.user_id]);
  await query('UPDATE password_reset_tokens SET used=true WHERE id=$1', [record.id]);
  // Revoke all refresh tokens for security
  await query('UPDATE refresh_tokens SET revoked=true WHERE user_id=$1', [record.user_id]);

  res.json({ data: { message: 'Password reset successfully. Please log in with your new password.' } });
}));

// POST /auth/change-password  (authenticated)
router.post('/change-password', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  if (!current_password) throw new ValidationError('current_password is required');
  if (!new_password || new_password.length < 8) throw new ValidationError('new_password must be at least 8 characters');

  const user = await queryOne<{ id: string; password_hash: string }>(
    'SELECT id, password_hash FROM users WHERE id=$1',
    [req.user!.sub]
  );
  if (!user) throw new AppError('User not found', 404);

  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) throw new AppError('Current password is incorrect', 400);

  const password_hash = await bcrypt.hash(new_password, 12);
  await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [password_hash, user.id]);

  res.json({ data: { message: 'Password changed successfully.' } });
}));

// POST /auth/push-token  (authenticated) — register Expo push token
router.post('/push-token', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token?.startsWith('ExponentPushToken') && !token?.startsWith('ExpoPushToken')) {
    throw new ValidationError('Invalid push token format');
  }
  await query('UPDATE users SET push_token=$1 WHERE id=$2', [token, req.user!.sub]);
  res.json({ data: { registered: true } });
}));

export default router;
