# MMT Care Connect

> **Real-time NDIS placement and coordination platform**
> Accelerate referrals · Increase placements · Reduce response time

---

## 📁 Project Structure

```
mmt/
├── backend/src/           # Express REST API
│   ├── auth/              # JWT auth, register, login, refresh
│   ├── facilities/        # Facilities + vacancy CRUD
│   ├── referrals/         # Referral pipeline management
│   ├── matching/          # Rule-based matching engine
│   ├── analytics/         # KPI summaries and charts
│   ├── users/             # User management
│   └── common/            # DB pool, middleware, error handling
│
├── web/src/               # Next.js 14 admin dashboard
│   ├── app/dashboard/     # All dashboard pages
│   │   ├── page.tsx       # KPIs, pipeline, charts, activity
│   │   ├── referrals/     # Referral table + create/edit modal
│   │   ├── facilities/    # Facility cards + vacancy toggling
│   │   ├── analytics/     # Full charts dashboard
│   │   ├── matching/      # Matching engine UI
│   │   ├── placements/    # Confirmed placements table
│   │   └── users/         # User management
│   ├── components/        # Sidebar, Topbar, UI primitives
│   ├── hooks/useData.ts   # SWR data hooks for all resources
│   └── lib/api.ts         # Typed API client with auto token refresh
│
├── mobile/app/            # Expo React Native app
│   ├── (auth)/login.tsx   # Auth screen with gradient UI
│   └── (tabs)/
│       ├── index.tsx      # Home: live stats, facility carousel
│       ├── referrals.tsx  # List + filters + full submit form
│       ├── facilities.tsx # Cards + live vacancy toggle
│       └── profile.tsx    # User info + logout
│
├── shared/
│   ├── types/index.ts     # All TypeScript types (shared)
│   └── utils/index.ts     # Colors, formatters, geo helpers
│
├── scripts/
│   ├── migrate.sql        # Full DB schema with indexes + triggers
│   ├── seed.sql           # Realistic NDIS facility + referral data
│   └── setup-dev.sh       # One-command local setup
│
├── docker-compose.yml     # Postgres + Backend + Web
├── Dockerfile.backend
├── Dockerfile.web
└── .env.example
```

---

## 🚀 Quick Start (Local Dev)

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Expo CLI (`npm install -g expo-cli`)

### 1. Clone and run setup

```bash
git clone <repo>
cd mmt
./scripts/setup-dev.sh
```

This will:

- Install all npm dependencies
- Create `.env` from template
- Create the PostgreSQL database
- Run schema migrations
- Load realistic seed data

### 2. Start the backend

```bash
npm run dev:backend
# → API running at http://localhost:4000/api/v1
# → Health check: http://localhost:4000/health
```

### 3. Start the web dashboard

```bash
cd web
npm install      # first time only
npm run dev
# → http://localhost:3000
```

### 4. Configure email notifications

Update `.env` with your Resend API key and sender address:

```bash
RESEND_API_KEY=your-resend-api-key
RESEND_FROM=no-reply@mmtcareconnect.com
PUBLIC_SITE_URL=http://localhost:3000
```

### 5. Start the mobile app

```bash
cd mobile
npm install      # first time only
npx expo start
# Scan QR with Expo Go, or press i (iOS) / a (Android)
```

### Demo credentials

| Role        | Email                | Password    |
| ----------- | -------------------- | ----------- |
| Admin       | admin@mmtcare.com.au | Admin@2026! |
| Coordinator | sarah@mmtcare.com.au | Admin@2026! |

---

## 🐳 Docker (Full Stack)

```bash
# Copy and configure env
cp .env.example .env

# Build and start everything
docker-compose up --build

# Services:
# → Web:      http://localhost:3000
# → API:      http://localhost:4000/api/v1
# → Postgres: localhost:5432
```

---

## 🔌 API Reference

### Authentication

```
POST /api/v1/auth/register    body: { name, email, password, role? }
POST /api/v1/auth/login       body: { email, password }
POST /api/v1/auth/refresh     body: { refresh_token }
POST /api/v1/auth/logout      header: Bearer token
GET  /api/v1/auth/me          header: Bearer token
```

### Facilities

```
GET    /api/v1/facilities              ?type=SIL&state=NSW&search=harbour
GET    /api/v1/facilities/:id
POST   /api/v1/facilities
PATCH  /api/v1/facilities/:id
DELETE /api/v1/facilities/:id          (soft delete)
GET    /api/v1/facilities/vacancies/available
POST   /api/v1/facilities/:id/vacancies
PATCH  /api/v1/facilities/vacancies/:id
PATCH  /api/v1/facilities/vacancies/:id/status  body: { status }
```

### Referrals

```
GET    /api/v1/referrals               ?status=new&urgency=high&search=james
GET    /api/v1/referrals/:id
POST   /api/v1/referrals
PATCH  /api/v1/referrals/:id
GET    /api/v1/referrals/:id/activity
```

### Matching

```
POST   /api/v1/match/:referralId       (run engine → returns ranked results)
POST   /api/v1/match/:referralId/select  body: { vacancy_id, facility_id }
```

### Analytics

```
GET    /api/v1/analytics/summary
GET    /api/v1/analytics/activity      ?limit=20
GET    /api/v1/analytics/facilities
```

### Users

```
GET    /api/v1/users                   (admin only)
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
```

---

## 🗄️ Database Schema

```sql
users          — id, name, email, password_hash, role, organisation, is_active
facilities     — id, name, type(SIL|SDA|STA), address, suburb, state, lat/lng, capacity
vacancies      — id, facility_id, status(available|reserved|occupied), care_level_supported(jsonb)
referrals      — id, client_name, client_age, care_needs(jsonb), urgency, status, source_type
activity_logs  — id, entity_type, entity_id, action, metadata(jsonb), performed_by
refresh_tokens — id, user_id, token_hash, expires_at, revoked
```

---

## 🧠 Matching Algorithm

The engine runs on `POST /match/:referralId` and returns up to 10 ranked facilities:

1. **Filter** — only `available` or `reserved` vacancies from active facilities
2. **Filter** — care needs must be a subset of the vacancy's `care_level_supported`
3. **Score** each eligible vacancy:
   - Urgency weight: immediate=50, high=35, medium=20, low=10
   - Care overlap: +4 pts per matched care level
   - State match: +20 pts (same state as location preference)
   - Availability: +10 pts (available > reserved)
4. **Sort** by score descending, return top 10

---

## 👥 Roles

| Role                 | Permissions                                     |
| -------------------- | ----------------------------------------------- |
| `admin`            | Full access, user management, delete facilities |
| `coordinator`      | Create/manage referrals, view all data          |
| `facility_manager` | Manage own facilities and vacancies             |
| `hospital_user`    | Submit referrals, read-only tracking            |

---

## 📈 Roadmap

- [X] Phase 1 — Auth, facilities, vacancies, referral creation
- [X] Phase 2 — Matching engine, pipeline Kanban
- [X] Phase 3 — Placement flow, activity logs, audit trail
- [X] Phase 4 — Analytics dashboard with charts
- [ ] Phase 5 — Push notifications (Expo Notifications + FCM)
- [ ] Phase 6 — Map view with facility pins (Mapbox)
- [ ] Phase 7 — AI-enhanced matching (care needs embeddings)
- [ ] Phase 8 — NDIS plan document upload + parsing
- [ ] Phase 9 — Multi-tenant / white-label support
