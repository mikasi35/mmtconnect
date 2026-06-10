'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getUser } from '@/lib/api';

/* ── Icons ─────────────────────────────────────────────────────── */
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconAnalytics = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const IconReferrals = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);
const IconMatching = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
    <path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/>
  </svg>
);
const IconFacilities = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconPlacements = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconErrorLogs = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard',           label: 'Dashboard',  Icon: IconDashboard },
      { href: '/dashboard/analytics', label: 'Analytics',  Icon: IconAnalytics },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/dashboard/referrals',  label: 'Referrals',  Icon: IconReferrals },
      { href: '/dashboard/matching',   label: 'Matching',   Icon: IconMatching },
      { href: '/dashboard/facilities', label: 'Facilities', Icon: IconFacilities },
      { href: '/dashboard/placements', label: 'Placements', Icon: IconPlacements },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/dashboard/users',  label: 'Users',      Icon: IconUsers },
      { href: '/dashboard/errors', label: 'Error Logs', Icon: IconErrorLogs },
    ],
  },
];

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  // Defer user read to client to avoid hydration mismatch
  const [user, setUser] = useState<{ name?: string; role?: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
    // Restore persisted collapse state
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed(c => {
      localStorage.setItem('sidebar-collapsed', String(!c));
      return !c;
    });
  };

  const logout = () => {
    clearSession();
    router.push('/login');
  };

  const w = collapsed ? 56 : 220;

  return (
    <aside
      className="desktop-sidebar"
      style={{
        width: w, flexShrink: 0,
        background: '#fff', borderRight: '0.5px solid var(--gray-200)',
        display: 'flex', flexDirection: 'column',
        height: '100vh', position: 'sticky', top: 0,
        overflow: 'hidden',           /* no scrolling on the aside itself */
        transition: 'width 0.2s ease',
        zIndex: 20,
      }}
    >
      {/* Brand + toggle */}
      <div style={{
        padding: collapsed ? '14px 0' : '14px 12px',
        borderBottom: '0.5px solid var(--gray-200)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8, flexShrink: 0,
      }}>
        {!collapsed && (
          <img
            src="https://mmtcare.com.au/wp-content/uploads/2026/02/MMT-CARE-LOGO.webp"
            alt="MMT Care"
            style={{ height: 32, width: 'auto', display: 'block', minWidth: 0 }}
          />
        )}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            flexShrink: 0, width: 28, height: 28,
            borderRadius: 6, border: '0.5px solid var(--gray-200)',
            background: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--gray-500)', transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--gray-50)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gray-800)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gray-500)'; }}
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </div>

      {/* Nav — this is the only scrollable area; footer stays pinned below it */}
      <nav style={{ flex: 1, padding: collapsed ? '10px 4px' : '10px 8px', overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
        {NAV_SECTIONS.map(sec => (
          <div key={sec.label} style={{ marginBottom: collapsed ? 12 : 20 }}>
            {!collapsed && (
              <div style={{
                fontSize: 10, fontWeight: 600, color: 'var(--gray-400)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: '0 10px', marginBottom: 4,
              }}>
                {sec.label}
              </div>
            )}
            {collapsed && <div style={{ height: 1, background: 'var(--gray-100)', margin: '4px 6px 8px' }} />}

            {sec.items.map(({ href, label, Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <Link key={href} href={href} style={{ textDecoration: 'none', display: 'block' }} title={collapsed ? label : undefined}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center',
                      gap: collapsed ? 0 : 9,
                      padding: collapsed ? '9px 0' : '8px 10px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      borderRadius: 7, marginBottom: 1,
                      background: active ? 'var(--brand-light)' : 'transparent',
                      color: active ? 'var(--brand)' : 'var(--gray-600)',
                      fontWeight: active ? 600 : 400,
                      fontSize: 13, cursor: 'pointer',
                      transition: 'background 0.1s, color 0.1s',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'var(--gray-50)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}><Icon /></span>
                    {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer — pushed to bottom via marginTop:auto, never blocked */}
      <div style={{
        padding: collapsed ? '8px 4px' : '10px 12px',
        borderTop: '0.5px solid var(--gray-200)',
        display: 'flex',
        alignItems: 'center',
        flexDirection: collapsed ? 'column' : 'row',
        gap: 6,
        justifyContent: 'center',
        flexShrink: 0,
        background: '#fff',
        marginTop: 'auto',
      }}>
        {/* Avatar */}
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--brand-light)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: 'var(--brand)',
        }}>
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </div>

        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? 'User'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--gray-400)', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ') ?? ''}
            </div>
          </div>
        )}

        {/* Logout — always rendered */}
        <button
          onClick={logout}
          title="Log out"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--gray-400)', padding: 4, flexShrink: 0,
            display: 'flex', alignItems: 'center', borderRadius: 4,
            transition: 'color 0.1s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#991B1B'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gray-400)'; }}
        >
          <IconLogout />
        </button>
      </div>
    </aside>
  );
}
