'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function normalizeApiBase(raw: string) {
  const base = raw.trim().replace(/\/+$|\s+$/g, '');
  if (/\/api\/v1$/i.test(base)) return base;
  if (/\/api$/i.test(base)) return base.replace(/\/api$/i, '/api/v1');
  return `${base}/api/v1`;
}

const API = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL ?? 'https://vacancies.mmtcare.com.au/api/v1');

const STATUS_INFO: Record<string, { label: string; desc: string; color: string; bg: string }> = {
  new:       { label: 'Received',    desc: 'Your referral has been received and is in our queue.',                         color: '#1E40AF', bg: '#DBEAFE' },
  reviewing: { label: 'Reviewing',   desc: 'A coordinator is actively reviewing your referral and finding options.',        color: '#854D0E', bg: '#FEF9C3' },
  matched:   { label: 'Matched!',    desc: 'We have found a suitable placement. A coordinator will contact you shortly.',   color: '#9A3412', bg: '#FFEDD5' },
  placed:    { label: 'Placed! ✓',   desc: 'Great news — your loved one has been successfully placed in accommodation.',    color: '#166534', bg: '#DCFCE7' },
  rejected:  { label: 'Closed',      desc: 'We were unable to find a suitable match at this time. Please call us to discuss alternatives.', color: '#991B1B', bg: '#FEE2E2' },
};

const URGENCY_LABELS: Record<string, string> = {
  low: 'No urgency', medium: 'Within 1 month', high: 'Within 2 weeks', immediate: 'Urgent',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function TrackPage() {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [result,     setResult]     = useState<any>(null);
  const [error,      setError]      = useState('');

  const lookup = async () => {
    const id = trackingId.trim().toUpperCase();
    if (!id || id.length < 6) { setError('Please enter your 8-character tracking ID'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API}/public/referrals/track/${id}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Not found');
      }
      const json = await res.json();
      setResult(json.data);
    } catch (e: any) {
      setError(e.message ?? 'Could not find a referral with that ID. Please check and try again.');
    } finally { setLoading(false); }
  };

  const si = result ? (STATUS_INFO[result.status] ?? STATUS_INFO.new) : null;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>
        Track your referral
      </h1>
      <p style={{ color: '#6B7280', margin: '0 0 32px', fontSize: 15 }}>
        Enter the 8-character tracking ID you received when you submitted your referral.
      </p>

      {/* Lookup form */}
      <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '24px', marginBottom: 24 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>
          Tracking ID
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={trackingId}
            onChange={e => setTrackingId(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && lookup()}
            placeholder="e.g. A3B7C2D1"
            maxLength={8}
            style={{
              flex: 1, padding: '11px 14px', border: '0.5px solid #D1D5DB',
              borderRadius: 8, fontSize: 16, outline: 'none',
              fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase',
            }}
          />
          <button
            onClick={lookup}
            disabled={loading}
            style={{
              background: loading ? '#9CA3AF' : '#1A56CC',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '11px 24px', fontSize: 14, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0,
            }}
          >
            {loading ? 'Looking up…' : 'Track'}
          </button>
        </div>
        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 7, padding: '9px 12px', fontSize: 13, marginTop: 12 }}>
            {error}
          </div>
        )}
      </div>

      {/* Result */}
      {result && si && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Status banner */}
          <div style={{
            background: si.bg, borderRadius: 14,
            border: `1.5px solid ${si.color}33`,
            padding: '20px 24px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: si.color, fontSize: 18, fontWeight: 700 }}>
              {si.label.split(' ')[0]}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: si.color, marginBottom: 4 }}>{si.label}</div>
              <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>{si.desc}</div>
            </div>
          </div>
          {/* Progress timeline */}
          <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '20px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>
              Progress
            </div>
            {[
              { status: 'new',       label: 'Referral received',       done: true },
              { status: 'reviewing', label: 'Under review',             done: ['reviewing','matched','placed'].includes(result.status) },
              { status: 'matched',   label: 'Match found',              done: ['matched','placed'].includes(result.status) },
              { status: 'placed',    label: 'Placement confirmed',      done: result.status === 'placed' },
            ].map((step, i, arr) => (
              <div key={step.status} style={{ display: 'flex', gap: 14, paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: step.done ? '#1A56CC' : '#E5E7EB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: step.done ? '#fff' : '#9CA3AF',
                  }}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: step.done ? '#1A56CC' : '#E5E7EB', marginTop: 4 }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < arr.length - 1 ? 0 : 0, paddingTop: 2 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: step.done ? '#111827' : '#9CA3AF' }}>
                    {step.label}
                  </div>
                  {step.status === result.status && (
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Current status</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Referral details */}
          <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #E5E7EB', padding: '20px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
              Referral details
            </div>
            {[
              ['Person',       result.client_name],
              ['Age',          result.client_age],
              ['Urgency',      URGENCY_LABELS[result.urgency] ?? result.urgency],
              ['Location pref',result.location_preference ?? '—'],
              ['Submitted',    fmtDate(result.created_at)],
              ['Last updated', fmtDate(result.updated_at)],
              ...(result.status === 'placed' ? [
                ['Placed at',    result.placed_facility_name ?? '—'],
                ['Location',     result.placed_facility_location ?? '—'],
                ['Placement date', result.placed_at ? fmtDate(result.placed_at) : '—'],
              ] : []),
            ].map(([label, val]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: '0.5px solid #F3F4F6',
              }}>
                <span style={{ fontSize: 13, color: '#6B7280' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Placed success */}
          {result.status === 'placed' && (
            <div style={{ background: '#DCFCE7', borderRadius: 14, border: '1.5px solid #86EFAC', padding: '20px 24px', textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#ECFDF5', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', fontSize: 24, fontWeight: 700 }}>
                ✓
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                Placement confirmed at {result.placed_facility_name}
              </div>
              <div style={{ fontSize: 13, color: '#166534' }}>
                {result.placed_facility_location}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            {result.status !== 'placed' && (
              <button
                onClick={() => router.push('/find/search')}
                style={{ flex: 1, background: '#1A56CC', color: '#fff', border: 'none', borderRadius: 9, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Search other options
              </button>
            )}
            <button
              onClick={() => { setResult(null); setTrackingId(''); }}
              style={{ flex: 1, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 9, padding: '11px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            >
              Track another referral
            </button>
          </div>
        </div>
      )}

      {/* Help section */}
      {!result && (
        <div style={{ background: '#F8FAFF', borderRadius: 12, padding: '20px 24px', border: '0.5px solid #E5E7EB' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 10 }}>Don't have a tracking ID?</div>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: '0 0 14px' }}>
            You receive a tracking ID when you submit a referral on this site. If you submitted by phone or through a coordinator, contact us directly for an update.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => router.push('/find/submit')}
              style={{ background: '#1A56CC', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Submit a new referral
            </button>
            <button
              onClick={() => router.push('/find/search')}
              style={{ background: '#fff', color: '#374151', border: '0.5px solid #D1D5DB', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Search vacancies
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
