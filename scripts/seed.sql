-- ============================================================
--  MMT Care Connect — Seed Data
--  Realistic Australian NDIS facilities + referrals
-- ============================================================

-- ── Get admin user id ─────────────────────────────────────────
DO $$
DECLARE
  admin_id    UUID;
  coord_id    UUID;
  f1 UUID; f2 UUID; f3 UUID; f4 UUID; f5 UUID;
  v1 UUID; v2 UUID; v3 UUID; v4 UUID; v5 UUID;
  v6 UUID; v7 UUID; v8 UUID; v9 UUID; v10 UUID;
BEGIN
  SELECT id INTO admin_id FROM users WHERE email='admin@mmtcare.com.au';
  SELECT id INTO coord_id FROM users WHERE email='sarah@mmtcare.com.au';

  -- ── Facilities ──────────────────────────────────────────────

  INSERT INTO facilities (id,name,type,address,suburb,state,postcode,latitude,longitude,description,image_url,image_urls,contact_name,contact_email,contact_phone,capacity,created_by)
  VALUES
    (uuid_generate_v4(),'Harbour View SIL House','SIL','12 Harbour St','Manly','NSW','2095',-33.7969,151.2831,'Purpose-built 4-bed SIL with ocean views and accessible bathrooms. 24h support available.','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80','["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"]'::jsonb,'Michael Osei','m.osei@harbourview.com.au','02 9977 1234',4,admin_id),
    (uuid_generate_v4(),'Parkside SDA Apartments','SDA','45 Park Ave','South Yarra','VIC','3141',-37.8397,144.9927,'Fully accessible high physical support SDA apartments. Automated doors, hoist rails, emergency call system.','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80','["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80"]'::jsonb,'Linda Chen','l.chen@parkside.com.au','03 9820 5678',3,admin_id),
    (uuid_generate_v4(),'Sunridge Respite Centre','STA','88 Ridge Rd','Chermside','QLD','4032',-27.3878,153.0307,'Award-winning STA facility with 24h nursing, sensory room, hydrotherapy pool.','https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80','["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"]'::jsonb,'James Mwangi','j.mwangi@sunridge.com.au','07 3350 9012',6,admin_id),
    (uuid_generate_v4(),'Elmwood Community Lodge','SIL','3 Elm Ct','Fremantle','WA','6160',-32.0569,115.7439,'Community-integrated SIL for young adults 18-35. Strong behaviour support program.','https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80','["https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80"]'::jsonb,'Rachel Torres','r.torres@elmwood.com.au','08 9335 3456',5,admin_id),
    (uuid_generate_v4(),'Clearwater Accessible Units','SDA','21 Bay Rd','Glenelg','SA','5045',-34.9825,138.5149,'Improved liveability SDA units near beach. Allied health on-site Tues/Thurs.','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80','["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80"]'::jsonb,'Tom Nguyen','t.nguyen@clearwater.com.au','08 8294 7890',4,admin_id);

  -- Re-select facility IDs by name for vacancies
  SELECT id INTO f1 FROM facilities WHERE name='Harbour View SIL House';
  SELECT id INTO f2 FROM facilities WHERE name='Parkside SDA Apartments';
  SELECT id INTO f3 FROM facilities WHERE name='Sunridge Respite Centre';
  SELECT id INTO f4 FROM facilities WHERE name='Elmwood Community Lodge';
  SELECT id INTO f5 FROM facilities WHERE name='Clearwater Accessible Units';

  -- ── Vacancies ───────────────────────────────────────────────

  INSERT INTO vacancies (id,facility_id,status,label,care_level_supported,start_date)
  VALUES
    (uuid_generate_v4(),f1,'available','Room 1 – Ground floor, ensuite','{"personal_care":true,"overnight_support":true,"24h_support":true,"nursing":false,"behavioural_support":false,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f1,'available','Room 2 – Garden view, WC access','{"personal_care":true,"overnight_support":true,"24h_support":true,"nursing":false,"behavioural_support":true,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f1,'available','Room 3 – First floor','{"personal_care":true,"overnight_support":true,"24h_support":false,"nursing":false,"behavioural_support":false,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f1,'occupied','Room 4 – Master suite','{"personal_care":true,"overnight_support":true,"24h_support":true,"nursing":true,"behavioural_support":false,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f2,'available','Apt 3A – High physical support','{"personal_care":true,"overnight_support":true,"24h_support":true,"nursing":true,"behavioural_support":false,"complex_medical":true}',CURRENT_DATE),
    (uuid_generate_v4(),f2,'reserved','Apt 3B – Robust design','{"personal_care":true,"overnight_support":true,"24h_support":true,"nursing":false,"behavioural_support":true,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f2,'occupied','Apt 3C','{"personal_care":true,"overnight_support":true,"24h_support":false,"nursing":false,"behavioural_support":false,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f3,'available','Respite Room A','{"personal_care":true,"overnight_support":true,"24h_support":true,"nursing":true,"behavioural_support":true,"complex_medical":true}',CURRENT_DATE),
    (uuid_generate_v4(),f3,'available','Respite Room B','{"personal_care":true,"overnight_support":true,"24h_support":true,"nursing":true,"behavioural_support":false,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f3,'available','Respite Room C','{"personal_care":true,"overnight_support":true,"24h_support":false,"nursing":false,"behavioural_support":true,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f3,'occupied','Respite Room D','{}',CURRENT_DATE),
    (uuid_generate_v4(),f3,'occupied','Respite Room E','{}',CURRENT_DATE),
    (uuid_generate_v4(),f3,'available','Respite Room F','{"personal_care":true,"overnight_support":true,"24h_support":true,"nursing":false,"behavioural_support":false,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f4,'available','Room A','{"personal_care":true,"overnight_support":false,"24h_support":false,"nursing":false,"behavioural_support":true,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f4,'available','Room B','{"personal_care":true,"overnight_support":true,"24h_support":false,"nursing":false,"behavioural_support":true,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f4,'available','Room C','{"personal_care":true,"overnight_support":false,"24h_support":false,"nursing":false,"behavioural_support":false,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f4,'available','Room D','{"personal_care":true,"overnight_support":true,"24h_support":false,"nursing":false,"behavioural_support":true,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f4,'occupied','Room E','{}',CURRENT_DATE),
    (uuid_generate_v4(),f5,'available','Unit 1 – Beachside','{"personal_care":true,"overnight_support":false,"24h_support":false,"nursing":false,"behavioural_support":false,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f5,'available','Unit 2','{"personal_care":true,"overnight_support":true,"24h_support":false,"nursing":false,"behavioural_support":false,"complex_medical":false}',CURRENT_DATE),
    (uuid_generate_v4(),f5,'occupied','Unit 3','{}',CURRENT_DATE),
    (uuid_generate_v4(),f5,'occupied','Unit 4','{}',CURRENT_DATE);

  -- ── Referrals ───────────────────────────────────────────────

  INSERT INTO referrals (client_name,client_age,care_needs,urgency,location_preference,source_type,source_contact,notes,status,submitted_by,created_at)
  VALUES
    ('James Thompson',42,'{"personal_care":true,"overnight_support":true,"24h_support":true,"nursing":false,"behavioural_support":false,"complex_medical":false}','immediate','Sydney, NSW','hospital','Royal North Shore Hospital','Client requires 24h support post-hospital discharge in 3 days. Acquired brain injury.','new',coord_id,NOW() - INTERVAL '2 hours'),
    ('Priya Mehta',31,'{"personal_care":true,"overnight_support":true,"24h_support":false,"nursing":false,"behavioural_support":true,"complex_medical":false}','high','Melbourne, VIC','coordinator','ABC Support Coordination','Complex behavioural support needs. Current living situation unsafe.','reviewing',coord_id,NOW() - INTERVAL '8 hours'),
    ('Mark Davidson',56,'{"personal_care":true,"overnight_support":true,"24h_support":false,"nursing":false,"behavioural_support":false,"complex_medical":false}','medium','Brisbane, QLD','family','Mary Davidson (sister)','Wheelchair user, needs accessible accommodation. No urgency but current rental ending soon.','reviewing',coord_id,NOW() - INTERVAL '1 day'),
    ('Sarah Kim',29,'{"personal_care":true,"overnight_support":true,"24h_support":true,"nursing":true,"behavioural_support":false,"complex_medical":true}','high','Perth, WA','hospital','Sir Charles Gairdner Hospital','Complex medical needs. Ventilator-dependent. Requires high physical support SDA.','matched',coord_id,NOW() - INTERVAL '2 days'),
    ('Chen Wei',67,'{"personal_care":true,"overnight_support":false,"24h_support":false,"nursing":false,"behavioural_support":false,"complex_medical":false}','medium','Adelaide, SA','coordinator','Care Connect SA','Ageing NDIS participant. Independent but needs personal care support.','new',coord_id,NOW() - INTERVAL '3 hours'),
    ('Anika Reddy',38,'{"personal_care":true,"overnight_support":true,"24h_support":true,"nursing":false,"behavioural_support":true,"complex_medical":false}','immediate','Sydney, NSW','hospital','Westmead Hospital','At-risk discharge situation. Needs placement within 24h. ABI + challenging behaviour.','matched',coord_id,NOW() - INTERVAL '5 hours'),
    ('Tom Brown',74,'{"personal_care":true,"overnight_support":true,"24h_support":false,"nursing":false,"behavioural_support":false,"complex_medical":false}','low','Melbourne, VIC','family','Janet Brown (daughter)','Elderly NDIS participant. Stable. Looking for STA respite while family caregiver travels.','new',coord_id,NOW() - INTERVAL '6 hours'),
    ('Linda Foster',45,'{"personal_care":true,"overnight_support":true,"24h_support":false,"nursing":false,"behavioural_support":false,"complex_medical":false}','medium','Sydney, NSW','coordinator','Ability Connect','Placed successfully at Harbour View SIL House.','placed',coord_id,NOW() - INTERVAL '8 days'),
    ('Ahmed Siddiqui',52,'{"personal_care":true,"overnight_support":true,"24h_support":true,"nursing":true,"behavioural_support":false,"complex_medical":true}','high','Melbourne, VIC','hospital','The Alfred','Complex medical, placed at Parkside SDA.','placed',coord_id,NOW() - INTERVAL '10 days'),
    ('Ravi Patel',61,'{"personal_care":true,"overnight_support":false,"24h_support":false,"nursing":false,"behavioural_support":false,"complex_medical":false}','low','Darwin, NT','family','Anita Patel (wife)','No matching facility within reasonable radius of Darwin.','rejected',coord_id,NOW() - INTERVAL '12 days');

  -- ── Activity logs for placed referrals ──────────────────────

  INSERT INTO activity_logs (entity_type,entity_id,action,metadata,performed_by)
  SELECT 'referral',id,'status_changed','{"from":"new","to":"placed","note":"Placed at Harbour View SIL House"}',coord_id
  FROM referrals WHERE client_name='Linda Foster';

  INSERT INTO activity_logs (entity_type,entity_id,action,metadata,performed_by)
  SELECT 'referral',id,'status_changed','{"from":"matched","to":"placed","note":"Confirmed placement"}',coord_id
  FROM referrals WHERE client_name='Ahmed Siddiqui';

END $$;
