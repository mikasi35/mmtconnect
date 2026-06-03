import React from 'react';
import { FacilityGallery } from '@/components/FacilityGallery';
import { API_BASE } from '@/lib/api';

const API = API_BASE;
const CARE_LABELS: Record<string,string> = {
  personal_care: 'Personal care',
  nursing: 'Nursing support',
  behavioural_support: 'Behavioural support',
  complex_medical: 'Complex medical',
  overnight_support: 'Overnight support',
  '24h_support': '24h support',
};

interface FacilityDetailsPageProps {
  params: { id: string };
}

export default async function FacilityDetailsPage({ params }: FacilityDetailsPageProps) {
  const res = await fetch(`${API}/public/facilities/${params.id}`, { cache: 'no-store' });
  if (!res.ok) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Facility not found</h1>
        <p style={{ color: '#6B7280' }}>We couldn’t load that facility. Please try again or go back to the search results.</p>
      </div>
    );
  }

  const json = await res.json();
  const facility = json.data;
  const images = facility.image_urls?.length ? facility.image_urls : facility.image_url ? [facility.image_url] : [];
  const supportedCare = Object.entries(facility.supported_care ?? {}).filter(([, value]) => value).map(([key]) => CARE_LABELS[key] ?? key);

  return (
    <div className="public-page-body">
      <a href="/find/search" style={{ display: 'inline-block', marginBottom: 20, color: '#1A56CC', textDecoration: 'none', fontSize: 14 }}>&larr; Back to search</a>
      <div className="facility-details-grid">
        <div className="facility-details-main">
          <div style={{ marginBottom: 24 }}>
            <FacilityGallery images={images} name={facility.name} />
          </div>

          <div style={{ background: '#fff', borderRadius: 20, border: '0.5px solid #E5E7EB', padding: 24 }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0, color: '#111827' }}>{facility.name}</h1>
            <p style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>{facility.address}, {facility.suburb} {facility.state} {facility.postcode}</p>
            {facility.description && <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.7, marginTop: 18 }}>{facility.description}</p>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 24 }}>
              <div style={{ background: '#F3F4F6', borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>Available beds</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#16A34A', marginTop: 8 }}>{facility.available_beds}</div>
              </div>
              <div style={{ background: '#F3F4F6', borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>Total beds</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 8 }}>{facility.total_beds}</div>
              </div>
              <div style={{ background: '#F3F4F6', borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>Photos</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginTop: 8 }}>{images.length}</div>
              </div>
            </div>

            {supportedCare.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Supported care</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {supportedCare.map(item => (
                    <div key={item} style={{ padding: '8px 12px', borderRadius: 12, background: '#E0F2FE', color: '#0C4A6E', fontSize: 13, fontWeight: 600 }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="facility-details-side">
          <div style={{ background: '#fff', borderRadius: 20, border: '0.5px solid #E5E7EB', padding: 24 }}>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>Contact</div>
            {facility.contact_phone && <div style={{ fontSize: 15, color: '#111827', marginBottom: 8 }}>Phone: {facility.contact_phone}</div>}
            {facility.contact_email && <div style={{ fontSize: 15, color: '#111827' }}>Email: {facility.contact_email}</div>}
          </div>

          <div style={{ background: '#E5F3FF', borderRadius: 20, padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Ready to refer?</div>
            <p style={{ fontSize: 14, color: '#1E3A8A', lineHeight: 1.7, margin: 0 }}>Submit a referral for this facility and we’ll connect you with the right support.</p>
            <a href={`/find/submit?facility=${facility.id}&name=${encodeURIComponent(facility.name)}`} style={{ display: 'inline-flex', marginTop: 20, background: '#1A56CC', color: '#fff', borderRadius: 12, padding: '12px 18px', textDecoration: 'none', fontWeight: 700 }}>Request this facility</a>
          </div>
        </div>
      </div>
    </div>
  );
}
