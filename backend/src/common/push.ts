/**
 * Push Notification Service
 * Uses Expo's free push notification service — no Firebase/APNs keys needed in dev.
 * In production, add EXPO_ACCESS_TOKEN to .env for higher rate limits.
 */

import { query, queryOne } from './db';

export interface PushPayload {
  title: string;
  body:  string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

/** Send a push notification to a single user by user_id */
export async function sendToUser(userId: string, payload: PushPayload): Promise<void> {
  const user = await queryOne<{ push_token: string | null }>(
    'SELECT push_token FROM users WHERE id=$1',
    [userId]
  );
  if (!user?.push_token) return;
  await sendRaw([user.push_token], payload);
  await logNotification(userId, payload);
}

/** Broadcast to all users with a given role */
export async function broadcastToRole(role: string, payload: PushPayload): Promise<void> {
  const rows = await query<{ id: string; push_token: string }>(
    `SELECT id, push_token FROM users WHERE role=$1 AND is_active=true AND push_token IS NOT NULL`,
    [role]
  );
  if (!rows.length) return;

  const tokens = rows.map(r => r.push_token);
  await sendRaw(tokens, payload);
  for (const r of rows) await logNotification(r.id, payload);
}

/** Broadcast to ALL active admins */
export async function broadcastToStaff(payload: PushPayload): Promise<void> {
  const rows = await query<{ id: string; push_token: string }>(
    `SELECT id, push_token FROM users
     WHERE role = 'admin'
       AND is_active=true AND push_token IS NOT NULL`
  );
  if (!rows.length) return;
  const tokens = rows.map(r => r.push_token);
  await sendRaw(tokens, payload);
  for (const r of rows) await logNotification(r.id, payload);
}

async function logNotification(userId: string, payload: PushPayload): Promise<void> {
  await query(
    `INSERT INTO notifications (user_id, title, body, data)
     VALUES ($1,$2,$3,$4)`,
    [userId, payload.title, payload.body, JSON.stringify(payload.data ?? {})]
  );
}

async function sendRaw(tokens: string[], payload: PushPayload): Promise<void> {
  const messages = tokens
    .filter(t => t?.startsWith('ExponentPushToken') || t?.startsWith('ExpoPushToken'))
    .map(to => ({
      to,
      title:     payload.title,
      body:      payload.body,
      data:      payload.data ?? {},
      sound:     payload.sound ?? 'default',
      channelId: payload.channelId ?? 'vacancies',
    }));

  if (!messages.length) return;

  // Expo allows up to 100 notifications per request
  const chunks = chunkArray(messages, 100);
  const headers: Record<string, string> = {
    'Content-Type':  'application/json',
    'Accept':        'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  for (const chunk of chunks) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method:  'POST',
        headers,
        body:    JSON.stringify(chunk),
      });
      const json = await res.json() as any;
      // Log any delivery errors but don't throw — notifications are best-effort
      const data = Array.isArray(json.data) ? json.data : [];
      for (const item of data) {
        if (item.status === 'error') {
          console.warn('[push] delivery error:', item.message, item.details);
          // If token is invalid, clear it from DB
          if (item.details?.error === 'DeviceNotRegistered') {
            const token = chunk[data.indexOf(item)]?.to;
            if (token) {
              await query('UPDATE users SET push_token=NULL WHERE push_token=$1', [token]).catch(() => {});
            }
          }
        }
      }
    } catch (err) {
      console.error('[push] send error:', err);
    }
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
