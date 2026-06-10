import { Request, Response, NextFunction } from 'express';
import { query as dbQuery } from './db';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) { super(`${resource} not found`, 404); }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) { super(message, 400, details); }
}

export class ConflictError extends AppError {
  constructor(message: string) { super(message, 409); }
}

// ── Persist an error record ──────────────────────────────────
export async function logError(opts: {
  level?: 'error' | 'warn';
  error_name?: string;
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  status_code?: number;
  user_id?: string;
  ip_address?: string;
  body?: unknown;
  query?: unknown;
  metadata?: unknown;
}): Promise<void> {
  try {
    await dbQuery(
      `INSERT INTO error_logs
         (level, error_name, message, stack, path, method, status_code,
          user_id, ip_address, body, query, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        opts.level      ?? 'error',
        opts.error_name ?? null,
        opts.message,
        opts.stack      ?? null,
        opts.path       ?? null,
        opts.method     ?? null,
        opts.status_code ?? null,
        opts.user_id    ?? null,
        opts.ip_address ?? null,
        opts.body       ? JSON.stringify(sanitiseBody(opts.body))  : null,
        opts.query      ? JSON.stringify(opts.query) : null,
        opts.metadata   ? JSON.stringify(opts.metadata) : null,
      ]
    );
  } catch (dbErr) {
    // Never let logging errors bubble up — just print to console
    console.error('[logError] Failed to persist error log:', dbErr);
  }
}

/** Strip sensitive fields from request body before storing */
function sanitiseBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const REDACT = new Set(['password', 'password_hash', 'token', 'refresh_token', 'access_token', 'secret']);
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).map(([k, v]) =>
      REDACT.has(k.toLowerCase()) ? [k, '[REDACTED]'] : [k, v]
    )
  );
}

// ── Global error handler ─────────────────────────────────────
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const userId    = (req as any).user?.sub ?? undefined;
  const ipAddress = req.ip ?? req.socket?.remoteAddress ?? undefined;

  if (err instanceof AppError) {
    // 400/404/409 are expected — only log 500s
    if (err.statusCode >= 500) {
      logError({
        level: 'error', error_name: err.name, message: err.message,
        stack: err.stack, path: req.path, method: req.method,
        status_code: err.statusCode, user_id: userId, ip_address: ipAddress,
        body: req.body, query: req.query,
      });
    }
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      statusCode: err.statusCode,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // PostgreSQL unique violation — expected, don't log
  if ((err as any).code === '23505') {
    res.status(409).json({ error: 'ConflictError', message: 'Resource already exists', statusCode: 409 });
    return;
  }

  // Unexpected / unhandled — always log
  console.error('Unhandled error:', err);
  logError({
    level: 'error', error_name: err.name || 'UnhandledError',
    message: err.message || 'Unknown error',
    stack: err.stack, path: req.path, method: req.method,
    status_code: 500, user_id: userId, ip_address: ipAddress,
    body: req.body, query: req.query,
    metadata: { code: (err as any).code },
  });

  res.status(500).json({ error: 'InternalServerError', message: 'An unexpected error occurred', statusCode: 500 });
}

// ── Async handler wrapper ────────────────────────────────────
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// ── Paginate helper ──────────────────────────────────────────
export function paginate(query: any): { limit: number; offset: number; page: number } {
  const page  = Math.max(1, parseInt(query.page  || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20')));
  return { page, limit, offset: (page - 1) * limit };
}
