'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession } from '@/lib/api';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--brand)' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/referrals',
    label: 'Referrals',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        {active ? <line x1="9" y1="13" x2="15" y2="13"/> : <><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></>}
      </svg>
    ),
  },
  {
    href: '/dashboard/facilities',
    label: 'Facilities',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'var(--brand-light)' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
      </svg>
    ),
  },
  {
    href: '/dashboard/matching',
    label: 'Matching',
    icon: (_active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
        <path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/>
      </svg>
    ),
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const router   = useRouter();

  const logout = () => {
    clearSession();
    router.push('/login');
  };

  return (
    <nav className="mobile-nav" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: '#fff', borderTop: '0.5px solid var(--gray-200)',
      alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
    }}>
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link key={href} href={href} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3,
            padding: '8px 2px 6px',
            textDecoration: 'none',
            color: active ? 'var(--brand)' : 'var(--gray-400)',
            minHeight: 56, transition: 'color 0.15s',
          }}>
            <span style={{ display: 'flex' }}>{icon(active)}</span>
            <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, letterSpacing: '.01em' }}>{label}</span>
          </Link>
        );
      })}

      {/* Logout tab */}
      <button onClick={logout} style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 3,
        padding: '8px 2px 6px', background: 'none', border: 'none',
        cursor: 'pointer', color: 'var(--gray-400)', minHeight: 56,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span style={{ fontSize: 9, fontWeight: 400 }}>Logout</span>
      </button>
    </nav>
  );
}
