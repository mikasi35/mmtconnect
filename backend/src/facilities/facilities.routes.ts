import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Router, Request, Response } from 'express';
import { query, queryOne, withTransaction } from '../common/db';
import { authenticate, requireRoles } from '../common/auth.middleware';
import { asyncHandler, NotFoundError, ValidationError, paginate } from '../common/errors';
import { broadcastToStaff } from '../common/push';
import type { Facility, Vacancy } from '../../../shared/types';

const router = Router();
router.use(authenticate);
const facilityUploadRoot = path.resolve(process.cwd(), 'uploads', 'facilities');
fs.mkdirSync(facilityUploadRoot, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => cb(null, facilityUploadRoot),
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`);
    },
  }),
});
// ── Facilities ────────────────────────────────────────────────

// GET /facilities
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = paginate(req.query);
  const { type, state, search, active = 'true' } = req.query as any;

  const conditions: string[] = ['f.is_active = $1'];
  const params: any[] = [active !== 'false'];
  let p = 2;

  if (type)   { conditions.push(`f.type = $${p++}`);  params.push(type); }
  if (state)  { conditions.push(`f.state = $${p++}`); params.push(state); }
  if (search) {
    conditions.push(`(f.name ILIKE $${p} OR f.suburb ILIKE $${p})`);
    params.push(`%${search}%`); p++;
  }

  const where = conditions.join(' AND ');

  const [{ count }] = await query<{ count: string }>(
    `SELECT COUNT(*) FROM facilities f WHERE ${where}`, params
  );

  const facilities = await query<Facility>(
    `SELECT f.*,
      json_agg(v ORDER BY v.created_at) FILTER (WHERE v.id IS NOT NULL) as vacancies
     FROM facilities f
     LEFT JOIN vacancies v ON v.facility_id = f.id
     WHERE ${where}
     GROUP BY f.id
     ORDER BY f.name
     LIMIT $${p} OFFSET $${p+1}`,
    [...params, limit, offset]
  );

  res.json({
    data: facilities,
    total: parseInt(count),
    page, limit,
    has_next: offset + limit < parseInt(count),
  });
}));

// GET /facilities/:id
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const facility = await queryOne<Facility>(
    `SELECT f.*,
      json_agg(v ORDER BY v.created_at) FILTER (WHERE v.id IS NOT NULL) as vacancies
     FROM facilities f
     LEFT JOIN vacancies v ON v.facility_id = f.id
     WHERE f.id = $1
     GROUP BY f.id`,
    [req.params.id]
  );
  if (!facility) throw new NotFoundError('Facility');
  res.json({ data: facility });
}));

// POST /facilities
router.post('/', requireRoles('admin'), asyncHandler(async (req: Request, res: Response) => {
  const {
    name, type, address, suburb, state, postcode,
    latitude, longitude, description, image_url, image_urls,
    contact_name, contact_email, contact_phone, website_url, capacity,
    amenities, features, tenant_profile, eligibility, care_types,
    sda_design_category, is_published,
  } = req.body;

  if (!name || !type || !address || !suburb || !state) {
    throw new ValidationError('name, type, address, suburb and state are required');
  }
  if (!['SIL','SDA','STA'].includes(type)) {
    throw new ValidationError('type must be SIL, SDA or STA');
  }

  const facility = await queryOne<Facility>(
    `INSERT INTO facilities
       (name,type,address,suburb,state,postcode,latitude,longitude,description,image_url,image_urls,
        contact_name,contact_email,contact_phone,website_url,capacity,
        amenities,features,tenant_profile,eligibility,care_types,sda_design_category,is_published,
        created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
     RETURNING *`,
    [
      name, type, address, suburb, state, postcode ?? null,
      latitude ?? null, longitude ?? null, description ?? null,
      image_url ?? null,
      image_urls ? JSON.stringify(image_urls) : JSON.stringify([]),
      contact_name ?? null, contact_email ?? null, contact_phone ?? null,
      website_url ?? null,
      capacity ?? 1,
      JSON.stringify(amenities ?? []),
      JSON.stringify(features ?? []),
      tenant_profile ?? null,
      eligibility ?? null,
      JSON.stringify(care_types ?? []),
      sda_design_category ?? null,
      is_published !== false,
      req.user!.sub,
    ]
  );

  await query(
    `INSERT INTO activity_logs (entity_type,entity_id,action,metadata,performed_by)
     VALUES ('facility',$1,'facility_created',$2,$3)`,
    [facility!.id, JSON.stringify({ name }), req.user!.sub]
  );

  res.status(201).json({ data: facility });
}));

// PATCH /facilities/:id
router.patch('/:id', requireRoles('admin'), asyncHandler(async (req: Request, res: Response) => {
  const existing = await queryOne('SELECT id FROM facilities WHERE id=$1', [req.params.id]);
  if (!existing) throw new NotFoundError('Facility');

  const fields = [
    'name','type','address','suburb','state','postcode','latitude','longitude',
    'description','image_url','image_urls','contact_name','contact_email','contact_phone',
    'website_url','capacity','is_active','is_published',
    'amenities','features','tenant_profile','eligibility','care_types','sda_design_category',
  ];
  const jsonbFields = new Set(['image_urls','amenities','features','care_types']);
  const updates: string[] = [];
  const params: any[]     = [];
  let p = 1;

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${p++}`);
      params.push(jsonbFields.has(f) ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }

  if (!updates.length) throw new ValidationError('No valid fields to update');
  params.push(req.params.id);

  const facility = await queryOne<Facility>(
    `UPDATE facilities SET ${updates.join(',')} WHERE id=$${p} RETURNING *`,
    params
  );

  res.json({ data: facility });
}));

