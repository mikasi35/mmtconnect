import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Find NDIS Accommodation | MMT Care Connect', template: '%s | MMT Care Connect' },
  description: 'Search available NDIS accommodation near you — SIL, SDA and STA vacancies. Submit a referral for your loved one today.',
};

export default function FindLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="find-page-shell">
      <nav className="public-nav">
        <a href="/find" className="public-nav-logo">
          <img src="https://mmtcare.com.au/wp-content/uploads/2026/02/MMT-CARE-LOGO.webp" alt="MMT Care Connect Logo" style={{ height: '40px', width: 'auto', display: 'block' }} />
        </a>
        <div className="public-nav-links">
          <a href="/find/search" className="nav-link">Search</a>
          <a href="/find/submit" className="nav-link">Submit Referral</a>
          <a href="/find/track" className="nav-link">Track My Referral</a>
          <a href="/login" className="nav-button">Coordinator login →</a>
        </div>
      </nav>

      <main>{children}</main>

      {/* Footer */}
      <footer style={{
        background: '#1F2937', color: '#9CA3AF',
        padding: '32px 24px', textAlign: 'center', marginTop: 60,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6 }}>MMT Care Connect</div>
        <div style={{ fontSize: 12, marginBottom: 12 }}>
          Helping families find NDIS accommodation across Australia.
        </div>
        <div style={{ fontSize: 12, display: 'flex', justifyContent: 'center', gap: 24 }}>
          <a href="/find/search" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Search placements</a>
          <a href="/find/submit" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Submit referral</a>
          <a href="/find/track"  style={{ color: '#9CA3AF', textDecoration: 'none' }}>Track referral</a>
        </div>
        <div style={{ fontSize: 11, marginTop: 20, color: '#4B5563' }}>
          © 2026 MMT Care Connect · NDIS registered provider coordination platform
        </div>
      </footer>
    </div>
  );
}
