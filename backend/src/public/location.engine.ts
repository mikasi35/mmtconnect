/**
 * Smart Location Matching Engine
 *
 * Handles all the ways a user might describe a location:
 *   - GPS coordinates        → Haversine radius search
 *   - Exact suburb           → direct match
 *   - Misspelled suburb      → pg_trgm similarity
 *   - City name              → maps to state + bounding coords
 *   - Partial input          → prefix + trigram fallback
 *   - State abbreviation     → filter by state
 *   - "Sydney", "Melbourne"  → known city coords + state
 */

import { query } from '../common/db';

// ── Australian state normalisation ───────────────────────────────────────────

const STATE_ALIASES: Record<string, string> = {
  'new south wales':       'NSW',
  'nsw':                   'NSW',
  'victoria':              'VIC',
  'vic':                   'VIC',
  'queensland':            'QLD',
  'qld':                   'QLD',
  'western australia':     'WA',
  'wa':                    'WA',
  'south australia':       'SA',
  'sa':                    'SA',
  'tasmania':              'TAS',
  'tas':                   'TAS',
  'northern territory':    'NT',
  'nt':                    'NT',
  'australian capital territory': 'ACT',
  'act':                   'ACT',
  'canberra':              'ACT',
};

export function normaliseState(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return STATE_ALIASES[key] ?? null;
}

// ── Major Australian city → approximate centroid + state ─────────────────────
// Used when user types a city name with no GPS available.

interface CityEntry {
  state:  string;
  lat:    number;
  lng:    number;
  radius: number;   // km — how wide to search around the city centre
}

const CITY_MAP: Record<string, CityEntry> = {
  // NSW
  'sydney':        { state:'NSW', lat:-33.8688, lng:151.2093, radius:40 },
  'newcastle':     { state:'NSW', lat:-32.9283, lng:151.7817, radius:25 },
  'wollongong':    { state:'NSW', lat:-34.4278, lng:150.8931, radius:20 },
  'central coast': { state:'NSW', lat:-33.4333, lng:151.3500, radius:20 },
  // VIC
  'melbourne':     { state:'VIC', lat:-37.8136, lng:144.9631, radius:40 },
  'geelong':       { state:'VIC', lat:-38.1499, lng:144.3617, radius:20 },
  'ballarat':      { state:'VIC', lat:-37.5622, lng:143.8503, radius:15 },
  // QLD
  'brisbane':      { state:'QLD', lat:-27.4698, lng:153.0251, radius:35 },
  'gold coast':    { state:'QLD', lat:-28.0167, lng:153.4000, radius:25 },
  'sunshine coast':{ state:'QLD', lat:-26.6500, lng:153.0667, radius:25 },
  'cairns':        { state:'QLD', lat:-16.9186, lng:145.7781, radius:20 },
  'townsville':    { state:'QLD', lat:-19.2590, lng:146.8169, radius:20 },
  // WA
  'perth':         { state:'WA',  lat:-31.9505, lng:115.8605, radius:40 },
  'fremantle':     { state:'WA',  lat:-32.0569, lng:115.7439, radius:10 },
  'bunbury':       { state:'WA',  lat:-33.3271, lng:115.6380, radius:15 },
  // SA
  'adelaide':      { state:'SA',  lat:-34.9285, lng:138.6007, radius:35 },
  'glenelg':       { state:'SA',  lat:-34.9825, lng:138.5149, radius:10 },
  // TAS
  'hobart':        { state:'TAS', lat:-42.8821, lng:147.3272, radius:20 },
  'launceston':    { state:'TAS', lat:-41.4332, lng:147.1441, radius:15 },
  // NT
  'darwin':        { state:'NT',  lat:-12.4634, lng:130.8456, radius:20 },
  // ACT
  'canberra':      { state:'ACT', lat:-35.2809, lng:149.1300, radius:20 },
};

