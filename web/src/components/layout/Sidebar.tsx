'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getUser } from '@/lib/api';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard',           label: 'Dashboard',  icon: '▤' },
      { href: '/dashboard/analytics', label: 'Analytics',  icon: '◎' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/dashboard/referrals',  label: 'Referrals',  icon: '◈', badge: true },
      { href: '/dashboard/matching',   label: 'Matching',   icon: '⌖' },
      { href: '/dashboard/facilities', label: 'Facilities', icon: '⬡' },
      { href: '/dashboard/placements', label: 'Placements', icon: '✓' },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/dashboard/users',    label: 'Users',    icon: '◉' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const user     = typeof window !== 'undefined' ? getUser() : null;

  const logout = async () => {
    clearSession();
    router.push('/login');
  };

  return (
    <aside style={{
      width: 'var(--sidebar-w)', flexShrink: 0,
      background: '#fff', borderRight: '0.5px solid var(--gray-200)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0, overflowY: 'auto',
    }}>
      {/* Brand */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '0.5px solid var(--gray-200)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: 'var(--brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>M</div>
          <div>
            <div style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 13, lineHeight: 1.2, color: 'var(--gray-900)' }}>MMT Care</div>
            <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>Connect Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV_SECTIONS.map(sec => (
          <div key={sec.label} style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 10, fontWeight: 600, color: 'var(--gray-400)',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              padding: '0 8px', marginBottom: 3,
            }}>{sec.label}</div>

            {sec.items.map(item => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 8px', borderRadius: 6, marginBottom: 1,
                    background: active ? 'var(--brand-light)' : 'transparent',
                    color: active ? 'var(--brand)' : 'var(--gray-600)',
                    fontWeight: active ? 600 : 400,
                    fontSize: 13, cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}>
                    <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{
        padding: '10px 12px', borderTop: '0.5px solid var(--gray-200)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: 'var(--brand-light)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: 'var(--brand)',
        }}>
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name ?? 'User'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--gray-400)', textTransform: 'capitalize' }}>
            {user?.role?.replace('_', ' ') ?? ''}
          </div>
        </div>
        <button onClick={logout} title="Log out" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--gray-400)', fontSize: 15, padding: 4, flexShrink: 0,
        }}>↩</button>
      </div>
    </aside>
  );
}
