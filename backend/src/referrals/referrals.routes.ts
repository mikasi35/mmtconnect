import { Router, Request, Response } from 'express';
import { query, queryOne, withTransaction } from '../common/db';
import { authenticate } from '../common/auth.middleware';
import { asyncHandler, NotFoundError, ValidationError, paginate } from '../common/errors';
import { sendEmail, extractEmailFromContact, getPublicSiteUrl, buildTrackingUrl } from '../common/email';
import type { Referral } from '../../../shared/types';

const router = Router();
router.use(authenticate);

const VALID_STATUSES  = ['new','reviewing','matched','placed','rejected'];
const VALID_URGENCIES = ['low','medium','high','immediate'];
const VALID_SOURCES   = ['hospital','coordinator','family','self'];

// GET /referrals
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = paginate(req.query);
  const { status, urgency, search, source } = req.query as any;

  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let p = 1;

  if (status)  { conditions.push(`r.status=$${p++}`);        params.push(status); }
  if (urgency) { conditions.push(`r.urgency=$${p++}`);       params.push(urgency); }
  if (source)  { conditions.push(`r.source_type=$${p++}`);   params.push(source); }
  if (search)  {
    conditions.push(`r.client_name ILIKE $${p}`);
    params.push(`%${search}%`); p++;
  }

  const where = conditions.join(' AND ');

  const [{ count }] = await query<{ count: string }>(
    `SELECT COUNT(*) FROM referrals r WHERE ${where}`, params
  );

  const referrals = await query<Referral>(
    `SELECT r.*,
      row_to_json(u) as submitted_by_user,
      row_to_json(f) as assigned_facility
     FROM referrals r
     LEFT JOIN users u    ON u.id = r.submitted_by
     LEFT JOIN facilities f ON f.id = r.assigned_facility_id
     WHERE ${where}
     ORDER BY
       CASE r.urgency
         WHEN 'immediate' THEN 1
         WHEN 'high'      THEN 2
         WHEN 'medium'    THEN 3
         WHEN 'low'       THEN 4
       END,
       r.created_at DESC
     LIMIT $${p} OFFSET $${p+1}`,
    [...params, limit, offset]
  );

  res.json({
    data: referrals,
    total: parseInt(count),
    page, limit,
    has_next: offset + limit < parseInt(count),
  });
}));

// GET /referrals/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const referral = await queryOne<Referral>(
    `SELECT r.*,
      row_to_json(u) as submitted_by_user,
      row_to_json(f) as assigned_facility
     FROM referrals r
     LEFT JOIN users u      ON u.id = r.submitted_by
     LEFT JOIN facilities f ON f.id = r.assigned_facility_id
     WHERE r.id = $1`,
    [req.params.id]
  );
  if (!referral) throw new NotFoundError('Referral');
  res.json({ data: referral });
}));

