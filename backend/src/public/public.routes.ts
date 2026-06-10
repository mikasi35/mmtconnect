import { Router, Request, Response } from 'express';
import cors from 'cors';
import { query, queryOne } from '../common/db';
import { asyncHandler, ValidationError } from '../common/errors';
import { sendEmail, buildTrackingUrl, getPublicSiteUrl } from '../common/email';
import { searchFacilities, normaliseState } from './location.engine';

const router = Router();

// Public routes allow any origin so mmtcare.com.au can pull data with a script tag
router.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
router.options('*', cors({ origin: '*' }));

// ── GET /public/facilities ────────────────────────────────────────────────────
// Smart search: handles GPS, fuzzy suburb/city, care filters, state, type.
// Query params: search, state, type, care_needs, lat, lng, radius, limit
router.get('/facilities', asyncHandler(async (req: Request, res: Response) => {
  const {
    search, state, type, care_needs,
    lat, lng, radius, limit,
  } = req.query as Record<string, string>;

  const facilities = await searchFacilities({
    search:     search?.trim() || undefined,
    state:      state          || undefined,
    type:       type           || undefined,
    care_needs: care_needs     || undefined,
    lat:        lat   ? parseFloat(lat)    : undefined,
    lng:        lng   ? parseFloat(lng)    : undefined,
    radius:     radius ? parseFloat(radius) : 50,
    limit:      limit  ? parseInt(limit)   : 30,
  });

  res.json({ data: facilities });
}));

// ── GET /public/facilities/nearby ────────────────────────────────────────────
// GPS-first: requires lat + lng. Returns facilities sorted by distance.
// Used by the mobile home screen on app load.
router.get('/facilities/nearby', asyncHandler(async (req: Request, res: Response) => {
  const { lat, lng, radius, type, care_needs } = req.query as Record<string, string>;

  if (!lat || !lng) {
    throw new ValidationError('lat and lng are required');
  }

  const facilities = await searchFacilities({
    lat:        parseFloat(lat),
    lng:        parseFloat(lng),
    radius:     radius ? parseFloat(radius) : 50,
    type:       type       || undefined,
    care_needs: care_needs || undefined,
    limit:      10,
  });

  res.json({ data: facilities });
}));

// ── GET /public/facilities/:id ────────────────────────────────────────────────
router.get('/facilities/:id', asyncHandler(async (req: Request, res: Response) => {
  const facility = await queryOne(
    `SELECT
       f.id, f.name, f.type, f.address, f.suburb, f.state, f.postcode,
       f.description,
       f.contact_phone, f.contact_email, f.website_url, f.contact_name,
       f.image_url, COALESCE(f.image_urls, '[]'::jsonb) AS image_urls,
       f.latitude, f.longitude,
       COALESCE(f.amenities, '[]'::jsonb)    AS amenities,
       COALESCE(f.features,  '[]'::jsonb)    AS features,
       COALESCE(f.care_types,'[]'::jsonb)    AS care_types,
       f.tenant_profile, f.eligibility, f.sda_design_category,
       COUNT(v.id) FILTER (WHERE v.status = 'available')::int AS available_beds,
       COUNT(v.id)::int AS total_beds,
       jsonb_agg(
         jsonb_build_object(
           'id',                   v.id,
           'status',               v.status,
           'label',                v.label,
           'care_level_supported', v.care_level_supported,
           'start_date',           v.start_date,
           'notes',                v.notes
         ) ORDER BY v.created_at
       ) FILTER (WHERE v.id IS NOT NULL) AS vacancies
     FROM facilities f
     LEFT JOIN vacancies v ON v.facility_id = f.id
     WHERE f.id = $1 AND f.is_active = true AND f.is_published = true
     GROUP BY f.id`,
    [req.params.id]
  );

  if (!facility) {
    res.status(404).json({ error: 'NotFound', message: 'Facility not found', statusCode: 404 });
    return;
  }

  res.json({ data: facility });
}));