/** Try to match a free-text location string to a known city entry */
export function matchCity(text: string): CityEntry | null {
  const lower = text.trim().toLowerCase();
  // Exact match first
  if (CITY_MAP[lower]) return CITY_MAP[lower];
  // Partial match (user typed "brisb", "melb" etc.)
  for (const [name, entry] of Object.entries(CITY_MAP)) {
    if (name.startsWith(lower) || lower.startsWith(name)) return entry;
  }
  return null;
}

// ── Core search function ──────────────────────────────────────────────────────

export interface LocationSearchParams {
  // GPS path
  lat?:        number;
  lng?:        number;
  radius?:     number;   // km, default 50
  // Text path
  search?:     string;   // suburb, city, or facility name
  // Standard filters (always applied)
  state?:      string;
  type?:       string;
  care_needs?: string;
  limit?:      number;
}

export interface FacilityResult {
  id:                   string;
  name:                 string;
  type:                 string;
  suburb:               string;
  state:                string;
  postcode:             string | null;
  description:          string | null;
  image_url?:           string | null;
  image_urls?:          string[] | null;
  contact_phone:        string | null;
  contact_email:        string | null;
  website_url?:         string | null;
  latitude:             number | null;
  longitude:            number | null;
  amenities:            string[];
  features:             string[];
  care_types:           string[];
  eligibility?:         string | null;
  sda_design_category?: string | null;
  available_beds:       number;
  total_beds:           number;
  supported_care:       Record<string, boolean>;
  distance_km?:         number;
  match_score?:         number;
}