// POST /referrals
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    client_name, client_age, care_needs = {},
    urgency = 'medium', location_preference,
    source_type, source_contact, notes,
  } = req.body;

  if (!client_name)   throw new ValidationError('client_name is required');
  if (client_age === undefined || client_age === null) throw new ValidationError('client_age is required');
  if (!source_type)   throw new ValidationError('source_type is required');
  if (!VALID_URGENCIES.includes(urgency)) throw new ValidationError('Invalid urgency level');
  if (!VALID_SOURCES.includes(source_type)) throw new ValidationError('Invalid source_type');

  const referral = await queryOne<Referral>(
    `INSERT INTO referrals
       (client_name,client_age,care_needs,urgency,location_preference,
        source_type,source_contact,notes,submitted_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [client_name, parseInt(client_age), JSON.stringify(care_needs), urgency,
     location_preference ?? null, source_type, source_contact ?? null,
     notes ?? null, req.user!.sub]
  );

  await query(
    `INSERT INTO activity_logs (entity_type,entity_id,action,metadata,performed_by)
     VALUES ('referral',$1,'referral_created',$2,$3)`,
    [referral!.id, JSON.stringify({ client_name, urgency, source_type }), req.user!.sub]
  );

  res.status(201).json({ data: referral });
}));

// PATCH /referrals/:id
router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const existing = await queryOne<Referral>('SELECT * FROM referrals WHERE id=$1', [req.params.id]);
  if (!existing) throw new NotFoundError('Referral');

  const {
    status, urgency, care_needs, notes, location_preference,
    assigned_facility_id, assigned_vacancy_id, rejected_reason,
  } = req.body;

  const updates: string[] = [];
  const params: any[] = [];
  let p = 1;

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) throw new ValidationError('Invalid status');
    updates.push(`status=$${p++}`); params.push(status);
    if (status === 'placed') { updates.push(`placed_at=$${p++}`); params.push(new Date()); }
  }
  if (urgency !== undefined)              { updates.push(`urgency=$${p++}`); params.push(urgency); }
  if (care_needs !== undefined)           { updates.push(`care_needs=$${p++}`); params.push(JSON.stringify(care_needs)); }
  if (notes !== undefined)                { updates.push(`notes=$${p++}`); params.push(notes); }
  if (location_preference !== undefined)  { updates.push(`location_preference=$${p++}`); params.push(location_preference); }
  if (assigned_facility_id !== undefined) { updates.push(`assigned_facility_id=$${p++}`); params.push(assigned_facility_id); }
  if (assigned_vacancy_id !== undefined)  { updates.push(`assigned_vacancy_id=$${p++}`); params.push(assigned_vacancy_id); }
  if (rejected_reason !== undefined)      { updates.push(`rejected_reason=$${p++}`); params.push(rejected_reason); }

  if (!updates.length) throw new ValidationError('No valid fields to update');

  params.push(req.params.id);
  const referral = await queryOne<Referral>(
    `UPDATE referrals SET ${updates.join(',')} WHERE id=$${p} RETURNING *`,
    params
  );

  // If being placed, mark vacancy as occupied
  if (status === 'placed' && assigned_vacancy_id) {
    await query(`UPDATE vacancies SET status='occupied' WHERE id=$1`, [assigned_vacancy_id]);
  }

  await query(
    `INSERT INTO activity_logs (entity_type,entity_id,action,metadata,performed_by)
     VALUES ('referral',$1,'referral_updated',$2,$3)`,
    [req.params.id,
     JSON.stringify({ from_status: existing.status, to_status: status ?? existing.status }),
     req.user!.sub]
  );

  const submittedEmail = extractEmailFromContact(existing.source_contact);
  if (submittedEmail && status !== undefined && status !== existing.status) {
    const tracking_id = existing.id.slice(0, 8).toUpperCase();
    const trackingUrl = buildTrackingUrl(tracking_id);

    if (status === 'matched') {
      sendEmail({
        to: submittedEmail,
        subject: 'Referral matched — next steps',
        text: `Good news! Your referral has been matched to a suitable placement. Tracking code: ${tracking_id}. Check progress at ${trackingUrl}`,
        html: `<p>Hi,</p>
               <p>Good news — your referral has been matched to a suitable placement.</p>
               <p>Your referral tracking code is <strong>${tracking_id}</strong>.</p>
               <p>Check progress at <a href="${trackingUrl}">${trackingUrl}</a>.</p>
               <p>A coordinator will contact you soon with the next steps.</p>`,
      }).catch(err => {
        console.error('Referral matched email failed:', err);
      });
    } else if (status === 'placed') {
      sendEmail({
        to: submittedEmail,
        subject: 'Referral placed — placement confirmed',
        text: `Your referral has been placed and a facility has been confirmed. Tracking code: ${tracking_id}. Check progress at ${trackingUrl}`,
        html: `<p>Hi,</p>
               <p>Your referral has been placed and a facility has been confirmed.</p>
               <p>Your referral tracking code is <strong>${tracking_id}</strong>.</p>
               <p>Check progress at <a href="${trackingUrl}">${trackingUrl}</a>.</p>
               <p>Thank you for using MMT Care Connect.</p>`,
      }).catch(err => {
        console.error('Referral placed email failed:', err);
      });
    } else if (status === 'rejected') {
      sendEmail({
        to: submittedEmail,
        subject: 'Referral updated — next steps',
        text: `Your referral status has been updated to rejected. Tracking code: ${tracking_id}. Check progress at ${trackingUrl}`,
        html: `<p>Hi,</p>
               <p>We reviewed your referral and it has been marked as rejected.</p>
               <p>Your referral tracking code is <strong>${tracking_id}</strong>.</p>
               <p>Check progress at <a href="${trackingUrl}">${trackingUrl}</a>.</p>`,
      }).catch(err => {
        console.error('Referral rejected email failed:', err);
      });
    } else {
      sendEmail({
        to: submittedEmail,
        subject: 'Referral status updated',
        text: `Your referral status has changed. Tracking code: ${tracking_id}. Check progress at ${trackingUrl}`,
        html: `<p>Hi,</p>
               <p>Your referral status has been updated.</p>
               <p>Your referral tracking code is <strong>${tracking_id}</strong>.</p>
               <p>Check progress at <a href="${trackingUrl}">${trackingUrl}</a>.</p>`,
      }).catch(err => {
        console.error('Referral status email failed:', err);
      });
    }
  }

  res.json({ data: referral });
}));

// POST /referrals/:id/email
router.post('/:id/email', asyncHandler(async (req: Request, res: Response) => {
  const { subject, html, text } = req.body;
  if (!subject?.trim()) throw new ValidationError('subject is required');
  if (!html?.trim() && !text?.trim()) throw new ValidationError('html or text body is required');

  const referral = await queryOne<Referral>('SELECT id, client_name, source_contact FROM referrals WHERE id=$1', [req.params.id]);
  if (!referral) throw new NotFoundError('Referral');

  const recipient = extractEmailFromContact(referral.source_contact);
  if (!recipient) throw new ValidationError('Referral submitter email is not available');

  await sendEmail({
    to: recipient,
    subject,
    html: html || `<p>${text}</p>`,
    text: text || undefined,
  });

  res.json({ data: { message: 'Email sent to referral submitter' } });
}));

// GET /referrals/:id/activity
router.get('/:id/activity', asyncHandler(async (req: Request, res: Response) => {
  const logs = await query(
    `SELECT al.*, row_to_json(u) as performer
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.performed_by
     WHERE al.entity_type='referral' AND al.entity_id=$1
     ORDER BY al.created_at DESC`,
    [req.params.id]
  );
  res.json({ data: logs });
}));

export default router;