// ── GET /public/vacancies ───────────────────────────────────────────────────
router.get('/vacancies', asyncHandler(async (req: Request, res: Response) => {
  const { state, type, care_needs, limit } = req.query as Record<string, string>;
  const conditions: string[] = ['v.status = $1', 'f.is_active = true'];
  const params: any[] = ['available'];
  let p = 2;

  if (type) {
    conditions.push(`f.type = $${p++}`);
    params.push(type.toUpperCase());
  }
  if (state) {
    conditions.push(`f.state = $${p++}`);
    params.push(normaliseState(state) ?? state.toUpperCase());
  }
  if (care_needs) {
    const needs = care_needs.split(',').map(k => k.trim()).filter(Boolean);
    if (needs.length) {
      const needChecks = needs
        .map((_, i) => `(v.care_level_supported->>'${needs[i]}')::boolean = true`)
        .join(' AND ');
      conditions.push(`(${needChecks})`);
    }
  }

  const q = conditions.join(' AND ');
  const maxLimit = limit ? parseInt(limit, 10) : 50;
  const vacancyRows = await query(
    `SELECT v.*, row_to_json(f) AS facility
     FROM vacancies v
     JOIN facilities f ON f.id = v.facility_id
     WHERE ${q}
     ORDER BY f.name, v.label
     LIMIT $${p}`,
    [...params, Number.isNaN(maxLimit) ? 50 : maxLimit]
  );

  res.json({ data: vacancyRows });
}));