// DELETE /facilities/:id (soft delete)
router.post('/:id/images', requireRoles('admin'), upload.array('images', 10), asyncHandler(async (req: Request, res: Response) => {
  const facility = await queryOne('SELECT id FROM facilities WHERE id=$1', [req.params.id]);
  if (!facility) throw new NotFoundError('Facility');
  const files = ((req as Request & { files?: Express.Multer.File[] }).files) || [];
  if (!files.length) throw new ValidationError('At least one image is required');

  const urls = files.map(file => `/uploads/facilities/${file.filename}`);
  const updated = await queryOne<Facility>(
    `UPDATE facilities
       SET image_urls = COALESCE(image_urls, '[]'::jsonb) || $1::jsonb
       WHERE id = $2
       RETURNING *`,
    [JSON.stringify(urls), req.params.id]
  );

  res.status(200).json({ data: updated });
}));

router.delete('/:id', requireRoles('admin'), asyncHandler(async (req: Request, res: Response) => {
  await queryOne('UPDATE facilities SET is_active=false WHERE id=$1', [req.params.id]);
  res.json({ data: { message: 'Facility deactivated' } });
}));

// ── Vacancies ─────────────────────────────────────────────────

// GET /vacancies  (standalone endpoint for available vacancies)
router.get('/vacancies/available', asyncHandler(async (_req: Request, res: Response) => {
  const vacancies = await query<Vacancy>(
    `SELECT v.*, row_to_json(f) as facility
     FROM vacancies v
     JOIN facilities f ON f.id = v.facility_id
     WHERE v.status = 'available' AND f.is_active = true
     ORDER BY f.name, v.label`
  );
  res.json({ data: vacancies });
}));

// POST /facilities/:id/vacancies
router.post('/:id/vacancies', requireRoles('admin'), asyncHandler(async (req: Request, res: Response) => {
  const facility = await queryOne('SELECT id FROM facilities WHERE id=$1', [req.params.id]);
  if (!facility) throw new NotFoundError('Facility');

  const { label, care_level_supported = {}, start_date, end_date, notes } = req.body;

  const vacancy = await queryOne<Vacancy>(
    `INSERT INTO vacancies (facility_id,label,care_level_supported,start_date,end_date,notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [req.params.id, label ?? null, JSON.stringify(care_level_supported),
     start_date ?? new Date().toISOString().slice(0,10), end_date ?? null, notes ?? null]
  );

  await query(
    `INSERT INTO activity_logs (entity_type,entity_id,action,metadata,performed_by)
     VALUES ('vacancy',$1,'vacancy_created',$2,$3)`,
    [vacancy!.id, JSON.stringify({ facility_id: req.params.id, label }), req.user!.sub]
  );

  // Push: notify all staff that a new bed is available
  const fac = await queryOne<{ name: string; suburb: string; state: string }>(
    'SELECT name, suburb, state FROM facilities WHERE id=$1', [req.params.id]
  );
  if (fac) {
    broadcastToStaff({
      title:     'New vacancy posted',
      body:      `${fac.name} — ${fac.suburb}, ${fac.state} has a new bed available.`,
      data:      { screen: 'facilities', facilityId: req.params.id, vacancyId: vacancy!.id },
      channelId: 'vacancies',
    }).catch(() => {});
  }

  res.status(201).json({ data: vacancy });
}));

// PATCH /vacancies/:vacancyId/status
router.patch('/vacancies/:vacancyId/status', requireRoles('admin', 'coordinator'), asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['available','reserved','occupied'].includes(status)) {
    throw new ValidationError('status must be available, reserved or occupied');
  }

  const vacancy = await queryOne<Vacancy>(
    `UPDATE vacancies SET status=$1 WHERE id=$2 RETURNING *`,
    [status, req.params.vacancyId]
  );
  if (!vacancy) throw new NotFoundError('Vacancy');

  await query(
    `INSERT INTO activity_logs (entity_type,entity_id,action,metadata,performed_by)
     VALUES ('vacancy',$1,'vacancy_status_changed',$2,$3)`,
    [vacancy.id, JSON.stringify({ status }), req.user!.sub]
  );

  res.json({ data: vacancy });
}));

// PATCH /vacancies/:vacancyId
router.patch('/vacancies/:vacancyId', requireRoles('admin', 'coordinator'), asyncHandler(async (req: Request, res: Response) => {
  const fields = ['label','care_level_supported','status','start_date','end_date','notes'];
  const updates: string[] = [];
  const params: any[] = [];
  let p = 1;

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = $${p++}`);
      params.push(f === 'care_level_supported' ? JSON.stringify(req.body[f]) : req.body[f]);
    }
  }
  if (!updates.length) throw new ValidationError('No valid fields to update');

  params.push(req.params.vacancyId);
  const vacancy = await queryOne<Vacancy>(
    `UPDATE vacancies SET ${updates.join(',')} WHERE id=$${p} RETURNING *`,
    params
  );
  if (!vacancy) throw new NotFoundError('Vacancy');
  res.json({ data: vacancy });
}));

export default router;