export async function searchFacilities(params: LocationSearchParams): Promise<FacilityResult[]> {
  const {
    lat, lng,
    radius = 50,
    search,
    state,
    type,
    care_needs,
    limit = 30,
  } = params;

  const conditions: string[] = [
    "f.is_active = true",
    "f.is_published = true",
    "EXISTS (SELECT 1 FROM vacancies v2 WHERE v2.facility_id = f.id AND v2.status = 'available')",
  ];
  const sqlParams: any[] = [];
  let p = 1;

  // ── GPS proximity filter ─────────────────────────────────────
  let distanceExpr = 'NULL::float';
  let cityEntry: CityEntry | null = null;

  if (lat != null && lng != null) {
    // Haversine bounding box pre-filter (fast, uses the lat/lng index)
    const latDelta = radius / 111.0;
    const lngDelta = radius / (111.0 * Math.cos((lat * Math.PI) / 180));
    conditions.push(
      `f.latitude  BETWEEN $${p} AND $${p+1}`,
      `f.longitude BETWEEN $${p+2} AND $${p+3}`,
    );
    sqlParams.push(lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta);
    p += 4;

    // Exact haversine for ORDER BY
    distanceExpr = `
      (6371 * acos(
        cos(radians($${p})) * cos(radians(f.latitude)) *
        cos(radians(f.longitude) - radians($${p+1})) +
        sin(radians($${p})) * sin(radians(f.latitude))
      ))
    `;
    sqlParams.push(lat, lng);
    p += 2;
  } else if (search) {
    // No GPS — try to match the search text to a known city
    cityEntry = matchCity(search);
    if (cityEntry) {
      const r = cityEntry.radius;
      const latDelta = r / 111.0;
      const lngDelta = r / (111.0 * Math.cos((cityEntry.lat * Math.PI) / 180));
      conditions.push(
        `(f.latitude  IS NULL OR f.latitude  BETWEEN $${p}   AND $${p+1})`,
        `(f.longitude IS NULL OR f.longitude BETWEEN $${p+2} AND $${p+3})`,
      );
      sqlParams.push(
        cityEntry.lat - latDelta, cityEntry.lat + latDelta,
        cityEntry.lng - lngDelta, cityEntry.lng + lngDelta,
      );
      p += 4;

      // If city implies a state and no explicit state filter, use city's state
      if (!state) {
        conditions.push(`f.state = $${p++}`);
        sqlParams.push(cityEntry.state);
      }
    }
  }

  // ── State filter ─────────────────────────────────────────────
  if (state) {
    const normState = normaliseState(state) ?? state.toUpperCase();
    conditions.push(`f.state = $${p++}`);
    sqlParams.push(normState);
  }

  // ── Type filter ──────────────────────────────────────────────
  if (type) {
    conditions.push(`f.type = $${p++}`);
    sqlParams.push(type.toUpperCase());
  }

  // ── Care needs filter ────────────────────────────────────────
  let careJoin = '';
  if (care_needs) {
    const needs = care_needs.split(',').map(k => k.trim()).filter(Boolean);
    if (needs.length) {
      const needChecks = needs
        .map((_n, i) => `(vc.care_level_supported->>'${needs[i]}')::boolean = true`)
        .join(' AND ');
      careJoin = `
        AND EXISTS (
          SELECT 1 FROM vacancies vc
          WHERE vc.facility_id = f.id
            AND vc.status = 'available'
            AND ${needChecks}
        )`;
    }
  }

  // ── Text search (suburb / name / description) ─────────────────
  // Applied ONLY when no city match was found from the search text.
  // Combines ILIKE prefix match + trigram similarity for fuzzy results.
  let textScoreExpr = '1.0::float';
  if (search && !cityEntry) {
    const term = search.trim();
    conditions.push(`(
      f.name    ILIKE $${p}
      OR f.suburb   ILIKE $${p}
      OR f.state    ILIKE $${p}
      OR f.postcode ILIKE $${p}
      OR f.description ILIKE $${p}
      OR similarity(f.suburb, $${p+1}) > 0.2
      OR similarity(f.name,   $${p+1}) > 0.2
    )`);
    sqlParams.push(`%${term}%`, term);
    p += 2;

    textScoreExpr = `GREATEST(
      similarity(f.suburb, $${p}),
      similarity(f.name,   $${p})
    )`;
    sqlParams.push(term);
    p += 1;
  }

  const where = conditions.join(' AND ');

  const rows = await query<any>(
    `SELECT
       f.id, f.name, f.type, f.suburb, f.state, f.postcode,
       f.description, f.image_url, f.image_urls, f.contact_phone, f.contact_email, f.website_url,
       f.latitude, f.longitude,
       COALESCE(f.amenities, '[]'::jsonb)     AS amenities,
       COALESCE(f.features,  '[]'::jsonb)     AS features,
       COALESCE(f.care_types,'[]'::jsonb)     AS care_types,
       f.eligibility, f.sda_design_category,
       COUNT(v.id) FILTER (WHERE v.status = 'available')::int AS available_beds,
       COUNT(v.id)::int                                        AS total_beds,
       (
         SELECT jsonb_object_agg(key, value)
         FROM (
           SELECT
             vk.key,
             bool_or(COALESCE((v2.care_level_supported->>vk.key)::boolean, false)) AS value
           FROM vacancies v2
           CROSS JOIN LATERAL jsonb_object_keys(v2.care_level_supported) AS vk(key)
           WHERE v2.facility_id = f.id
             AND v2.status = 'available'
           GROUP BY vk.key
         ) sub
       ) AS supported_care,
       (${distanceExpr})                                       AS distance_km,
       (${textScoreExpr})                                      AS match_score
     FROM facilities f
     LEFT JOIN vacancies v ON v.facility_id = f.id
     WHERE ${where} ${careJoin}
     GROUP BY f.id
     ORDER BY
       -- GPS results: closest first
       CASE WHEN (${distanceExpr}) IS NOT NULL THEN (${distanceExpr}) END ASC NULLS LAST,
       -- Text results: best similarity first
       (${textScoreExpr}) DESC,
       -- Fallback: most beds
       available_beds DESC,
       f.name ASC
     LIMIT $${p}`,
    [...sqlParams, limit],
  );

  return rows.map(r => ({
    ...r,
    available_beds: parseInt(r.available_beds ?? '0'),
    total_beds:     parseInt(r.total_beds ?? '0'),
    distance_km:    r.distance_km != null ? parseFloat(parseFloat(r.distance_km).toFixed(1)) : undefined,
    match_score:    r.match_score != null ? parseFloat(parseFloat(r.match_score).toFixed(3)) : undefined,
  }));
}