// ── POST /public/referrals ────────────────────────────────────────────────────
router.post('/referrals', asyncHandler(async (req: Request, res: Response) => {
  const {
    client_name, client_age, care_needs = {}, urgency = 'medium',
    location_preference, submitter_name, submitter_email,
    submitter_phone, submitter_relationship, notes, preferred_facility_id,
  } = req.body;

  if (!client_name?.trim())   throw new ValidationError('client_name is required');
  if (client_age === undefined || client_age === null) throw new ValidationError('client_age is required');
  if (!submitter_name?.trim()) throw new ValidationError('Your name (submitter_name) is required');
  if (!submitter_email?.trim()) throw new ValidationError('Your email is required so we can send referral tracking details');

  const systemUser = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE role = 'admin' AND is_active = true ORDER BY created_at LIMIT 1`
  );
  if (!systemUser) throw new ValidationError('No admins available. Please call us directly.');

  const contactParts = [submitter_name];
  if (submitter_relationship) contactParts.push(`(${submitter_relationship})`);
  if (submitter_email)        contactParts.push(submitter_email);
  if (submitter_phone)        contactParts.push(submitter_phone);
  const source_contact = contactParts.join(' · ');

  const referral = await queryOne<{ id: string; client_name: string; urgency: string; status: string; created_at: string }>(
    `INSERT INTO referrals
       (client_name, client_age, care_needs, urgency, location_preference,
        source_type, source_contact, notes, submitted_by, assigned_facility_id)
     VALUES ($1,$2,$3,$4,$5,'family',$6,$7,$8,$9)
     RETURNING id, client_name, urgency, status, created_at`,
    [
      client_name.trim(), parseInt(client_age),
      JSON.stringify(care_needs), urgency,
      location_preference ?? null, source_contact,
      notes ?? null, systemUser.id, preferred_facility_id ?? null,
    ]
  );

  await query(
    `INSERT INTO activity_logs (entity_type, entity_id, action, metadata)
     VALUES ('referral', $1, 'public_referral_submitted', $2)`,
    [referral!.id, JSON.stringify({ client_name, submitter_name, submitter_relationship, preferred_facility_id: preferred_facility_id ?? null })]
  );

  const tracking_id = referral!.id.slice(0, 8).toUpperCase();
  const publicUrl = getPublicSiteUrl();
  const trackingUrl = buildTrackingUrl(tracking_id);
  const adminEmails = (await query<{ email: string }>(
    `SELECT email FROM users WHERE role = 'admin' AND is_active = true AND email IS NOT NULL`
  )).map(row => row.email);

  const emailTasks: Promise<any>[] = [];

  if (submitter_email) {
    emailTasks.push(sendEmail({
      to: submitter_email,
      subject: 'MMT Care Connect referral received',
      text: `Thanks ${submitter_name}. Your referral for ${client_name} has been received. Your tracking code is ${tracking_id}. Track progress at ${trackingUrl}`,
      html: `<p>Thanks ${submitter_name},</p>
             <p>We have received your referral for <strong>${client_name}</strong>.</p>
             <p>Your referral tracking code is <strong>${tracking_id}</strong>.</p>
             <p>You can check your referral status at <a href="${trackingUrl}">${trackingUrl}</a>.</p>
             <p>Our team will contact you within 1 business day.</p>`,
    }));
  }

  if (adminEmails.length) {
    emailTasks.push(sendEmail({
      to: adminEmails,
      subject: `New referral submitted: ${client_name}`,
      text: `A new referral was submitted by ${submitter_name} (${submitter_relationship || 'relationship not provided'}) for ${client_name}. Tracking code: ${tracking_id}. Review the admin dashboard at ${publicUrl}/dashboard/referrals.`,
      html: `<p><strong>New referral submitted</strong></p>
             <p><strong>Client:</strong> ${client_name}</p>
             <p><strong>Urgency:</strong> ${urgency}</p>
             <p><strong>Submitted by:</strong> ${submitter_name}${submitter_relationship ? ` (${submitter_relationship})` : ''}</p>
             <p><strong>Contact:</strong> ${submitter_email || 'No email provided'}${submitter_phone ? ` · ${submitter_phone}` : ''}</p>
             <p><strong>Tracking code:</strong> ${tracking_id}</p>
             <p>Review details in the admin dashboard: <a href="${publicUrl}/dashboard/referrals">${publicUrl}/dashboard/referrals</a></p>`,
    }));
  }

  Promise.all(emailTasks).catch(err => {
    console.error('Failed to send referral notification emails:', err);
  });

  res.status(201).json({
    data: {
      id:          referral!.id,
      message:     'Your referral has been submitted. An admin will contact you within 1 business day.',
      tracking_id,
      client_name: referral!.client_name,
      urgency:     referral!.urgency,
      status:      referral!.status,
      created_at:  referral!.created_at,
    },
  });
}));

// ── GET /public/referrals/track/:trackingId ───────────────────────────────────
router.get('/referrals/track/:trackingId', asyncHandler(async (req: Request, res: Response) => {
  const like = (req.params.trackingId as string).toLowerCase() + '%';

  const referral = await queryOne(
    `SELECT
       id, client_name, urgency, status, location_preference,
       source_type, created_at, updated_at, placed_at,
       CASE WHEN status = 'placed' THEN
         (SELECT f.name FROM facilities f WHERE f.id = r.assigned_facility_id)
       END AS placed_facility_name,
       CASE WHEN status = 'placed' THEN
         (SELECT f.suburb || ', ' || f.state FROM facilities f WHERE f.id = r.assigned_facility_id)
       END AS placed_facility_location
     FROM referrals r
     WHERE LOWER(id::text) LIKE $1 AND source_type = 'family'`,
    [like]
  );

  if (!referral) {
    res.status(404).json({ error: 'NotFound', message: 'Referral not found. Check your tracking ID.', statusCode: 404 });
    return;
  }

  res.json({ data: referral });
}));

// ── GET /public/states ────────────────────────────────────────────────────────
router.get('/states', asyncHandler(async (_req: Request, res: Response) => {
  const states = await query(
    `SELECT f.state,
       COUNT(DISTINCT f.id)::int AS facility_count,
       COUNT(v.id) FILTER (WHERE v.status = 'available')::int AS available_beds
     FROM facilities f
     LEFT JOIN vacancies v ON v.facility_id = f.id
     WHERE f.is_active = true
     GROUP BY f.state
     ORDER BY available_beds DESC`
  );
  res.json({ data: states });
}));

export default router;
