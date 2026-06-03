import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './common/errors';
import authRoutes       from './auth/auth.routes';
import facilitiesRoutes from './facilities/facilities.routes';
import referralsRoutes  from './referrals/referrals.routes';
import matchingRoutes   from './matching/matching.routes';
import analyticsRoutes  from './analytics/analytics.routes';
import usersRoutes      from './users/users.routes';
import publicRoutes     from './public/public.routes';

const app = express();

// ── Security & parsing ────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://vacancies.mmtcare.com.au').split(','),
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
const uploadRoot = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(path.join(uploadRoot, 'facilities'), { recursive: true });
app.use('/uploads', express.static(uploadRoot));
// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', env: process.env.NODE_ENV });
});

// ── API routes ────────────────────────────────────────────────
const v1 = express.Router();
v1.use('/auth',       authRoutes);
v1.use('/facilities', facilitiesRoutes);
v1.use('/referrals',  referralsRoutes);
v1.use('/match',      matchingRoutes);
v1.use('/analytics',  analyticsRoutes);
v1.use('/users',      usersRoutes);

app.use('/api/v1', v1);
app.use('/api/v1/public', publicRoutes); // No auth needed

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'NotFound', message: 'Route not found', statusCode: 404 });
});

// Global error handler
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '4000');
app.listen(PORT, () => {
  console.log(`\n MMT Care Connect API`);
  console.log(`   Port:     ${PORT}`);
  console.log(`   Env:      ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Docs:     http://localhost:${PORT}/health\n`);
});

export default app;
